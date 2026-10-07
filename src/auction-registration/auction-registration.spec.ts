import 'reflect-metadata';
import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Contract } from '../contract/entities/contract.entity';
import { Role } from '../shared/enums/role.enum';
import { AuctionRegistrationController } from './auction-registration.controller';
import { AuctionRegistrationService } from './auction-registration.service';
import {
  AuctionRegistration,
  RegistrationPaymentStatus,
  RegistrationStatus,
} from './entities/auction-registration.entity';
import {
  CreateAuctionRegistrationDto,
  UpdateAuctionRegistrationDto,
} from './dto/create-auction-registration.dto';

const dto: CreateAuctionRegistrationDto = {
  contractId: 42,
  registrantName: 'Công ty ABC',
  identityNumber: '001234567890',
  address: 'Hà Nội',
  registrationFee: 100000,
  registrationFeeStatus: RegistrationPaymentStatus.DA_NOP,
  registrationFeePaidDate: '2026-10-07',
  depositAmount: 20000000,
  depositAmountStatus: RegistrationPaymentStatus.CHUA_NOP,
  depositAmountPaidDate: null,
  note: 'Hồ sơ bổ sung',
  status: RegistrationStatus.CHUA_DU_DIEU_KIEN,
};

describe('Auction registration access', () => {
  const guard = new RolesGuard(new Reflector());
  const handlers = [
    'create',
    'findAll',
    'findOne',
    'update',
    'remove',
    'contractOptions',
    'contractOption',
  ] as const;
  it.each(handlers)(
    'allows %s for administrators and registration staff only',
    (handler) => {
      for (const role of [...Object.values(Role), undefined]) {
        const context = {
          getClass: () => AuctionRegistrationController,
          getHandler: () => AuctionRegistrationController.prototype[handler],
          switchToHttp: () => ({
            getRequest: () => ({ user: role ? { role } : undefined }),
          }),
        } as unknown as ExecutionContext;
        if (role === Role.ADMIN || role === Role.NHAN_VIEN_BAN_HO_SO)
          expect(guard.canActivate(context)).toBe(true);
        else
          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      }
    },
  );
});

describe('Auction registration input', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const validate = (value: unknown, update = false) =>
    pipe.transform(value, {
      type: 'body',
      metatype: update
        ? UpdateAuctionRegistrationDto
        : CreateAuctionRegistrationDto,
    });
  it('preserves leading zeros in identification and accepts all fields', async () => {
    await expect(validate(dto)).resolves.toEqual(dto);
  });
  it.each([
    { registrantName: '  ' },
    { identityNumber: '' },
    { address: ' ' },
    { registrationFee: -1 },
    { depositAmount: -1 },
    { registrationFeeStatus: 'paid' },
    { depositAmountStatus: 'paid' },
    { status: 'eligible' },
    { contractId: 0 },
    { registrationFeePaidDate: '2026-02-30' },
    { depositAmountPaidDate: 'invalid' },
  ])('rejects invalid values %j', async (data) => {
    await expect(validate({ ...dto, ...data })).rejects.toThrow();
  });
  it('allows partial edits and clearing nullable fields', async () => {
    await expect(
      validate(
        {
          registrationFeePaidDate: null,
          depositAmountPaidDate: null,
          note: null,
        },
        true,
      ),
    ).resolves.toMatchObject({
      registrationFeePaidDate: null,
      depositAmountPaidDate: null,
      note: null,
    });
  });
  it.each([
    'contractId',
    'registrantName',
    'identityNumber',
    'address',
    'registrationFee',
    'registrationFeeStatus',
    'depositAmount',
    'depositAmountStatus',
    'status',
  ])('rejects null for required field %s on update', async (key) => {
    await expect(validate({ [key]: null }, true)).rejects.toThrow();
  });
});

