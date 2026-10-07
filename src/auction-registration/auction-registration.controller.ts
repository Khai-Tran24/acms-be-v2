import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../shared/enums/role.enum';
import { AuctionRegistrationService } from './auction-registration.service';
import {
  CreateAuctionRegistrationDto,
  UpdateAuctionRegistrationDto,
} from './dto/create-auction-registration.dto';
import { QueryAuctionRegistrationDto } from './dto/query-auction-registration.dto';

@Controller('auction-registration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.NHAN_VIEN_BAN_HO_SO)
@ApiBearerAuth()
export class AuctionRegistrationController {
  constructor(private readonly service: AuctionRegistrationService) {}
  @Get('contracts') contractOptions(
    @Query() query: QueryAuctionRegistrationDto,
  ) {
    return this.service.contractOptions(query);
  }
  @Get('contracts/:id') contractOption(@Param('id', ParseIntPipe) id: number) {
    return this.service.contractOption(id);
  }
  @Post() create(@Body() dto: CreateAuctionRegistrationDto) {
    return this.service.create(dto);
  }
  @Get() findAll(@Query() query: QueryAuctionRegistrationDto) {
    return this.service.findAll(query);
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAuctionRegistrationDto,
  ) {
    return this.service.update(id, dto);
  }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
