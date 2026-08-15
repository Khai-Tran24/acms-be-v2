import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from '../announcement/entities/announcement.entity';
import { AuthModule } from '../auth/auth.module';
import { Contract } from '../contract/entities/contract.entity';
import { Regulation } from '../regulation/entities/regulation.entity';
import { FileEntity } from './entity/file.entity';
import { UploadFileController } from './upload-file.controller';
import { UploadFileServiceS3 } from './upload-file.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([FileEntity, Contract, Regulation, Announcement]),
  ],
  controllers: [UploadFileController],
  providers: [UploadFileServiceS3],
  exports: [UploadFileServiceS3],
})
export class UploadFileModule {}
