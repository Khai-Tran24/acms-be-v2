import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty() @IsEmail() @MaxLength(255) email!: string;
  @ApiProperty({ example: '123456' }) @IsString() @Length(6, 6) otp!: string;
}

export class ForgotPasswordDto {
  @ApiProperty() @IsEmail() @MaxLength(255) email!: string;
}

export class ResetPasswordDto extends VerifyEmailDto {
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(128) newPassword!: string;
}
