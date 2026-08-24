import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';
import { ContractPropertyOwnerType } from '../../shared/enums/contract.enum';

export const CONTRACT_SORT_FIELDS = [
  'id',
  'contractNumber',
  'contractName',
  'contractType',
  'contractOwnerType',
  'contractDate',
  'contractStatus',
  'startingPrice',
  'stepPrice',
  'createdAt',
  'updatedAt',
] as const;

export class QueryContractDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contractNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contractName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contractType?: string;
  @ApiPropertyOptional({ enum: ContractPropertyOwnerType })
  @IsOptional()
  @IsEnum(ContractPropertyOwnerType)
  contractOwnerType?: ContractPropertyOwnerType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractDateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() contractDateTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contractStatus?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedToId?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  createdById?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() createdFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() createdTo?: string;
  @ApiPropertyOptional({ enum: CONTRACT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(CONTRACT_SORT_FIELDS)
  sortBy: (typeof CONTRACT_SORT_FIELDS)[number] = 'createdAt';
}
