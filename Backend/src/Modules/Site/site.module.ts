import { Module } from '@nestjs/common';
import { SiteService } from './site.service';
import { SiteController } from './site.controller';
import { PrismaModule } from '../../Prisma/prisma.module';
import { ActivityLogModule } from '../ActivityLog/activity-log.module';

@Module({
  imports: [PrismaModule, ActivityLogModule],
  controllers: [SiteController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
