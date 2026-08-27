import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Announcement } from '../announcement/entities/announcement.entity';
import { AuctionResult } from '../auction-result/entities/auction-result.entity';
import { Contract } from '../contract/entities/contract.entity';
import { Regulation } from '../regulation/entities/regulation.entity';
import { FileStatus } from '../shared/enums/file.enum';
import {
  CreatePresignedUploadDto,
  FileEntityType,
  QueryFileDto,
  // TestUploadFile,
} from './dto/file.dto';
import { FileEntity } from './entity/file.entity';

const MAX_FILE_SIZE = 25 * 1024 * 1024;

@Injectable()
export class UploadFileServiceS3 {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(
    @InjectRepository(FileEntity)
    private readonly files: Repository<FileEntity>,
    @InjectRepository(Contract)
    private readonly contracts: Repository<Contract>,
    @InjectRepository(Regulation)
    private readonly regulations: Repository<Regulation>,
    @InjectRepository(Announcement)
    private readonly announcements: Repository<Announcement>,
    @InjectRepository(AuctionResult)
    private readonly auctionResults: Repository<AuctionResult>,
  ) {
    this.bucketName =
      process.env.AWS_S3_BUCKET_NAME ?? process.env.AWS_S3_PUBLIC_BUCKET ?? '';
    const accessKeyId =
      process.env.AWS_ACCESS_KEY_ID ?? process.env.AWS_S3_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY ?? process.env.AWS_S3_SECRET_ACCESS_KEY;
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION ?? process.env.AWS_S3_REGION,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  async createPresignedUpload(dto: CreatePresignedUploadDto) {
    this.ensureConfigured();
    if (dto.fileSize > MAX_FILE_SIZE)
      throw new BadRequestException('File  must not larger than 25mb');
    const relation = await this.entityRelation(dto.entityType, dto.entityId);
    const safeName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!safeName) throw new BadRequestException('fileName is invalid');
    const s3Key = `${dto.entityType.toLowerCase()}s/${Date.now()}-${randomUUID()}-${safeName}`;
    const file = await this.files.save(
      this.files.create({
        s3Key,
        s3Bucket: this.bucketName,
        originalName: dto.fileName,
        mimeType: dto.fileType,
        fileSize: 0,
        status: FileStatus.PENDING,
        contract: null,
        regulation: null,
        announcement: null,
        auctionResult: null,
        liquidationId: null,
        ...relation,
      }),
    );
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: dto.fileType,
    });
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 15 * 60,
    });
    return { fileId: file.id, uploadUrl, s3Key };
  }

  // async testUpload(file: TestUploadFile) {
  //   this.ensureConfigured();
  //   const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  //   const s3Key = `test-uploads/${Date.now()}-${randomUUID()}-${safeName}`;
  //   await this.s3Client.send(
  //     new PutObjectCommand({
  //       Bucket: this.bucketName,
  //       Key: s3Key,
  //       Body: file.buffer,
  //       ContentType: file.mimetype,
  //     }),
  //   );
  //   const downloadUrl = await getSignedUrl(
  //     this.s3Client,
  //     new GetObjectCommand({ Bucket: this.bucketName, Key: s3Key }),
  //     { expiresIn: 60 * 60 },
  //   );
  //   return {
  //     originalName: file.originalname,
  //     mimeType: file.mimetype,
  //     fileSize: file.size,
  //     s3Bucket: this.bucketName,
  //     s3Key,
  //     downloadUrl,
  //   };
  // }

  async confirm(id: number) {
    const file = await this.activeOrPending(id);
    if (file.status === FileStatus.ACTIVE) return file;
    try {
      const result = await this.s3Client.send(
        new HeadObjectCommand({ Bucket: file.s3Bucket, Key: file.s3Key }),
      );
      if (result.ContentType && result.ContentType !== file.mimeType)
        throw new BadRequestException(
          'Uploaded object content type does not match',
        );
      const fileSize = Number(result.ContentLength ?? 0);
      if (fileSize > MAX_FILE_SIZE)
        throw new BadRequestException('File  must not larger than 25mb');
      file.fileSize = fileSize;
      file.status = FileStatus.ACTIVE;
      return this.files.save(file);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Uploaded object was not found on S3');
    }
  }

  async findAll(query: QueryFileDto) {
    if (query.entityId !== undefined && !query.entityType)
      throw new BadRequestException('entityType is required with entityId');
    const builder = this.files
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.contract', 'contract')
      .leftJoinAndSelect('file.regulation', 'regulation')
      .leftJoinAndSelect('file.announcement', 'announcement')
      .leftJoinAndSelect('file.auctionResult', 'auctionResult')
      .where('file.status != :deleted', { deleted: FileStatus.DELETED });
    if (query.entityType && query.entityId === undefined)
      builder.andWhere(
        `file.${this.relationColumn(query.entityType)} IS NOT NULL`,
      );
    if (query.entityType && query.entityId !== undefined)
      builder.andWhere(
        `file.${this.relationColumn(query.entityType)} = :entityId`,
        {
          entityId: query.entityId,
        },
      );
    const [items, total] = await builder
      .orderBy(
        'file.created_at',
        query.sortOrder.toUpperCase() as 'ASC' | 'DESC',
      )
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: number) {
    const file = await this.activeOrPending(id);
    return { ...file, downloadUrl: await this.downloadUrl(file) };
  }

  async remove(id: number) {
    const file = await this.activeOrPending(id);
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: file.s3Bucket, Key: file.s3Key }),
    );
    file.status = FileStatus.DELETED;
    await this.files.save(file);
    return { message: 'File deleted successfully' };
  }

  async activeFiles(entityType: FileEntityType, entityId: number) {
    const files = await this.files
      .createQueryBuilder('file')
      .where('file.status = :status', { status: FileStatus.ACTIVE })
      .andWhere(`file.${this.relationColumn(entityType)} = :entityId`, {
        entityId,
      })
      .orderBy('file.created_at', 'DESC')
      .getMany();
    return Promise.all(
      files.map(async (file) => ({
        ...file,
        downloadUrl: await this.downloadUrl(file),
      })),
    );
  }

  private async downloadUrl(file: FileEntity) {
    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({ Bucket: file.s3Bucket, Key: file.s3Key }),
      { expiresIn: 60 * 60 },
    );
  }

  private async activeOrPending(id: number) {
    const file = await this.files.findOne({
      where: { id },
      relations: {
        contract: true,
        regulation: true,
        announcement: true,
        auctionResult: true,
      },
    });
    if (!file || file.status === FileStatus.DELETED)
      throw new NotFoundException('File not found');
    return file;
  }

  private async entityRelation(type: FileEntityType, id: number) {
    if (type === FileEntityType.CONTRACT) {
      const contract = await this.contracts.findOneBy({ id });
      if (!contract) throw new NotFoundException('Contract not found');
      return { contract };
    }
    if (type === FileEntityType.REGULATION) {
      const regulation = await this.regulations.findOneBy({ id });
      if (!regulation) throw new NotFoundException('Regulation not found');
      return { regulation };
    }
    if (type === FileEntityType.ANNOUNCEMENT) {
      const announcement = await this.announcements.findOneBy({ id });
      if (!announcement) throw new NotFoundException('Announcement not found');
      return { announcement };
    }
    if (type === FileEntityType.AUCTION_RESULT) {
      const auctionResult = await this.auctionResults.findOneBy({ id });
      if (!auctionResult)
        throw new NotFoundException('Auction result not found');
      return { auctionResult };
    }
    throw new BadRequestException(
      'LIQUIDATION is unavailable because this project has no Liquidation entity',
    );
  }

  private relationColumn(type: FileEntityType) {
    return (
      {
        [FileEntityType.CONTRACT]: 'contract_id',
        [FileEntityType.REGULATION]: 'regulation_id',
        [FileEntityType.ANNOUNCEMENT]: 'announcement_id',
        [FileEntityType.AUCTION_RESULT]: 'auction_result_id',
        [FileEntityType.LIQUIDATION]: 'liquidation_id',
      } as const
    )[type];
  }

  private ensureConfigured() {
    if (!this.bucketName)
      throw new ServiceUnavailableException('S3 bucket is not configured');
  }
}
