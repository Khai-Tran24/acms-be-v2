import { Injectable, NotFoundException } from '@nestjs/common';
import { CLOSED_CONTRACT_STATUSES } from '../shared/enums/contract.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { AuctionRegistration } from './entities/auction-registration.entity';
import {
  CreateAuctionRegistrationDto,
  UpdateAuctionRegistrationDto,
} from './dto/create-auction-registration.dto';
import { QueryAuctionRegistrationDto } from './dto/query-auction-registration.dto';

@Injectable()
export class AuctionRegistrationService {
  constructor(
    @InjectRepository(AuctionRegistration)
    private readonly repo: Repository<AuctionRegistration>,
    @InjectRepository(Contract)
    private readonly contracts: Repository<Contract>,
  ) {}

  private contractQuery() {
    return this.contracts
      .createQueryBuilder('contract')
      .leftJoin('contract.parentContract', 'parentContract')
      .select([
        'contract.id',
        'contract.contractNumber',
        'contract.parentContractId',
        'parentContract.id',
        'parentContract.contractNumber',
      ]);
  }

  async contractOptions(query: QueryAuctionRegistrationDto) {
    const builder = this.contractQuery().andWhere(
      'contract.contract_status NOT IN (:...closedStatuses)',
      { closedStatuses: CLOSED_CONTRACT_STATUSES },
    );
    if (query.search)
      builder.andWhere(
        '(contract.contractNumber ILIKE :search OR parentContract.contractNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    return this.paginate(builder, query, 'contract.id');
  }

  async contractOption(id: number) {
    const contract = await this.contractQuery()
      .leftJoin('contract.regulations', 'regulation')
      .leftJoin('contract.announcements', 'announcement')
      .addSelect([
        'contract.startingPrice',
        ...['regulation', 'announcement'].flatMap((alias) =>
          [
            'id',
            'startingPrice',
            'registrationFee',
            'depositAmount',
            'startRegisterDate',
            'endRegisterDate',
            'auctionDate',
          ].map((key) => `${alias}.${key}`),
        ),
      ])
      .where('contract.id = :id', { id })
      .getOne();
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng.');
    return contract;
  }

  async create(dto: CreateAuctionRegistrationDto) {
    const { contractId, registrationFee, depositAmount, ...data } = dto;
    const contract = await this.contractOption(contractId);
    return this.repo.save(
      this.repo.create({
        ...data,
        contract,
        registrationFee: String(registrationFee),
        depositAmount: String(depositAmount),
      }),
    );
  }

  async findAll(query: QueryAuctionRegistrationDto) {
    const builder = this.repo
      .createQueryBuilder('registration')
      .leftJoinAndSelect('registration.contract', 'contract')
      .leftJoinAndSelect('contract.parentContract', 'parentContract');
    if (query.search)
      builder.andWhere(
        '(registration.registrantName ILIKE :search OR registration.identityNumber ILIKE :search OR registration.address ILIKE :search OR contract.contractNumber ILIKE :search OR parentContract.contractNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    return this.paginate(builder, query, 'registration.id');
  }

  async findOne(id: number) {
    const item = await this.repo.findOne({
      where: { id },
      relations: { contract: { parentContract: true } },
    });
    if (!item) throw new NotFoundException('Không tìm thấy đăng ký đấu giá.');
    return item;
  }

  async update(id: number, dto: UpdateAuctionRegistrationDto) {
    const item = await this.findOne(id);
    const { contractId, registrationFee, depositAmount, ...data } = dto;
    const contract = await this.contractOption(contractId ?? item.contract.id);
    item.contract = contract;
    if (registrationFee !== undefined)
      item.registrationFee = String(registrationFee);
    if (depositAmount !== undefined) item.depositAmount = String(depositAmount);
    Object.assign(item, data);
    return this.repo.save(item);
  }

  async remove(id: number) {
    const result = await this.repo.delete(id);
    if (!result.affected)
      throw new NotFoundException('Không tìm thấy đăng ký đấu giá.');
    return { message: 'Đã xóa đăng ký đấu giá.' };
  }

  private async paginate<T extends ObjectLiteral>(
    builder: SelectQueryBuilder<T>,
    query: QueryAuctionRegistrationDto,
    column: string,
  ) {
    const [items, total] = await builder
      .orderBy(column, query.sortOrder.toUpperCase() as 'ASC' | 'DESC')
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
}
