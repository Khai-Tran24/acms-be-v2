import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'crypto';
import { promisify } from 'util';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/otp.dto';
import { AuthUser } from './types/auth-user.type';
import { MailerService } from './mailer.service';

const scrypt = promisify(scryptCallback);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly jwt: JwtService,
    private readonly mailer: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim();
    const existing = await this.users.findOne({
      where: [{ email }, { username }],
    });
    if (existing)
      throw new ConflictException(
        'A user with this email or username already exists',
      );
    const role = await this.registrationRole(dto.role);
    const otp = this.newOtp();
    const userDetails = { ...dto };
    delete userDetails.role;
    const user = this.users.create({
      ...userDetails,
      email,
      username,
      password: await this.hashSecret(dto.password),
      role,
      isActive: false,
      emailVerificationOtpHash: this.hashOtp(otp),
      emailVerificationOtpExpiresAt: this.otpExpiry(),
    });
    try {
      await this.users.save(user);
    } catch (error) {
      if (this.isUniqueViolation(error))
        throw new ConflictException(
          'A user with this email or username already exists',
        );
      throw error;
    }
    await this.mailer.sendOtp(user.email, otp, 'verify-email');
    return {
      message:
        'Registration successful. Check your email for the verification code.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.findUserWithSecrets(dto.email);
    if (!user)
      throw new BadRequestException('Invalid or expired verification code');
    this.verifyOtp(
      dto.otp,
      user.emailVerificationOtpHash,
      user.emailVerificationOtpExpiresAt,
      'Invalid or expired verification code',
    );
    user.isActive = true;
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpiresAt = null;
    await this.users.save(user);
    return { message: 'Email verified. You can now sign in.' };
  }

  async resendVerification(email: string) {
    const user = await this.findUserWithSecrets(email);
    if (user && !user.isActive) {
      const otp = this.newOtp();
      user.emailVerificationOtpHash = this.hashOtp(otp);
      user.emailVerificationOtpExpiresAt = this.otpExpiry();
      await this.users.save(user);
      await this.mailer.sendOtp(user.email, otp, 'verify-email');
    }
    return {
      message: 'If the account requires verification, a code has been sent.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.findUserWithSecrets(dto.email);
    if (!user || !(await this.verifySecret(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive)
      throw new UnauthorizedException('Email address has not been verified');
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: number; tokenType: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
    if (payload.tokenType !== 'refresh')
      throw new UnauthorizedException('Invalid refresh token');
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect(['user.refreshTokenHash'])
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermissions')
      .leftJoinAndSelect('rolePermissions.permission', 'permission')
      .where('user.id = :id', { id: payload.sub })
      .getOne();
    if (
      !user ||
      !user.isActive ||
      !user.refreshTokenHash ||
      !(await this.verifySecret(refreshToken, user.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Refresh token is invalid or revoked');
    }
    return this.issueTokens(user);
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: number;
        tokenType: string;
      }>(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
      if (payload.tokenType === 'refresh')
        await this.users.update(payload.sub, { refreshTokenHash: null });
    } catch {
      /* logout stays idempotent */
    }
    return { message: 'Signed out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findUserWithSecrets(dto.email);
    if (user?.isActive) {
      const otp = this.newOtp();
      user.passwordResetOtpHash = this.hashOtp(otp);
      user.passwordResetOtpExpiresAt = this.otpExpiry();
      await this.users.save(user);
      await this.mailer.sendOtp(user.email, otp, 'reset-password');
    }
    return {
      message:
        'If an active account exists, a password reset code has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.findUserWithSecrets(dto.email);
    if (!user)
      throw new BadRequestException('Invalid or expired password reset code');
    this.verifyOtp(
      dto.otp,
      user.passwordResetOtpHash,
      user.passwordResetOtpExpiresAt,
      'Invalid or expired password reset code',
    );
    user.password = await this.hashSecret(dto.newPassword);
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    user.refreshTokenHash = null;
    await this.users.save(user);
    return { message: 'Password reset successful. Please sign in again.' };
  }

  private async issueTokens(user: User) {
    const identity = this.toAuthUser(user);
    const accessToken = await this.jwt.signAsync(identity, {
      secret: this.accessSecret(),
      expiresIn: this.duration('JWT_ACCESS_EXPIRES_IN_SECONDS', 15 * 60),
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, tokenType: 'refresh' },
      {
        secret: this.refreshSecret(),
        expiresIn: this.duration(
          'JWT_REFRESH_EXPIRES_IN_SECONDS',
          7 * 24 * 60 * 60,
        ),
      },
    );
    user.refreshTokenHash = await this.hashSecret(refreshToken);
    await this.users.save(user);
    return { accessToken, refreshToken, user: identity };
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role?.roleName ?? null,
      permissions: (user.role?.rolePermissions ?? [])
        .filter(({ permission }) => permission?.isActive)
        .map(({ permission }) => permission.permissionName),
    };
  }

  private async findUserWithSecrets(email: string) {
    return this.users
      .createQueryBuilder('user')
      .addSelect([
        'user.password',
        'user.refreshTokenHash',
        'user.emailVerificationOtpHash',
        'user.passwordResetOtpHash',
      ])
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermissions')
      .leftJoinAndSelect('rolePermissions.permission', 'permission')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  private async defaultRole() {
    const name = process.env.AUTH_DEFAULT_ROLE ?? 'user';
    let role = await this.roles.findOne({
      where: { roleName: name, isActive: true },
    });
    if (!role) {
      try {
        role = await this.roles.save(
          this.roles.create({
            roleName: name,
            roleDescription: 'Default self-registered user role',
            isActive: true,
          }),
        );
      } catch {
        role = await this.roles.findOne({
          where: { roleName: name, isActive: true },
        });
      }
    }
    if (!role)
      throw new NotFoundException(
        'Default registration role is not configured',
      );
    return role;
  }

  private async registrationRole(roleId?: number) {
    if (roleId === undefined) return this.defaultRole();

    const role = await this.roles.findOne({
      where: { id: roleId, isActive: true },
    });
    if (!role) throw new NotFoundException('Active role not found');
    if (role.roleName.trim().toLowerCase() === 'admin') {
      throw new BadRequestException(
        'The admin role cannot be selected during registration',
      );
    }
    return role;
  }

  private newOtp() {
    return randomBytes(4).readUInt32BE(0).toString().padStart(6, '0').slice(-6);
  }
  private hashOtp(otp: string) {
    return createHash('sha256').update(otp).digest('hex');
  }
  private otpExpiry() {
    return new Date(
      Date.now() + Number(process.env.OTP_EXPIRES_MINUTES ?? 10) * 60_000,
    );
  }
  private verifyOtp(
    otp: string,
    hash: string | null,
    expiresAt: Date | null,
    message: string,
  ) {
    const candidate = Buffer.from(this.hashOtp(otp));
    const stored = hash ? Buffer.from(hash) : null;
    if (
      !stored ||
      !expiresAt ||
      expiresAt.getTime() < Date.now() ||
      stored.length !== candidate.length ||
      !timingSafeEqual(candidate, stored)
    )
      throw new BadRequestException(message);
  }
  private async hashSecret(secret: string) {
    const salt = randomBytes(16).toString('base64');
    const key = (await scrypt(secret, salt, 64)) as Buffer;
    return `scrypt$${salt}$${key.toString('base64')}`;
  }
  private async verifySecret(secret: string, stored: string) {
    const [scheme, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const key = (await scrypt(secret, salt, 64)) as Buffer;
    const expected = Buffer.from(hash, 'base64');
    return expected.length === key.length && timingSafeEqual(key, expected);
  }
  private accessSecret() {
    if (!process.env.JWT_ACCESS_SECRET)
      throw new Error('JWT_ACCESS_SECRET must be set');
    return process.env.JWT_ACCESS_SECRET;
  }
  private refreshSecret() {
    if (!process.env.JWT_REFRESH_SECRET)
      throw new Error('JWT_REFRESH_SECRET must be set');
    return process.env.JWT_REFRESH_SECRET;
  }
  private duration(name: string, fallback: number) {
    const value = Number(process.env[name] ?? fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  private isUniqueViolation(error: unknown): error is { code: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
