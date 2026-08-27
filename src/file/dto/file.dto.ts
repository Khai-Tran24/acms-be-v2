import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMimeType,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';

export enum FileEntityType {
  CONTRACT = 'CONTRACT',
  REGULATION = 'REGULATION',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  AUCTION_RESULT = 'AUCTION_RESULT',
  LIQUIDATION = 'LIQUIDATION',
}

export interface TestUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class CreatePresignedUploadDto {
  @ApiProperty({ example: 'contract.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsMimeType()
  @MaxLength(255)
  fileType!: string;

  @ApiProperty({ example: 1048576, maximum: 25 * 1024 * 1024 })
  @Type(() => Number)
  @IsInt()
  @Max(25 * 1024 * 1024, {
    message: 'File must not larger than 25mb',
  })
  fileSize!: number;

  @ApiProperty({ enum: FileEntityType })
  @IsEnum(FileEntityType)
  entityType!: FileEntityType;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entityId!: number;
}

export class QueryFileDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: FileEntityType })
  @IsOptional()
  @IsEnum(FileEntityType)
  entityType?: FileEntityType;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entityId?: number;
}
