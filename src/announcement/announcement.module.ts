import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from './entities/announcement.entity';
import { Contract } from '../contract/entities/contract.entity';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Announcement, Contract])],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [TypeOrmModule],
})
export class AnnouncementModule {}
