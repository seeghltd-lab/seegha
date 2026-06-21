import { Module } from '@nestjs/common';
import { StockMigrationService } from './stock-migration.service';
import { StockMigrationController } from './stock-migration.controller';
import { PrismaModule } from '../../Prisma/prisma.module';
import { ActivityLogModule } from '../ActivityLog/activity-log.module';
import { NotificationModule } from '../Notification/notification.module';

@Module({
  imports: [PrismaModule, ActivityLogModule, NotificationModule],
  controllers: [StockMigrationController],
  providers: [StockMigrationService],
  exports: [StockMigrationService],
})
export class StockMigrationModule {}
