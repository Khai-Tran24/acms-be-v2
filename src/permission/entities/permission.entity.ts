import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn({ name: 'permission_id' })
  id!: number;

  @Column({ name: 'permission_name', unique: true, nullable: false })
  permissionName!: string;

  @Column({ name: 'permission_description', nullable: true })
  permissionDescription!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}
