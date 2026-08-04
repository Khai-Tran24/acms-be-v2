import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AuctionResultService } from './auction-result.service';
import { CreateAuctionResultDto } from './dto/create-auction-result.dto';
import { UpdateAuctionResultDto } from './dto/update-auction-result.dto';
@Controller('auction-result')
export class AuctionResultController {
  constructor(private readonly service: AuctionResultService) {}
  @Post() create(@Body() dto: CreateAuctionResultDto) {
    return this.service.create(dto);
  }
  @Get() findAll() {
    return this.service.findAll();
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
