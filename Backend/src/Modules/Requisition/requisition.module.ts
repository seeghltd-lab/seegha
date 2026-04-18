import { Module } from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import { RequisitionController } from './requisition.controller';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { EmployeePermissionGuard } from '../../Guards/employee-permission.guard';
import { NotificationModule } from '../Notification/notification.module';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [NotificationModule],
  controllers: [RequisitionController],
  providers: [RequisitionService, DualAuthGuard, EmployeePermissionGuard, Reflector],
  exports: [RequisitionService],
})
export class RequisitionModule {}
