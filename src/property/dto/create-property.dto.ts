import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength } from 'class-validator';
import { PropertyType } from 'src/shared/enums/property.enum';

export class CreatePropertyDto {
  @ApiProperty() @IsString() @MaxLength(255) propertyName!: string;
  @ApiProperty() @IsEnum(PropertyType) propertyType!: PropertyType;
}
