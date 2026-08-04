import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Property } from './entities/property.entity';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property) private readonly repo: Repository<Property>,
  ) {}
  create(dto: CreatePropertyDto) {
    return this.repo.save(this.repo.create(dto));
  }
  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
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