describe('Auction registration persistence', () => {
  let service: AuctionRegistrationService;
  const repo = {
    create: jest.fn((data: Partial<AuctionRegistration>) => data),
    save: jest.fn((data: Partial<AuctionRegistration>) =>
      Promise.resolve(data),
    ),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
  const contractQuery = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    contractQuery.getOne.mockResolvedValue({
      id: 42,
      contractNumber: 'HD-042',
      regulations: [
        {
          id: 1,
          startRegisterDate: '2026-10-01T00:00:00+07:00',
          endRegisterDate: '2026-10-10T23:00:00+07:00',
        },
      ],
    });
    const module = await Test.createTestingModule({
      providers: [
        AuctionRegistrationService,
        { provide: getRepositoryToken(AuctionRegistration), useValue: repo },
        {
          provide: getRepositoryToken(Contract),
          useValue: { createQueryBuilder: () => contractQuery },
        },
      ],
    }).compile();
    service = module.get(AuctionRegistrationService);
  });
  it('creates a registration with linked contract and all fields', async () => {
    await expect(service.create(dto)).resolves.toMatchObject({
      registrantName: dto.registrantName,
      identityNumber: '001234567890',
      contract: { id: 42 },
      registrationFee: '100000',
      depositAmount: '20000000',
      registrationFeeStatus: 'DA_NOP',
      registrationFeePaidDate: '2026-10-07',
      depositAmountStatus: 'CHUA_NOP',
      depositAmountPaidDate: null,
      note: dto.note,
      status: dto.status,
    });
  });
  it('rejects a missing contract before saving', async () => {
    contractQuery.getOne.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('updates amounts including zero and clears dates/notes', async () => {
    repo.findOne.mockResolvedValue({ id: 1, ...dto, contract: { id: 42 } });
    await expect(
      service.update(1, {
        registrationFee: 0,
        depositAmount: 0,
        registrationFeePaidDate: null,
        note: '',
        status: RegistrationStatus.DU_DIEU_KIEN,
      }),
    ).resolves.toMatchObject({
      registrationFee: '0',
      depositAmount: '0',
      registrationFeePaidDate: null,
      note: '',
      status: 'DU_DIEU_KIEN',
      contract: { id: 42 },
    });
  });
  it.each(['registrationFeePaidDate', 'depositAmountPaidDate'] as const)(
    'accepts out-of-window %s on create and partial update',
    async (key) => {
      repo.findOne.mockResolvedValue({ id: 1, ...dto, contract: { id: 42 } });
      await expect(
        service.create({ ...dto, [key]: '2026-10-01' }),
      ).resolves.toMatchObject({ [key]: '2026-10-01' });
      await expect(
        service.update(1, { [key]: '2026-10-10' }),
      ).resolves.toMatchObject({ [key]: '2026-10-10' });
      expect(repo.save).toHaveBeenCalledTimes(2);
    },
  );
  it('preserves saved payment dates when selecting a different contract', async () => {
    repo.findOne.mockResolvedValue({ id: 1, ...dto, contract: { id: 42 } });
    contractQuery.getOne.mockResolvedValue({
      id: 43,
      regulations: [
        {
          id: 2,
          startRegisterDate: '2026-11-01',
          endRegisterDate: '2026-11-10',
        },
      ],
    });
    await expect(service.update(1, { contractId: 43 })).resolves.toMatchObject({
      contract: { id: 43 },
      registrationFeePaidDate: dto.registrationFeePaidDate,
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
  it('accepts payment dates when the contract has no registration schedule', async () => {
    contractQuery.getOne.mockResolvedValue({ id: 42 });
    await expect(
      service.create({ ...dto, depositAmountPaidDate: '2026-10-15' }),
    ).resolves.toMatchObject({
      registrationFeePaidDate: dto.registrationFeePaidDate,
      depositAmountPaidDate: '2026-10-15',
    });
  });
  it('reports a missing registration', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne(123)).rejects.toThrow(NotFoundException);
    repo.delete.mockResolvedValue({ affected: 0 });
    await expect(service.remove(123)).rejects.toThrow(NotFoundException);
  });
  it('deletes an existing registration', async () => {
    repo.delete.mockResolvedValue({ affected: 1 });
    await expect(service.remove(1)).resolves.toEqual({
      message: 'Đã xóa đăng ký đấu giá.',
    });
  });
});
