import { Module } from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import { RequisitionController } from './requisition.controller';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { EmployeeAuthGuard } from '../../Guards/employee-auth.guard';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { NotificationModule } from '../Notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [RequisitionController],
  providers: [RequisitionService, AdminAuthGuard, EmployeeAuthGuard, DualAuthGuard],
  exports: [RequisitionService],
})
export class RequisitionModule {}
