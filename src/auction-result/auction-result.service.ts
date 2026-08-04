import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { CreateAuctionResultDto } from './dto/create-auction-result.dto';
import { UpdateAuctionResultDto } from './dto/update-auction-result.dto';
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
  findAll() {
    return this.repo.find({
      relations: { contract: true },
      order: { completedAt: 'DESC' },
    });
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
}
