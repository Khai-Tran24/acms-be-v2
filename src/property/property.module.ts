import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractProperty } from './entities/contract-property.entity';
import { Property } from './entities/property.entity';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';

@Module({
  imports: [TypeOrmModule.forFeature([Property, ContractProperty])],
  controllers: [PropertyController],
  providers: [PropertyService],
  exports: [TypeOrmModule],
})
export class PropertyModule {}
