import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ContractProperty } from '../property/entities/contract-property.entity';
import { Property } from '../property/entities/property.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { QueryContractDto } from './dto/query-contract.dto';
import { Contract } from './entities/contract.entity';
import { UploadFileServiceS3 } from '../file/upload-file.service';
import { FileEntityType } from '../file/dto/file.dto';
import { ContractStatus } from '../shared/enums/contract.enum';

@Injectable()
export class ContractService {
  constructor(
    @InjectRepository(Contract)
    private readonly contracts: Repository<Contract>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Property)
    private readonly properties: Repository<Property>,
    @InjectRepository(ContractProperty)
    private readonly contractProperties: Repository<ContractProperty>,
    private readonly fileService: UploadFileServiceS3,
  ) {}

  async create(dto: CreateContractDto, createdById?: number) {
    if (await this.contracts.existsBy({ contractNumber: dto.contractNumber }))
      throw new ConflictException('Contract number already exists');
    const { assignedToId, propertyIds, contractDate, ...data } = dto;
    const contract = this.contracts.create({
      ...data,
      contractDate: contractDate ? new Date(contractDate) : null,
      startingPrice: String(data.startingPrice),
      stepPrice: String(data.stepPrice),
      customer: data.customer ?? null,
      assignedTo: await this.optionalUser(assignedToId),
      createdBy: await this.optionalUser(createdById),
    });
    const saved = await this.contracts.save(contract);
    await this.replaceProperties(saved, propertyIds);
    return this.findOne(saved.id);
  }

  async findAll(query: QueryContractDto) {
    const builder = this.createFilteredQuery(query);
    const [items, total] = await builder
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return this.paginated(items, total, query.page, query.limit);
  }

  async getReport(query: QueryContractDto) {
    if (
      [
        [query.contractDateFrom, query.contractDateTo],
        [query.createdFrom, query.createdTo],
      ].some(([from, to]) => from && to && new Date(from) > new Date(to))
    ) {
      throw new BadRequestException(
        'Ngày bắt đầu không thể sau ngày kết thúc.',
      );
    }
    // Filter by contract IDs before aggregating: multiple assets and auction
    // records must not multiply a contract's count or monetary values.
    const filtered = this.createFilteredQuery(query)
      .select('contract.id')
      .distinct(true)
      .orderBy();
    const totals = this.contracts
      .createQueryBuilder('contract')
      .leftJoin(
        'contract.auctionResults',
        'latestResult',
        `latestResult.id = (
        SELECT r.auction_result_id FROM auction_result r
        WHERE r.contract_id = contract.contract_id
        ORDER BY r.completed_at DESC, r.auction_result_id DESC LIMIT 1
      )`,
      )
      .where(`contract.id IN (${filtered.getQuery()})`)
      .setParameters(filtered.getParameters())
      .select('contract.contractStatus', 'status')
      .addSelect('COUNT(contract.id)', 'count')
      .addSelect('COALESCE(SUM(contract.startingPrice), 0)', 'startingPrice')
      .addSelect('COALESCE(SUM(latestResult.winningPrice), 0)', 'winningPrice')
      .groupBy('contract.contractStatus');
    const [page, groups] = await Promise.all([
      this.findAll(query),
      totals.getRawMany<{
        status: ContractStatus;
        count: string;
        startingPrice: string;
        winningPrice: string;
      }>(),
    ]);
    const statusBreakdown = Object.values(ContractStatus).map((status) => ({
      status,
      count: Number(
        groups.find((group) => group.status === status)?.count ?? 0,
      ),
    }));
    const totalContracts = groups.reduce(
      (sum, group) => sum + Number(group.count),
      0,
    );
    const successfulContracts = statusBreakdown
      .filter((group) =>
        [ContractStatus.DAU_GIA_THANH, ContractStatus.DA_THANH_LY].includes(
          group.status,
        ),
      )
      .reduce((sum, group) => sum + group.count, 0);
    return {
      summary: {
        totalContracts,
        successfulContracts,
        successRate: totalContracts
          ? Number(((successfulContracts / totalContracts) * 100).toFixed(1))
          : 0,
        totalStartingPrice: groups.reduce(
          (sum, group) => sum + Number(group.startingPrice),
          0,
        ),
        totalWinningPrice: groups.reduce(
          (sum, group) => sum + Number(group.winningPrice),
          0,
        ),
      },
      statusBreakdown,
      items: page.items.map((contract) => {
        const result = [...(contract.auctionResults ?? [])].sort(
          (a, b) =>
            new Date(b.completedAt).getTime() -
              new Date(a.completedAt).getTime() || b.id - a.id,
        )[0];
        return {
          id: contract.id,
          contractNumber: contract.contractNumber,
          contractDate: contract.contractDate,
          contractStatus: contract.contractStatus,
          propertyNames: (contract.contractProperties ?? []).map(
            (link) => link.property.propertyName,
          ),
          assignedOfficer:
            contract.assignedTo?.fullName ||
            contract.assignedTo?.username ||
            null,
          startingPrice: Number(contract.startingPrice),
          winningPrice: result ? Number(result.winningPrice) : null,
        };
      }),
      pagination: { ...page.pagination, totalItems: page.pagination.total },
    };
  }

  /** Returns every matching contract. Pagination is deliberately not applied. */
  findAllForExport(query: QueryContractDto) {
    return this.createFilteredQuery(query).getMany();
  }

  private createFilteredQuery(query: QueryContractDto) {
    const builder = this.contracts
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.assignedTo', 'assignedTo')
      .leftJoinAndSelect('contract.createdBy', 'createdBy')
      .leftJoinAndSelect('contract.contractProperties', 'contractProperty')
      .leftJoinAndSelect('contractProperty.property', 'property')
      .leftJoinAndSelect('contract.regulations', 'regulation')
      .leftJoinAndSelect('contract.announcements', 'announcement')
      .leftJoinAndSelect('contract.auctionResults', 'auctionResult');
    if (query.search) {
      builder.andWhere(
        `(contract.contract_number ILIKE :search
          OR CAST(contract.contract_type AS text) ILIKE :search
          OR CAST(contract.contract_owner_type AS text) ILIKE :search
          OR CAST(contract.contract_status AS text) ILIKE :search
          OR CAST(contract.customer AS text) ILIKE :search)`,
        { search: `%${query.search}%` },
      );
    }
    this.addTextFilter(
      builder,
      'contract.contract_number',
      'contractNumber',
      query.contractNumber,
    );
    this.addTextFilter(
      builder,
      'CAST(contract.contract_type AS text)',
      'contractType',
      query.contractType,
    );
    if (query.contractOwnerType !== undefined)
      builder.andWhere('contract.contract_owner_type = :contractOwnerType', {
        contractOwnerType: query.contractOwnerType,
      });
    if (query.contractDateFrom)
      builder.andWhere('contract.contract_date >= :contractDateFrom', {
        contractDateFrom: query.contractDateFrom,
      });
    if (query.contractDateTo)
      builder.andWhere('contract.contract_date <= :contractDateTo', {
        contractDateTo: query.contractDateTo,
      });
    this.addTextFilter(
      builder,
      'CAST(contract.contract_status AS text)',
      'contractStatus',
      query.contractStatus,
    );
    if (query.assignedToId !== undefined)
      builder.andWhere('assignedTo.id = :assignedToId', {
        assignedToId: query.assignedToId,
      });
    if (query.createdById !== undefined)
      builder.andWhere('createdBy.id = :createdById', {
        createdById: query.createdById,
      });
    if (query.propertyId !== undefined)
      // Filter the contract through a separate join. Filtering the selected
      // `property` alias would remove the contract's other properties from the
      // hydrated relation and make an export look incomplete.
      builder.innerJoin(
        'contract.contractProperties',
        'propertyFilter',
        'propertyFilter.property_id = :propertyId',
        { propertyId: query.propertyId },
      );
    if (query.createdFrom)
      builder.andWhere('contract.created_at >= :createdFrom', {
        createdFrom: query.createdFrom,
      });
    if (query.createdTo)
      builder.andWhere('contract.created_at <= :createdTo', {
        createdTo: query.createdTo,
      });
    return builder
      .orderBy(
        `contract.${this.contractSortColumn(query.sortBy)}`,
        query.sortOrder.toUpperCase() as 'ASC' | 'DESC',
      )
      .addOrderBy('contract.id', 'ASC');
  }

  async findOne(id: number) {
    const contract = await this.findEntity(id);
    return {
      ...contract,
      files: await this.fileService.activeFiles(FileEntityType.CONTRACT, id),
    };
  }

  private async findEntity(id: number) {
    const contract = await this.contracts.findOne({
      where: { id },
      relations: {
        assignedTo: true,
        createdBy: true,
        contractProperties: { property: true },
        regulations: true,
        auctionResults: true,
        announcements: true,
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async update(id: number, dto: UpdateContractDto) {
    const contract = await this.findEntity(id);
    const { assignedToId, propertyIds, ...data } = dto;
    Object.assign(contract, data, {
      ...(data.contractDate !== undefined && {
        contractDate: data.contractDate ? new Date(data.contractDate) : null,
      }),
      ...(data.startingPrice !== undefined && {
        startingPrice: String(data.startingPrice),
      }),
      ...(data.stepPrice !== undefined && {
        stepPrice: String(data.stepPrice),
      }),
    });
    if (assignedToId !== undefined)
      contract.assignedTo = await this.optionalUser(assignedToId);
    await this.contracts.save(contract);
    if (propertyIds !== undefined)
      await this.replaceProperties(contract, propertyIds);
    return this.findOne(id);
  }

  async remove(id: number) {
    const result = await this.contracts.delete(id);
    if (!result.affected) throw new NotFoundException('Contract not found');
    return { message: 'Contract deleted successfully' };
  }

  private async optionalUser(id?: number) {
    if (id === undefined) return null;
    const user = await this.users.findOneBy({ id });
    if (!user) throw new BadRequestException(`User ${id} not found`);
    return user;
  }

  private addTextFilter(
    builder: SelectQueryBuilder<Contract>,
    column: string,
    parameter: string,
    value?: string,
  ) {
    if (value)
      builder.andWhere(`${column} ILIKE :${parameter}`, {
        [parameter]: `%${value}%`,
      });
  }

  private contractSortColumn(sortBy: QueryContractDto['sortBy']) {
    return (
      {
        id: 'id',
        contractNumber: 'contract_number',
        contractType: 'contract_type',
        contractOwnerType: 'contract_owner_type',
        contractDate: 'contract_date',
        contractStatus: 'contract_status',
        startingPrice: 'starting_price',
        stepPrice: 'step_price',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      } as const
    )[sortBy];
  }

  private paginated<T>(items: T[], total: number, page: number, limit: number) {
    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async replaceProperties(contract: Contract, propertyIds?: number[]) {
    if (propertyIds === undefined) return;
    const uniqueIds = [...new Set(propertyIds)];
    const properties = uniqueIds.length
      ? await this.properties.findBy({ id: In(uniqueIds) })
      : [];
    if (properties.length !== uniqueIds.length)
      throw new BadRequestException('One or more properties were not found');
    await this.contractProperties.delete({ contract: { id: contract.id } });
    await this.contractProperties.save(
      properties.map((property) =>
        this.contractProperties.create({ contract, property }),
      ),
    );
  }
}
