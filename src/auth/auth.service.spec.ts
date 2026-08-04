import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { User } from '../user/entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from './mailer.service';

describe('AuthService', () => {
  let service: AuthService;
  const users = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const roles = {
    findOne: jest.fn(),
  };
  const mailer = {
    sendOtp: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(Role), useValue: roles },
        { provide: JwtService, useValue: {} },
        { provide: MailerService, useValue: mailer },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('assigns the selected active role during registration', async () => {
    const selectedRole = { id: 2, roleName: 'auctioneer', isActive: true };
    const createdUser = { email: 'user@example.com' } as User;
    users.findOne.mockResolvedValue(null);
    roles.findOne.mockResolvedValue(selectedRole);
    users.create.mockReturnValue(createdUser);
    users.save.mockResolvedValue(createdUser);
    mailer.sendOtp.mockResolvedValue(undefined);

    await service.register({
      username: 'new-user',
      email: 'user@example.com',
      password: 'password123',
      fullName: 'New User',
      role: 2,
    });

    expect(roles.findOne).toHaveBeenCalledWith({
      where: { id: 2, isActive: true },
    });
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: selectedRole }),
    );
  });

  it('does not allow public registration as admin', async () => {
    users.findOne.mockResolvedValue(null);
    roles.findOne.mockResolvedValue({
      id: 1,
      roleName: 'admin',
      isActive: true,
    });

    await expect(
      service.register({
        username: 'new-admin',
        email: 'admin@example.com',
        password: 'password123',
        fullName: 'New Admin',
        role: 1,
      }),
    ).rejects.toThrow('The admin role cannot be selected during registration');
    expect(users.create).not.toHaveBeenCalled();
  });
});
