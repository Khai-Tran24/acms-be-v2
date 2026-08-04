import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionResult } from './entities/auction-result.entity';
import { Contract } from '../contract/entities/contract.entity';
import { AuctionResultController } from './auction-result.controller';
import { AuctionResultService } from './auction-result.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuctionResult, Contract])],
  controllers: [AuctionResultController],
  providers: [AuctionResultService],
  exports: [TypeOrmModule],
})
export class AuctionResultModule {}
