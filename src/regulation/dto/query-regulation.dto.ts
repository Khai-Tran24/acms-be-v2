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

export const REGULATION_SORT_FIELDS = [
  'id',
  'regulationNumber',
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

export class QueryRegulationDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() regulationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() auctionFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() auctionMethod?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contractId?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() auctionFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() auctionTo?: string;
  @ApiPropertyOptional({ enum: REGULATION_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(REGULATION_SORT_FIELDS)
  sortBy: (typeof REGULATION_SORT_FIELDS)[number] = 'createdAt';
}
