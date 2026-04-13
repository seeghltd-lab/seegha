import { Module } from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';
import { PushNotificationController } from './push-notification.controller';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Module({
  controllers: [PushNotificationController],
  providers: [PushNotificationService, DualAuthGuard],
  exports: [PushNotificationService],
})
export class PushNotificationModule {}
