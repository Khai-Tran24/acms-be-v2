import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { Role } from '../role/entities/role.entity';

describe('UserService', () => {
  let service: UserService;
  const userRepository = {
    create: jest.fn((user: User) => user),
    save: jest.fn((user: User) => Promise.resolve(user)),
  };
  const roleRepository = {
    findOneBy: jest.fn(() => Promise.resolve({ id: 1 } as Role)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Role), useValue: roleRepository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hashes a password before saving a user', async () => {
    await service.create({
      username: 'jane',
      password: 'plain-text-password',
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      isActive: true,
      role: 1,
      phone: '0900000000',
      avatar: 'https://example.com/avatar.png',
    });

    const savedUser = userRepository.save.mock.calls[0][0];
    expect(savedUser.password).not.toBe('plain-text-password');
    expect(savedUser.password).toMatch(/^\$2[aby]\$/);
  });
});
