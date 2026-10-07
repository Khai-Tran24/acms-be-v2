import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ContractProperty } from '../property/entities/contract-property.entity';
import { Property } from '../property/entities/property.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { QueryContractDto } from './dto/query-contract.dto';
import { Contract } from './entities/contract.entity';
import { UploadFileServiceS3 } from '../file/upload-file.service';
import { FileEntityType } from '../file/dto/file.dto';
import {
  CLOSED_CONTRACT_STATUSES,
  ContractStatus,
  ContractType,
} from '../shared/enums/contract.enum';

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
    const {
      assignedToId,
      propertyIds,
      contractDate,
      parentContractId,
      ...data
    } = dto;
    const parentContract = await this.resolveParent(parentContractId);
    const contractNumber = await this.validateNumber(dto.contractNumber);
    const contract = this.contracts.create({
      ...data,
      contractNumber,
      parentContract,
      parentContractId: parentContract?.id ?? null,
      contractType: parentContract
        ? ContractType.HOP_DONG_SUA_DOI_BO_SUNG
        : ContractType.HOP_DONG_MOI,
      contractDate: contractDate ? new Date(contractDate) : null,
      startingPrice: String(data.startingPrice),
      stepPrice: String(data.stepPrice),
      customer: data.customer ?? null,
      assignedTo: await this.optionalUser(assignedToId),
      createdBy: await this.optionalUser(createdById),
    });
    const saved = await this.contracts.manager.transaction(async (manager) => {
      const saved = await manager.save(Contract, contract);
      await this.replaceProperties(
        saved,
        propertyIds ??
          parentContract?.contractProperties.map((link) => link.property.id),
        manager,
      );
      return saved;
    });
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
      .leftJoinAndSelect('contract.parentContract', 'parentContract')
      .leftJoinAndSelect('contract.childContracts', 'childContract')
      .leftJoinAndSelect('contract.assignedTo', 'assignedTo')
      .leftJoinAndSelect('contract.createdBy', 'createdBy')
      .leftJoinAndSelect('contract.contractProperties', 'contractProperty')
      .leftJoinAndSelect('contractProperty.property', 'property')
      .leftJoinAndSelect('contract.regulations', 'regulation')
      .leftJoinAndSelect('contract.announcements', 'announcement')
      .leftJoinAndSelect('contract.auctionResults', 'auctionResult');
    if (query.selectableOnly)
      builder.andWhere('contract.contract_status NOT IN (:...closedStatuses)', {
        closedStatuses: CLOSED_CONTRACT_STATUSES,
      });
    if (query.search) {
      builder.andWhere(
        `(${this.familyMatch(`familyContract.contract_number ILIKE :search
          OR EXISTS (SELECT 1 FROM contract_property fp JOIN property p ON p.property_id = fp.property_id
            WHERE fp.contract_id = familyContract.contract_id
              AND (p.property_name ILIKE :search OR p.property_location ILIKE :search))`)}
          OR CAST(contract.contract_type AS text) ILIKE :search
          OR CAST(contract.contract_owner_type AS text) ILIKE :search
          OR CAST(contract.contract_status AS text) ILIKE :search
          OR CAST(contract.customer AS text) ILIKE :search)`,
        { search: `%${query.search}%` },
      );
    }
    if (query.contractNumber)
      builder.andWhere(
        this.familyMatch(
          'familyContract.contract_number ILIKE :contractNumber',
        ),
        {
          contractNumber: `%${query.contractNumber}%`,
        },
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
      builder.andWhere(
        this.familyMatch(`EXISTS (SELECT 1 FROM contract_property fp
        WHERE fp.contract_id = familyContract.contract_id AND fp.property_id = :propertyId)`),
        {
          propertyId: query.propertyId,
        },
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
        parentContract: true,
        childContracts: true,
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
    const { assignedToId, propertyIds, parentContractId, ...data } = dto;
    if (parentContractId !== undefined) {
      if (
        parentContractId != null &&
        parentContractId !== contract.parentContractId &&
        contract.childContracts.length > 0
      )
        throw new BadRequestException(
          'Hợp đồng đang có hợp đồng con không thể chuyển thành hợp đồng sửa đổi bổ sung.',
        );
      contract.parentContract = await this.resolveParent(parentContractId, id);
      contract.parentContractId = contract.parentContract?.id ?? null;
    }
    if (data.contractNumber !== undefined)
      data.contractNumber = await this.validateNumber(data.contractNumber, id);
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
    contract.contractType = contract.parentContractId
      ? ContractType.HOP_DONG_SUA_DOI_BO_SUNG
      : ContractType.HOP_DONG_MOI;
    if (assignedToId !== undefined)
      contract.assignedTo = await this.optionalUser(assignedToId);
    await this.contracts.manager.transaction(async (manager) => {
      await manager.save(Contract, contract);
      if (propertyIds !== undefined)
        await this.replaceProperties(contract, propertyIds, manager);
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    if (await this.contracts.existsBy({ parentContractId: id }))
      throw new ConflictException(
        'Cannot delete a contract with child contracts',
      );
    const result = await this.contracts.delete(id);
    if (!result.affected) throw new NotFoundException('Contract not found');
    return { message: 'Contract deleted successfully' };
  }

  // Traverse both directions so a match on any resale returns its whole family.
  // UNION (rather than UNION ALL) visits each contract only once.
  private familyMatch(predicate: string) {
    return `EXISTS (
      WITH RECURSIVE family(id) AS (
        SELECT contract.contract_id
        UNION
        SELECT relative.contract_id FROM family
        JOIN contract current_contract ON current_contract.contract_id = family.id
        JOIN contract relative ON relative.parent_contract_id = current_contract.contract_id
          OR relative.contract_id = current_contract.parent_contract_id
      )
      SELECT 1 FROM family JOIN contract familyContract ON familyContract.contract_id = family.id
      WHERE ${predicate}
    )`;
  }

  private async resolveParent(parentId?: number | null, contractId?: number) {
    if (parentId == null) return null;
    if (parentId === contractId)
      throw new BadRequestException('A contract cannot be its own ancestor');
    const parent = await this.contracts.findOne({
      where: { id: parentId },
      relations: { contractProperties: { property: true } },
    });
    if (!parent) throw new BadRequestException('Parent contract not found');
    if (
      parent.contractType !== ContractType.HOP_DONG_MOI ||
      parent.parentContractId != null
    )
      throw new BadRequestException(
        'Hợp đồng cha phải là hợp đồng mới, không phải hợp đồng sửa đổi bổ sung.',
      );
    return parent;
  }

  private async validateNumber(value?: string | null, id?: number) {
    const number = value?.trim() || null;
    if (number) {
      const existing = await this.contracts.findOneBy({
        contractNumber: number,
      });
      if (existing && existing.id !== id)
        throw new ConflictException('Contract number already exists');
    }
    return number;
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

  private async replaceProperties(
    contract: Contract,
    propertyIds: number[] | undefined,
    manager: EntityManager,
  ) {
    if (propertyIds === undefined) return;
    const uniqueIds = [...new Set(propertyIds)];
    const properties = uniqueIds.length
      ? await manager.getRepository(Property).findBy({ id: In(uniqueIds) })
      : [];
    if (properties.length !== uniqueIds.length)
      throw new BadRequestException('One or more properties were not found');
    const links = manager.getRepository(ContractProperty);
    await links.delete({ contract: { id: contract.id } });
    await links.save(
      properties.map((property) => links.create({ contract, property })),
    );
  }
}
