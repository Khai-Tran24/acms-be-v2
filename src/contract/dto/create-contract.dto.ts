import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateContractDto {
  @ApiProperty() @IsString() @MaxLength(100) contractNumber!: string;
  @ApiProperty() @IsString() @MaxLength(255) contractName!: string;
  @ApiProperty() @IsString() @MaxLength(50) contractType!: string;
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2200)
  contractYear!: number;
  @ApiProperty() @IsString() @MaxLength(50) contractStatus!: string;
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
