import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { CreateAuctionResultDto } from './dto/create-auction-result.dto';
import { UpdateAuctionResultDto } from './dto/update-auction-result.dto';
import { QueryAuctionResultDto } from './dto/query-auction-result.dto';
import { AuctionResult } from './entities/auction-result.entity';
@Injectable()
export class AuctionResultService {
  constructor(
    @InjectRepository(AuctionResult)
    private readonly repo: Repository<AuctionResult>,
    @InjectRepository(Contract)
    private readonly contracts: Repository<Contract>,
  ) {}
  async create(dto: CreateAuctionResultDto) {
    const { contractId, winningPrice, completedAt, ...data } = dto;
    return this.repo.save(
      this.repo.create({
        ...data,
        winningPrice: String(winningPrice),
        completedAt: new Date(completedAt),
        contract: await this.contract(contractId),
      }),
    );
  }
  async findAll(query: QueryAuctionResultDto) {
    const builder = this.repo
      .createQueryBuilder('result')
      .leftJoinAndSelect('result.contract', 'contract');
    if (query.search)
      builder.andWhere(
        '(result.auction_result_number ILIKE :search OR CAST(result.winner AS text) ILIKE :search OR contract.contract_number ILIKE :search OR contract.contract_name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    if (query.auctionResultNumber)
      builder.andWhere(
        'result.auction_result_number ILIKE :auctionResultNumber',
        { auctionResultNumber: `%${query.auctionResultNumber}%` },
      );

    if (query.contractId !== undefined)
      builder.andWhere('contract.id = :contractId', {
        contractId: query.contractId,
      });
    if (query.completedFrom)
      builder.andWhere('result.completed_at >= :completedFrom', {
        completedFrom: query.completedFrom,
      });
    if (query.completedTo)
      builder.andWhere('result.completed_at <= :completedTo', {
        completedTo: query.completedTo,
      });
    const [items, total] = await builder
      .orderBy(
        `result.${this.sortColumn(query.sortBy)}`,
        query.sortOrder.toUpperCase() as 'ASC' | 'DESC',
      )
      .addOrderBy('result.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async findOne(id: number) {
    const item = await this.repo.findOne({
      where: { id },
      relations: { contract: true },
    });
    if (!item) throw new NotFoundException('Auction result not found');
    return item;
  }
  async update(id: number, dto: UpdateAuctionResultDto) {
    const item = await this.findOne(id);
    const { contractId, winningPrice, completedAt, ...data } = dto;
    Object.assign(item, data);
    if (winningPrice !== undefined) item.winningPrice = String(winningPrice);
    if (completedAt) item.completedAt = new Date(completedAt);
    if (contractId) item.contract = await this.contract(contractId);
    return this.repo.save(item);
  }
  async remove(id: number) {
    const result = await this.repo.delete(id);
    if (!result.affected)
      throw new NotFoundException('Auction result not found');
    return { message: 'Auction result deleted successfully' };
  }
  private async contract(id: number) {
    const item = await this.contracts.findOneBy({ id });
    if (!item) throw new NotFoundException('Contract not found');
    return item;
  }
  private sortColumn(sortBy: QueryAuctionResultDto['sortBy']) {
    return (
      {
        id: 'id',
        auctionResultNumber: 'auction_result_number',
        winningPrice: 'winning_price',
        completedAt: 'completed_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      } as const
    )[sortBy];
  }
}
