import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../shared/enums/role.enum';

export class RegisterDto {
  @ApiProperty() @IsString() @MaxLength(100) username!: string;
  @ApiProperty() @IsEmail() @MaxLength(255) email!: string;
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @ApiProperty() @IsString() @MaxLength(255) fullName!: string;
  @ApiProperty({
    required: true,
    enum: Role,
    enumName: 'Role',
  })
  @IsOptional()
  @Type(() => String)
  @IsEnum(Role)
  role?: Role;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
