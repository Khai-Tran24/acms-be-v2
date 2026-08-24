import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';

export const PROPERTY_SORT_FIELDS = [
  'id',
  'propertyName',
  'propertyType',
  'propertyLocation',
  'createdAt',
  'updatedAt',
] as const;

export class QueryPropertyDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() propertyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() propertyType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() propertyLocation?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contractId?: number;
  @ApiPropertyOptional({ enum: PROPERTY_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(PROPERTY_SORT_FIELDS)
  sortBy: (typeof PROPERTY_SORT_FIELDS)[number] = 'createdAt';
}
