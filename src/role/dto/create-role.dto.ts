/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The name of the role',
    example: 'Admin',
  })
  @IsString()
  @IsNotEmpty()
  roleName!: string;

  @ApiPropertyOptional({
    description: 'The description of the role',
    example: 'Administrator role with full permissions',
  })
  @IsOptional()
  @IsString()
  roleDescription?: string;

  @ApiPropertyOptional({
    description: 'Whether the role is active',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}
