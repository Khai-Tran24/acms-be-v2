/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'The name of the permission',
    example: 'CreateUser',
  })
  @IsString()
  @IsNotEmpty()
  permissionName!: string;

  @ApiProperty({
    description: 'The description of the permission',
    example: 'Allows creating a new user',
  })
  @IsString()
  @IsOptional()
  permissionDescription?: string;

  @ApiProperty({
    description: 'Whether the permission is active',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}
