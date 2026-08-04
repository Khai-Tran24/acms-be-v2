import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ContractProperty } from '../property/entities/contract-property.entity';
import { Property } from '../property/entities/property.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { Contract } from './entities/contract.entity';

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
  ) {}

  async create(dto: CreateContractDto, createdById?: number) {
    if (await this.contracts.existsBy({ contractNumber: dto.contractNumber }))
      throw new ConflictException('Contract number already exists');
    const { assignedToId, propertyIds, ...data } = dto;
    const contract = this.contracts.create({
      ...data,
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

  findAll() {
    return this.contracts.find({
      relations: {
        assignedTo: true,
        createdBy: true,
        contractProperties: { property: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
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
    const contract = await this.findOne(id);
    const { assignedToId, propertyIds, ...data } = dto;
    Object.assign(contract, data, {
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
