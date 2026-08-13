import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Contract } from '../../contract/entities/contract.entity';
import { Role } from '../../shared/enums/role.enum';

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
    name: 'role',
    type: 'enum',
    enum: Role,
    default: Role.CHUYEN_VIEN,
  })
  role!: Role;

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

  @OneToMany(() => Contract, (contract) => contract.assignedTo)
  assignedContracts!: Contract[];

  // Populated by list queries without loading complete contract records.
  assignedContractIds?: number[];

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
