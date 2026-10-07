import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AuctionFormat, AuctionMethod } from '../../shared/enums/contract.enum';

export class CreateAnnouncementDto {
  @ApiProperty() @IsString() @MaxLength(100) announcementNumber!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) startingPrice!: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) depositAmount!: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) stepPrice!: number;
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  registrationFee!: number;
  @ApiProperty() @IsDateString() startRegisterDate!: string;
  @ApiProperty() @IsDateString() endRegisterDate!: string;
  @ApiProperty() @IsDateString() auctionDate!: string;
  @ApiPropertyOptional({ enum: AuctionFormat, nullable: true })
  @IsOptional()
  @IsEnum(AuctionFormat)
  auctionFormat?: AuctionFormat | null;

  @ApiPropertyOptional({ enum: AuctionMethod, nullable: true })
  @IsOptional()
  @IsEnum(AuctionMethod)
  auctionMethod?: AuctionMethod | null;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) contractId!: number;
}
