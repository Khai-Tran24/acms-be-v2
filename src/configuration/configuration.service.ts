import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { Configuration } from './entities/configuration.entity';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectRepository(Configuration)
    private readonly configurations: Repository<Configuration>,
  ) {}

  async create(dto: CreateConfigurationDto) {
    if (await this.configurations.existsBy({ key: dto.key }))
      throw new ConflictException('Configuration key already exists');
    return this.configurations.save(this.configurations.create(dto));
  }

  findAll() {
    return this.configurations.find({ order: { key: 'ASC' } });
  }

  async findOne(id: number) {
    const configuration = await this.configurations.findOneBy({ id });
    if (!configuration) throw new NotFoundException('Configuration not found');
    return configuration;
  }

  async update(id: number, dto: UpdateConfigurationDto) {
    const configuration = await this.findOne(id);
    return this.configurations.save(
      this.configurations.merge(configuration, dto),
    );
  }

  async remove(id: number) {
    const result = await this.configurations.delete(id);
    if (!result.affected)
      throw new NotFoundException('Configuration not found');
    return { message: 'Configuration deleted successfully' };
  }
}
