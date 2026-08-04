import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('file')
@Index(['entityType', 'entityId'])
@Index(['bucket', 'objectKey'], { unique: true })
export class File {
  @PrimaryGeneratedColumn({ name: 'file_id' })
  id!: number;

  @Column({ length: 255 })
  bucket!: string;

  @Column({ name: 'object_key', length: 1024 })
  objectKey!: string;

  @Column({ name: 'original_name', length: 255 })
  originalName!: string;

  @Column({ name: 'content_type', length: 255 })
  contentType!: string;

  @Column({ type: 'bigint' })
  size!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  etag!: string | null;

  @Column({ name: 'entity_type', length: 50 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'integer' })
  entityId!: number;

  @ManyToOne(() => User, (user) => user.uploadedFiles, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy!: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
