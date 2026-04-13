import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { PushNotificationModule } from '../PushNotification/push-notification.module';

@Module({
  imports: [PushNotificationModule],
  controllers: [NotificationController],
  providers: [NotificationService, DualAuthGuard, AdminAuthGuard],
  exports: [NotificationService],
})
export class NotificationModule {}
