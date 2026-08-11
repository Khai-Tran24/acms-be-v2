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

export const AUCTION_RESULT_SORT_FIELDS = [
  'id',
  'auctionResultNumber',
  'winningPrice',
  'completedAt',
  'createdAt',
  'updatedAt',
] as const;

export class QueryAuctionResultDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() auctionResultNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contractId?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() completedFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() completedTo?: string;
  @ApiPropertyOptional({
    enum: AUCTION_RESULT_SORT_FIELDS,
    default: 'completedAt',
  })
  @IsOptional()
  @IsIn(AUCTION_RESULT_SORT_FIELDS)
  sortBy: (typeof AUCTION_RESULT_SORT_FIELDS)[number] = 'completedAt';
}
