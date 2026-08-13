import { Module } from '@nestjs/common';
import { AnalyticService } from './analytic.service';
import { AnalyticController } from './analytic.controller';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { AuctionResult } from '../auction-result/entities/auction-result.entity';
import { ContractProperty } from '../property/entities/contract-property.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Contract, AuctionResult, ContractProperty, User]),
  ],
  controllers: [AnalyticController],
  providers: [AnalyticService],
})
export class AnalyticModule {}
