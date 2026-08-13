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
import { AuctionResultService } from './auction-result.service';
import { CreateAuctionResultDto } from './dto/create-auction-result.dto';
import { UpdateAuctionResultDto } from './dto/update-auction-result.dto';
import { QueryAuctionResultDto } from './dto/query-auction-result.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
@Controller('auction-result')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.DAU_GIA_VIEN,
  Role.THU_KY,
  Role.NHAN_VIEN_LUU_TRU,
  Role.CHUYEN_VIEN,
)
@ApiBearerAuth()
export class AuctionResultController {
  constructor(private readonly service: AuctionResultService) {}
  @Post() create(@Body() dto: CreateAuctionResultDto) {
    return this.service.create(dto);
  }
  @Get() findAll(@Query() query: QueryAuctionResultDto) {
    return this.service.findAll(query);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateAuctionResultDto,
  ) {
    return this.service.update(+id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
