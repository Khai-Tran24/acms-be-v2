import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractProperty } from './entities/contract-property.entity';
import { Property } from './entities/property.entity';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/shared/enums/role.enum';

@ApiBearerAuth()
@Roles(Role.ADMIN, Role.DAU_GIA_VIEN, Role.THU_KY, Role.NHAN_VIEN_LUU_TRU)
@Module({
  imports: [TypeOrmModule.forFeature([Property, ContractProperty])],
  controllers: [PropertyController],
  providers: [PropertyService],
  exports: [TypeOrmModule],
})
export class PropertyModule {}
