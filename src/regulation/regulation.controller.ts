import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../shared/enums/role.enum';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { QueryRegulationDto } from './dto/query-regulation.dto';
import { RegulationService } from './regulation.service';
import { ApiBearerAuth } from '@nestjs/swagger';
@Controller('regulation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(
  Role.ADMIN,
  Role.DAU_GIA_VIEN,
  Role.THU_KY,
  Role.NHAN_VIEN_LUU_TRU,
  Role.CHUYEN_VIEN,
)
export class RegulationController {
  constructor(private readonly service: RegulationService) {}
  @Post() create(@Body() dto: CreateRegulationDto) {
    return this.service.create(dto);
  }
  @Get() findAll(@Query() query: QueryRegulationDto) {
    return this.service.findAll(query);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateRegulationDto,
  ) {
    return this.service.update(+id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
