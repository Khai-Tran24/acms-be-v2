import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

@Controller('contract')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @Permissions('contracts.create')
  create(
    @Body() createContractDto: CreateContractDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractService.create(createContractDto, user.id);
  }

  @Get()
  @Permissions('contracts.read')
  findAll() {
    return this.contractService.findAll();
  }

  @Get(':id')
  @Permissions('contracts.read')
  findOne(@Param('id') id: string) {
    return this.contractService.findOne(+id);
  }

  @Patch(':id')
  @Permissions('contracts.update')
  update(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
  ) {
    return this.contractService.update(+id, updateContractDto);
  }

  @Delete(':id')
  @Permissions('contracts.delete')
  remove(@Param('id') id: string) {
    return this.contractService.remove(+id);
  }
}
