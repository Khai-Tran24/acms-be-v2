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
    create: jest.fn((data: Partial<AuctionResult>) => data),
    save: jest.fn((data: Partial<AuctionResult>) => Promise.resolve(data)),
  };
  const contracts = { findOneBy: jest.fn() };
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
    const contract = { id: 42, contractStatus: ContractStatus.DAU_GIA_THANH };
    contracts.findOneBy.mockResolvedValue(contract);

    await expect(service.create(dto)).resolves.toMatchObject({
      contract,
      auctionResultNumber: dto.auctionResultNumber,
      winningPrice: '1000000',
      completedAt: new Date(dto.completedAt),
    });
    expect(contracts.findOneBy).toHaveBeenCalledWith({ id: 42 });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it.each(
    Object.values(ContractStatus).filter(
      (status) => status !== ContractStatus.DAU_GIA_THANH,
    ),
  )('rejects a contract currently in status %s', async (contractStatus) => {
    contracts.findOneBy.mockResolvedValue({ id: 42, contractStatus });

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects a contract that no longer exists', async () => {
    contracts.findOneBy.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
