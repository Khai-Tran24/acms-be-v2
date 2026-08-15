import { Announcement } from '../../announcement/entities/announcement.entity';
import { Contract } from '../../contract/entities/contract.entity';
import { Regulation } from '../../regulation/entities/regulation.entity';
import { FileStatus } from '../../shared/enums/file.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('file')
export class FileEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 's3_key', length: 1024, unique: true })
  s3Key!: string;

  @Column({ name: 's3_bucket', length: 255 })
  s3Bucket!: string;

  @Column({ name: 'original_name', length: 255 })
  originalName!: string;

  @Column({ name: 'mime_type', length: 255 })
  mimeType!: string;

  @Column({ name: 'file_size', type: 'bigint', default: 0 })
  fileSize!: number;

  @Index()
  @Column({ type: 'enum', enum: FileStatus, default: FileStatus.PENDING })
  status!: FileStatus;

  @ManyToOne(() => Contract, (contract) => contract.files, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract | null;

  @ManyToOne(() => Regulation, (regulation) => regulation.files, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'regulation_id' })
  regulation!: Regulation | null;

  @ManyToOne(() => Announcement, (announcement) => announcement.files, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'announcement_id' })
  announcement!: Announcement | null;

  // This becomes a ManyToOne relation when a Liquidation entity is added.
  @Index()
  @Column({ name: 'liquidation_id', type: 'int', nullable: true })
  liquidationId!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
