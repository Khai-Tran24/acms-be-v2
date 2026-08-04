import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { File } from './entities/file.entity';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File) private readonly files: Repository<File>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(dto: CreateFileDto) {
    if (
      await this.files.existsBy({
        bucket: dto.bucket,
        objectKey: dto.objectKey,
      })
    )
      throw new ConflictException('S3 object is already registered');
    const { uploadedById, size, ...data } = dto;
    const uploadedBy = uploadedById
      ? await this.users.findOneBy({ id: uploadedById })
      : null;
    if (uploadedById && !uploadedBy)
      throw new NotFoundException('Uploader not found');
    return this.files.save(
      this.files.create({ ...data, size: String(size), uploadedBy }),
    );
  }

  findAll(entityType?: string, entityId?: number) {
    return this.files.find({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      relations: { uploadedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const file = await this.files.findOne({
      where: { id },
      relations: { uploadedBy: true },
    });
    if (!file) throw new NotFoundException('File metadata not found');
    return file;
  }

  async update(id: number, dto: UpdateFileDto) {
    const file = await this.findOne(id);
    const { uploadedById, size, ...data } = dto;
    Object.assign(file, data);
    if (size !== undefined) file.size = String(size);
    if (uploadedById !== undefined) {
      const user = await this.users.findOneBy({ id: uploadedById });
      if (!user) throw new NotFoundException('Uploader not found');
      file.uploadedBy = user;
    }
    return this.files.save(file);
  }

  async remove(id: number) {
    const result = await this.files.delete(id);
    if (!result.affected)
      throw new NotFoundException('File metadata not found');
    return { message: 'File metadata deleted successfully' };
  }
}
