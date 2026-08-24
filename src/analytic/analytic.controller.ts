import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../shared/enums/role.enum';
import { AnalyticService } from './analytic.service';
import { DashboardTrendQueryDto } from './dto/dashboard-query.dto';

@ApiTags('Dashboard')
@Controller('api/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.DAU_GIA_VIEN,
  Role.THU_KY,
  Role.NHAN_VIEN_LUU_TRU,
  Role.CHUYEN_VIEN,
)
@ApiBearerAuth()
export class AnalyticController {
  constructor(private readonly analytics: AnalyticService) {}

  @Get('summary')
  getSummary() {
    return this.analytics.getSummary();
  }

  @Get('charts/trends')
  getTrends(@Query() query: DashboardTrendQueryDto) {
    return this.analytics.getTrends(query.timeframe);
  }

  @Get('charts/asset-breakdown')
  getAssetBreakdown() {
    return this.analytics.getAssetBreakdown();
  }

  @Get('charts/contract-owner-breakdown')
  getContractOwnerBreakdown() {
    return this.analytics.getContractOwnerBreakdown();
  }

  @Get('tables/recent-files')
  getRecentFiles() {
    return this.analytics.getRecentFiles();
  }

  @Get('tables/liquidated-files')
  getLiquidatedFiles() {
    return this.analytics.getLiquidatedFiles();
  }

  @Get('tables/top-officers')
  getTopOfficers() {
    return this.analytics.getTopOfficers();
  }
}
