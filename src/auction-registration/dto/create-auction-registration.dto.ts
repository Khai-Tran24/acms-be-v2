import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  RegistrationPaymentStatus,
  RegistrationStatus,
} from '../entities/auction-registration.entity';

export class CreateAuctionRegistrationDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contractId!: number;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  registrantName!: string;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  identityNumber!: string;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  registrationFee!: number;

  @ApiProperty({ enum: RegistrationPaymentStatus })
  @IsEnum(RegistrationPaymentStatus)
  registrationFeeStatus!: RegistrationPaymentStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  registrationFeePaidDate?: string | null;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount!: number;

  @ApiProperty({ enum: RegistrationPaymentStatus })
  @IsEnum(RegistrationPaymentStatus)
  depositAmountStatus!: RegistrationPaymentStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  depositAmountPaidDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiProperty({ enum: RegistrationStatus })
  @IsEnum(RegistrationStatus)
  status!: RegistrationStatus;
}

export class UpdateAuctionRegistrationDto extends PartialType(
  CreateAuctionRegistrationDto,
  { skipNullProperties: false },
) {}
