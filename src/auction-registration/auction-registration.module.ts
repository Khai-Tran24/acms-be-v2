import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Contract } from '../contract/entities/contract.entity';
import { AuctionRegistration } from './entities/auction-registration.entity';
import { AuctionRegistrationController } from './auction-registration.controller';
import { AuctionRegistrationService } from './auction-registration.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([AuctionRegistration, Contract]),
  ],
  controllers: [AuctionRegistrationController],
  providers: [AuctionRegistrationService],
})
export class AuctionRegistrationModule {}
