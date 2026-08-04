import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from './entities/contract.entity';
import { User } from '../user/entities/user.entity';
import { Property } from '../property/entities/property.entity';
import { ContractProperty } from '../property/entities/contract-property.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Contract, User, Property, ContractProperty]),
  ],
  controllers: [ContractController],
  providers: [ContractService],
})
export class ContractModule {}
