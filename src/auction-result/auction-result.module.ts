import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionResult } from './entities/auction-result.entity';
import { Contract } from '../contract/entities/contract.entity';
import { AuctionResultController } from './auction-result.controller';
import { AuctionResultService } from './auction-result.service';
import { AuthModule } from '../auth/auth.module';
import { UploadFileModule } from '../file/upload-file.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([AuctionResult, Contract]),
    UploadFileModule,
  ],
  controllers: [AuctionResultController],
  providers: [AuctionResultService],
  exports: [TypeOrmModule],
})
export class AuctionResultModule {}
