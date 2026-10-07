import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { UploadFileServiceS3 } from '../file/upload-file.service';
import { Regulation } from './entities/regulation.entity';
import { RegulationService } from './regulation.service';

const dto = {
  contractId: 1,
  regulationNumber: 'QC-1',
  startingPrice: 100,
  depositAmount: 20,
  registrationFee: 5,
  stepPrice: 1,
  startRegisterDate: '2026-10-01T00:00:00Z',
  endRegisterDate: '2026-10-10T00:00:00Z',
  auctionDate: '2026-10-11T00:00:00Z',
};
describe('Regulation service validation', () => {
  let service: RegulationService;
  const repo = {
    create: jest.fn((data: unknown) => data),
    save: jest.fn((data: unknown) => Promise.resolve(data)),
    findOne: jest.fn(),
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    repo.findOne.mockResolvedValue({ ...dto, contract: { id: 1 } });
    const module = await Test.createTestingModule({
      providers: [
        RegulationService,
        { provide: getRepositoryToken(Regulation), useValue: repo },
        {
          provide: getRepositoryToken(Contract),
          useValue: { findOneBy: jest.fn().mockResolvedValue({ id: 1 }) },
        },
        { provide: UploadFileServiceS3, useValue: {} },
      ],
    }).compile();
    service = module.get(RegulationService);
  });
  it('saves a valid regulation', async () => {
    await expect(service.create(dto)).resolves.toMatchObject({
      depositAmount: '20',
    });
  });
  it.each([
    { depositAmount: 100 },
    { startingPrice: 20 },
    { endRegisterDate: dto.startRegisterDate },
    { auctionDate: dto.endRegisterDate },
  ])('validates merged values on partial edits: %j', async (change) => {
    await expect(service.update(1, change)).rejects.toThrow();
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('validates create before saving', async () => {
    await expect(
      service.create({ ...dto, auctionDate: dto.endRegisterDate }),
    ).rejects.toThrow();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
