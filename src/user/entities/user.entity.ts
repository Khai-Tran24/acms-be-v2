import { Role } from '../../role/entities/role.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contract } from '../../contract/entities/contract.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({ name: 'avatar', nullable: true })
  avatar!: string;

  @Column({ name: 'username', nullable: false, unique: true })
  username!: string;

  @Column({ name: 'full_name', nullable: false })
  fullName!: string;

  @Column({ name: 'is_active', default: false })
  isActive!: boolean;

  @Column({
    type: 'varchar',
    name: 'refresh_token_hash',
    select: false,
    nullable: true,
  })
  refreshTokenHash!: string | null;

  @Column({
    type: 'varchar',
    name: 'email_verification_otp_hash',
    select: false,
    nullable: true,
  })
  emailVerificationOtpHash!: string | null;

  @Column({
    type: 'timestamp',
    name: 'email_verification_otp_expires_at',
    nullable: true,
  })
  emailVerificationOtpExpiresAt!: Date | null;

  @Column({
    type: 'varchar',
    name: 'password_reset_otp_hash',
    select: false,
    nullable: true,
  })
  passwordResetOtpHash!: string | null;

  @Column({
    type: 'timestamp',
    name: 'password_reset_otp_expires_at',
    nullable: true,
  })
  passwordResetOtpExpiresAt!: Date | null;

  @ManyToOne(() => Role, (role) => role.id, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'role_id' })
  role!: Role | null;

  @OneToMany(() => Contract, (contract) => contract.assignedTo)
  assignedContracts!: Contract[];

  @OneToMany(() => Contract, (contract) => contract.createdBy)
  createdContracts!: Contract[];

  @Column({ nullable: true })
  phone!: string;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;
}
