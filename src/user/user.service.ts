import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scrypt as scryptCallback } from 'crypto';
import { Role } from '../role/entities/role.entity';
import { ILike, Repository } from 'typeorm';
import { promisify } from 'util';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

const scrypt = promisify(scryptCallback);

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { role: roleId, password, ...userData } = createUserDto;
    const role = await this.findRole(roleId);

    try {
      const user = await this.userRepository.save(
        this.userRepository.create({
          ...userData,
          password: await this.hashPassword(password),
          role,
        }),
      );
      return this.toResponse(user);
    } catch (error) {
      this.throwIfDuplicate(error);
      throw error;
    }
  }

  async findAll(query: QueryUserDto) {
    const {
      page,
      limit,
      search,
      username,
      email,
      isActive,
      roleId,
      createdFrom,
      createdTo,
      sortBy,
      sortOrder,
    } = query;
    const builder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role');

    if (search) {
      const term = `%${search}%`;
      builder.andWhere(
        '(user.username ILIKE :term OR user.email ILIKE :term OR user.full_name ILIKE :term OR user.phone ILIKE :term)',
        { term },
      );
    }
    if (username) builder.andWhere({ username: ILike(`%${username}%`) });
    if (email) builder.andWhere({ email: ILike(`%${email}%`) });
    if (isActive !== undefined) {
      builder.andWhere('user.is_active = :isActive', { isActive });
    }
    if (roleId) builder.andWhere('role.id = :roleId', { roleId });
    if (createdFrom) {
      builder.andWhere('user.created_at >= :createdFrom', { createdFrom });
    }
    if (createdTo) {
      builder.andWhere('user.created_at <= :createdTo', { createdTo });
    }

    const [users, total] = await builder
      .orderBy(
        `user.${this.toColumnName(sortBy)}`,
        sortOrder.toUpperCase() as 'ASC' | 'DESC',
      )
      .addOrderBy('user.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: users.map((user) => this.toResponse(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.toResponse(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');

    const { role: roleId, password, ...userData } = updateUserDto;
    Object.assign(user, userData);
    if (password !== undefined) {
      user.password = await this.hashPassword(password);
    }
    if (roleId !== undefined) user.role = await this.findRole(roleId);

    try {
      const saved = await this.userRepository.save(user);
      return this.toResponse(saved);
    } catch (error) {
      this.throwIfDuplicate(error);
      throw error;
    }
  }

  async remove(id: number) {
    const result = await this.userRepository.delete(id);
    if (!result.affected) throw new NotFoundException('User not found');
    return { id, deleted: true };
  }

  private async findRole(id: number) {
    const role = await this.roleRepository.findOneBy({ id });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('base64');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${derivedKey.toString('base64')}`;
  }

  private toColumnName(sortBy: QueryUserDto['sortBy']) {
    const columns = {
      id: 'id',
      username: 'username',
      email: 'email',
      fullName: 'full_name',
      isActive: 'is_active',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    } as const;
    return columns[sortBy];
  }

  private toResponse(user: User) {
    const { password, ...result } = user;
    void password;
    return result;
  }

  private throwIfDuplicate(error: unknown): void {
    if (this.isUniqueViolation(error)) {
      throw new ConflictException(
        'A user with this email or username already exists',
      );
    }
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
