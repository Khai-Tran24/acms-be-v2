import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Regulation } from './entities/regulation.entity';
import { Contract } from '../contract/entities/contract.entity';
import { RegulationController } from './regulation.controller';
import { RegulationService } from './regulation.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Regulation, Contract])],
  controllers: [RegulationController],
  providers: [RegulationService],
  exports: [TypeOrmModule],
})
export class RegulationModule {}
