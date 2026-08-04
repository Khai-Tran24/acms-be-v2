import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  username!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  fullName!: string;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty()
  @IsInt()
  role!: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatar!: string;
}
