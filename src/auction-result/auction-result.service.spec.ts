import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { UploadFileServiceS3 } from '../file/upload-file.service';
import { ContractStatus } from '../shared/enums/contract.enum';
import { AuctionResultService } from './auction-result.service';
import { CreateAuctionResultDto } from './dto/create-auction-result.dto';
import { AuctionResult } from './entities/auction-result.entity';

describe('AuctionResultService creation eligibility', () => {
  let service: AuctionResultService;
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((data: Partial<AuctionResult>) => data),
    save: jest.fn((data: Partial<AuctionResult>) => Promise.resolve(data)),
  };
  const contracts = { findOne: jest.fn() };
  const dto: CreateAuctionResultDto = {
    auctionResultNumber: 'KQ-001',
    contractId: 42,
    winner: { name: 'Người trúng đấu giá' },
    winningPrice: 1000000,
    auctionCost: [],
    completedAt: '2026-10-02T03:00:00.000Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuctionResultService,
        { provide: getRepositoryToken(AuctionResult), useValue: repo },
        { provide: getRepositoryToken(Contract), useValue: contracts },
        { provide: UploadFileServiceS3, useValue: {} },
      ],
    }).compile();
    service = module.get(AuctionResultService);
  });

  it('creates a result for a successfully auctioned contract', async () => {
    const contract = {
      id: 42,
      contractStatus: ContractStatus.DAU_GIA_THANH,
      startingPrice: '1000000',
      regulations: [{ id: 1, auctionDate: '2026-10-01T03:00:00Z' }],
    };
    contracts.findOne.mockResolvedValue(contract);

    await expect(service.create(dto)).resolves.toMatchObject({
      contract,
      auctionResultNumber: dto.auctionResultNumber,
      winningPrice: '1000000',
      completedAt: new Date(dto.completedAt),
    });
    expect(contracts.findOne).toHaveBeenCalledWith({
      where: { id: 42 },
      relations: { regulations: true, announcements: true },
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it.each(
    Object.values(ContractStatus).filter(
      (status) => status !== ContractStatus.DAU_GIA_THANH,
    ),
  )('rejects a contract currently in status %s', async (contractStatus) => {
    contracts.findOne.mockResolvedValue({ id: 42, contractStatus });

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it.each([
    { winningPrice: 999999 },
    { completedAt: '2026-10-01T03:00:00Z' },
    { completedAt: '2026-09-30T03:00:00Z' },
  ])(
    'enforces result validation on create and partial update: %j',
    async (change) => {
      contracts.findOne.mockResolvedValue({
        id: 42,
        contractStatus: ContractStatus.DAU_GIA_THANH,
        startingPrice: '1000000',
        regulations: [{ id: 1, auctionDate: '2026-10-01T03:00:00Z' }],
      });
      repo.findOne.mockResolvedValue({ ...dto, contract: { id: 42 } });
      await expect(service.create({ ...dto, ...change })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, change)).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    },
  );
  it('revalidates result amounts and completion time when changing contract', async () => {
    repo.findOne.mockResolvedValue({ ...dto, contract: { id: 42 } });
    contracts.findOne.mockResolvedValue({
      id: 43,
      startingPrice: '2000000',
      regulations: [{ id: 1, auctionDate: '2026-10-03T03:00:00Z' }],
    });
    await expect(service.update(1, { contractId: 43 })).rejects.toThrow(
      BadRequestException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('rejects a contract that no longer exists', async () => {
    contracts.findOne.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
