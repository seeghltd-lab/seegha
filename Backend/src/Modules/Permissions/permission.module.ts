import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { ActivityLogModule } from '../ActivityLog/activity-log.module';

@Module({
  imports: [ActivityLogModule],
  controllers: [PermissionController],
  providers: [PermissionService, DualAuthGuard],
  exports: [PermissionService],
})
export class PermissionModule {}
