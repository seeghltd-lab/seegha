import { Module } from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import { RequisitionController } from './requisition.controller';
import { NotificationModule } from '../Notification/notification.module';
import { ActivityLogModule } from '../ActivityLog/activity-log.module';

@Module({
  imports: [NotificationModule, ActivityLogModule],
  controllers: [RequisitionController],
  providers: [RequisitionService],
  exports: [RequisitionService],
})
export class RequisitionModule {}
