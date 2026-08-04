import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { Regulation } from './entities/regulation.entity';
@Injectable()
export class RegulationService {
  constructor(
    @InjectRepository(Regulation) private readonly repo: Repository<Regulation>,
    @InjectRepository(Contract)
    private readonly contracts: Repository<Contract>,
  ) {}
  async create(dto: CreateRegulationDto) {
    const { contractId, ...values } = dto;
    return this.repo.save(
      this.repo.create({
        ...this.money(values),
        contract: await this.contract(contractId),
      }),
    );
  }
  findAll() {
    return this.repo.find({
      relations: { contract: true },
      order: { createdAt: 'DESC' },
    });
  }
  async findOne(id: number) {
    const item = await this.repo.findOne({
      where: { id },
      relations: { contract: true },
    });
    if (!item) throw new NotFoundException('Regulation not found');
    return item;
  }
  async update(id: number, dto: UpdateRegulationDto) {
    const item = await this.findOne(id);
    const { contractId, ...values } = dto;
    Object.assign(item, this.money(values));
    if (contractId) item.contract = await this.contract(contractId);
    return this.repo.save(item);
  }
  async remove(id: number) {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Regulation not found');
    return { message: 'Regulation deleted successfully' };
  }
  private money<T extends Record<string, unknown>>(values: T) {
    return Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        typeof value === 'number' ? String(value) : value,
      ]),
    );
  }
  private async contract(id: number) {
    const item = await this.contracts.findOneBy({ id });
    if (!item) throw new NotFoundException('Contract not found');
    return item;
  }
}
