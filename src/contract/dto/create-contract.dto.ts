import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ContractPropertyOwnerType,
  ContractStatus,
} from 'src/shared/enums/contract.enum';

export class CreateContractDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contractNumber?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentContractId?: number | null;

  @ApiPropertyOptional({ enum: ContractPropertyOwnerType })
  @IsOptional()
  @IsEnum(ContractPropertyOwnerType)
  contractOwnerType?: ContractPropertyOwnerType;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-08-22',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  contractDate?: string | null;

  @ApiProperty()
  @IsEnum(ContractStatus)
  contractStatus!: ContractStatus;

  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) startingPrice!: number;

  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) stepPrice!: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  customer?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedToId?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  propertyIds?: number[];
}
