import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Module({
  controllers: [PermissionController],
  providers: [PermissionService, AdminAuthGuard, DualAuthGuard],
  exports: [PermissionService],
})
export class PermissionModule {}
