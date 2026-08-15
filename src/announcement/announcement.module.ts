import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from './entities/announcement.entity';
import { Contract } from '../contract/entities/contract.entity';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import { AuthModule } from '../auth/auth.module';
import { UploadFileModule } from '../file/upload-file.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Announcement, Contract]),
    UploadFileModule,
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [TypeOrmModule],
})
export class AnnouncementModule {}
