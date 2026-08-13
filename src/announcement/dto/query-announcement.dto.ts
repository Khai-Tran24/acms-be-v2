import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';

export const ANNOUNCEMENT_SORT_FIELDS = [
  'id',
  'announcementNumber',
  'startingPrice',
  'depositAmount',
  'stepPrice',
  'registrationFee',
  'startRegisterDate',
  'endRegisterDate',
  'auctionDate',
  'auctionTime',
  'createdAt',
  'updatedAt',
] as const;

export class QueryAnnouncementDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() announcementNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() auctionFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() auctionMethod?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contractId?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() auctionFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() auctionTo?: string;
  @ApiPropertyOptional({
    enum: ANNOUNCEMENT_SORT_FIELDS,
    default: 'auctionDate',
  })
  @IsOptional()
  @IsIn(ANNOUNCEMENT_SORT_FIELDS)
  sortBy: (typeof ANNOUNCEMENT_SORT_FIELDS)[number] = 'auctionDate';
}
