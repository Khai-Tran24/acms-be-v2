import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFileDto {
  @ApiProperty() @IsString() @MaxLength(255) bucket!: string;
  @ApiProperty() @IsString() @MaxLength(1024) objectKey!: string;
  @ApiProperty() @IsString() @MaxLength(255) originalName!: string;
  @ApiProperty() @IsString() @MaxLength(255) contentType!: string;
  @ApiProperty({ description: 'Object size in bytes' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  size!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  etag?: string;
  @ApiProperty() @IsString() @MaxLength(50) entityType!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) entityId!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  uploadedById?: number;
}
