import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticService } from './analytic.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { AuctionResult } from '../auction-result/entities/auction-result.entity';
import { ContractProperty } from '../property/entities/contract-property.entity';
import { User } from '../user/entities/user.entity';

describe('AnalyticService', () => {
  let service: AnalyticService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticService,
        ...[Contract, AuctionResult, ContractProperty, User].map((entity) => ({
          provide: getRepositoryToken(entity),
          useValue: {},
        })),
      ],
    }).compile();

    service = module.get<AnalyticService>(AnalyticService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
