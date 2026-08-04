import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsMilitaryTime,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
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
  @ApiProperty({ example: '09:30' }) @IsMilitaryTime() auctionTime!: string;
  @ApiProperty() @IsString() @MaxLength(100) auctionFormat!: string;
  @ApiProperty() @IsString() @MaxLength(100) auctionMethod!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) contractId!: number;
}
