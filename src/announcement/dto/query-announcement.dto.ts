import { AuctionFormat, AuctionMethod } from '../../shared/enums/contract.enum';
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

export const ANNOUNCEMENT_SORT_FIELDS = [
  'id',
  'announcementNumber',
  'startingPrice',
  'depositAmount',
  'stepPrice',
  'registrationFee',
  'startRegisterDate',
  'endRegisterDate',
  'auctionDate',
  'createdAt',
  'updatedAt',
] as const;

export class QueryAnnouncementDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() announcementNumber?: string;
  @ApiPropertyOptional({ enum: AuctionFormat })
  @IsOptional()
  @IsEnum(AuctionFormat)
  auctionFormat?: AuctionFormat;
  @ApiPropertyOptional({ enum: AuctionMethod })
  @IsOptional()
  @IsEnum(AuctionMethod)
  auctionMethod?: AuctionMethod;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contractId?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() auctionFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() auctionTo?: string;
  @ApiPropertyOptional({
    enum: ANNOUNCEMENT_SORT_FIELDS,
    default: 'auctionDate',
  })
  @IsOptional()
  @IsIn(ANNOUNCEMENT_SORT_FIELDS)
  sortBy: (typeof ANNOUNCEMENT_SORT_FIELDS)[number] = 'auctionDate';
}
