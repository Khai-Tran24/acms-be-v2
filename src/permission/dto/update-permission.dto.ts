/* eslint-disable @typescript-eslint/no-unsafe-call */
import { PartialType } from '@nestjs/mapped-types';
import { CreatePermissionDto } from './create-permission.dto';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {
  @IsString()
  @IsNotEmpty()
  permissionName!: string;

  @IsString()
  @IsOptional()
  permissionDescription?: string;

  @IsBoolean()
  @IsNotEmpty()
  isActive?: boolean;
}
