import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../shared/enums/role.enum';
import { AnalyticService } from './analytic.service';
import { CreateAnalyticDto } from './dto/create-analytic.dto';
import { UpdateAnalyticDto } from './dto/update-analytic.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('analytic')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DAU_GIA_VIEN, Role.THU_KY, Role.NHAN_VIEN_LUU_TRU)
@ApiBearerAuth()
export class AnalyticController {
  constructor(private readonly analyticService: AnalyticService) {}

  @Post()
  create(@Body() createAnalyticDto: CreateAnalyticDto) {
    return this.analyticService.create(createAnalyticDto);
  }

  @Get()
  findAll() {
    return this.analyticService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.analyticService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAnalyticDto: UpdateAnalyticDto,
  ) {
    return this.analyticService.update(+id, updateAnalyticDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.analyticService.remove(+id);
  }
}
