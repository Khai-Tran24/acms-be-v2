import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreatePropertyDto {
  @ApiProperty() @IsString() @MaxLength(255) propertyName!: string;
  @ApiProperty() @IsString() @MaxLength(100) propertyType!: string;
}
