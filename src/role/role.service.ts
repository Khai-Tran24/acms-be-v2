import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { RolePermission } from './entities/role-permission.entity';
// import { Permission } from 'src/permission/entities/permission.entity';
import { PermissionService } from 'src/permission/permission.service';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    private readonly permissionRepository: PermissionService,
  ) {}

  create(createRoleDto: CreateRoleDto) {
    const role = this.roleRepository.create(createRoleDto);
    return this.roleRepository.save(role);
  }

  findAll() {
    return this.roleRepository.find();
  }

  async findOne(id: number) {
    const role = await this.roleRepository.findOne({
      where: {
        id: id,
      },
      relations: {
        rolePermissions: {
          permission: true,
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      role_id: role.id,
      role_name: role.roleName,
      description: role.roleDescription,
      is_active: role.isActive,
      permissions: role.rolePermissions.map(
        (rolePermission) => rolePermission.permission,
      ),
    };
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return this.roleRepository.update(id, updateRoleDto);
  }

  remove(id: number) {
    return this.roleRepository.delete(id);
  }

  assignPermissionsToRole(roleId: number, permissionIds: number[]) {
    return this.rolePermissionRepository.save(
      permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    );
  }
}
