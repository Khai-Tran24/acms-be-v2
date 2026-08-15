import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { QueryRegulationDto } from './dto/query-regulation.dto';
import { Regulation } from './entities/regulation.entity';
import { FileEntityType } from '../file/dto/file.dto';
import { UploadFileServiceS3 } from '../file/upload-file.service';
@Injectable()
export class RegulationService {
  constructor(
    @InjectRepository(Regulation) private readonly repo: Repository<Regulation>,
    @InjectRepository(Contract)
    private readonly contracts: Repository<Contract>,
    private readonly fileService: UploadFileServiceS3,
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
  async findAll(query: QueryRegulationDto) {
    const builder = this.repo
      .createQueryBuilder('regulation')
      .leftJoinAndSelect('regulation.contract', 'contract');
    if (query.search)
      builder.andWhere(
        '(regulation.regulation_number ILIKE :search OR regulation.auction_format ILIKE :search OR regulation.auction_method ILIKE :search OR contract.contract_number ILIKE :search OR contract.contract_name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    if (query.regulationNumber)
      builder.andWhere('regulation.regulation_number ILIKE :regulationNumber', {
        regulationNumber: `%${query.regulationNumber}%`,
      });
    if (query.auctionFormat)
      builder.andWhere('regulation.auction_format ILIKE :auctionFormat', {
        auctionFormat: `%${query.auctionFormat}%`,
      });
    if (query.auctionMethod)
      builder.andWhere('regulation.auction_method ILIKE :auctionMethod', {
        auctionMethod: `%${query.auctionMethod}%`,
      });
    if (query.contractId !== undefined)
      builder.andWhere('contract.id = :contractId', {
        contractId: query.contractId,
      });
    if (query.auctionFrom)
      builder.andWhere('regulation.auction_date >= :auctionFrom', {
        auctionFrom: query.auctionFrom,
      });
    if (query.auctionTo)
      builder.andWhere('regulation.auction_date <= :auctionTo', {
        auctionTo: query.auctionTo,
      });
    const [items, total] = await builder
      .orderBy(
        `regulation.${this.sortColumn(query.sortBy)}`,
        query.sortOrder.toUpperCase() as 'ASC' | 'DESC',
      )
      .addOrderBy('regulation.id', 'ASC')
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
    const item = await this.findEntity(id);
    return {
      ...item,
      files: await this.fileService.activeFiles(FileEntityType.REGULATION, id),
    };
  }
  private async findEntity(id: number) {
    const item = await this.repo.findOne({
      where: { id },
      relations: { contract: true },
    });
    if (!item) throw new NotFoundException('Regulation not found');
    return item;
  }
  async update(id: number, dto: UpdateRegulationDto) {
    const item = await this.findEntity(id);
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
  private sortColumn(sortBy: QueryRegulationDto['sortBy']) {
    return (
      {
        id: 'id',
        regulationNumber: 'regulation_number',
        startingPrice: 'starting_price',
        depositAmount: 'deposit_amount',
        stepPrice: 'step_price',
        registrationFee: 'registration_fee',
        startRegisterDate: 'start_register_date',
        endRegisterDate: 'end_register_date',
        auctionDate: 'auction_date',
        auctionTime: 'auction_time',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      } as const
    )[sortBy];
  }
}
