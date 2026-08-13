import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { Property } from './entities/property.entity';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property) private readonly repo: Repository<Property>,
  ) {}
  create(dto: CreatePropertyDto) {
    return this.repo.save(this.repo.create(dto));
  }
  async findAll(query: QueryPropertyDto) {
    const builder = this.repo
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.contractProperties', 'contractProperty')
      .leftJoinAndSelect('contractProperty.contract', 'contract');
    if (query.search)
      builder.andWhere(
        '(property.property_name ILIKE :search OR property.property_type ILIKE :search)',
        { search: `%${query.search}%` },
      );
    if (query.propertyName)
      builder.andWhere('property.property_name ILIKE :propertyName', {
        propertyName: `%${query.propertyName}%`,
      });
    if (query.propertyType)
      builder.andWhere('property.property_type ILIKE :propertyType', {
        propertyType: `%${query.propertyType}%`,
      });
    if (query.contractId !== undefined)
      builder.andWhere('contract.id = :contractId', {
        contractId: query.contractId,
      });
    const columns = {
      id: 'id',
      propertyName: 'property_name',
      propertyType: 'property_type',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    } as const;
    const [items, total] = await builder
      .orderBy(
        `property.${columns[query.sortBy]}`,
        query.sortOrder.toUpperCase() as 'ASC' | 'DESC',
      )
      .addOrderBy('property.id', 'ASC')
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
      relations: { contractProperties: { contract: true } },
    });
    if (!item) throw new NotFoundException('Property not found');
    return item;
  }
  async update(id: number, dto: UpdatePropertyDto) {
    return this.repo.save(this.repo.merge(await this.findOne(id), dto));
  }
  async remove(id: number) {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Property not found');
    return { message: 'Property deleted successfully' };
  }
}
