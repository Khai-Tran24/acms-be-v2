import {
  Controller,
  Get,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../shared/enums/role.enum';
import { QueryContractDto } from '../contract/dto/query-contract.dto';
import { ExportExcelService } from './export-excel.service';

@Controller('export-excel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.DAU_GIA_VIEN,
  Role.THU_KY,
  Role.NHAN_VIEN_LUU_TRU,
  Role.CHUYEN_VIEN,
)
@ApiBearerAuth()
export class ExportExcelController {
  constructor(private readonly exportExcelService: ExportExcelService) {}

  @Get('contracts')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportContracts(
    @Query() query: QueryContractDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.exportExcelService.exportContracts(query);
    const date = new Date().toISOString().slice(0, 10);
    response.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="contracts-${date}.xlsx"`,
      'Content-Length': String(file.length),
    });
    return new StreamableFile(file);
  }
}
