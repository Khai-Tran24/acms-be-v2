import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
export class CreateAuctionResultDto {
  @ApiProperty() @IsString() @MaxLength(100) auctionResultNumber!: string;
  @ApiProperty({ type: Object }) @IsObject() winner!: Record<string, unknown>;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) winningPrice!: number;
  @ApiProperty({ type: Object, isArray: true })
  @IsArray()
  auctionCost!: unknown[];
  @ApiProperty() @IsDateString() completedAt!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) contractId!: number;
}
