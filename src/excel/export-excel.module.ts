import { Module } from '@nestjs/common';
import { ExportExcelController } from './export-excel.controller';
import { ExportExcelService } from './export-excel.service';
import { ContractModule } from '../contract/contract.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, ContractModule],
  controllers: [ExportExcelController],
  providers: [ExportExcelService],
})
export class ExportExcelModule {}
