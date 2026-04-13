import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { UserType } from '@prisma/client';

@Controller('push-notifications')
@UseGuards(DualAuthGuard)
export class PushNotificationController {
  constructor(private readonly pushService: PushNotificationService) {}

  @Post('subscribe')
  async subscribe(
    @Body()
    body: {
      userId: string;
      type: UserType;
      subscription: { endpoint: string; p256dh: string; auth: string };
      label?: string;
    },
  ) {
    return this.pushService.subscribe(
      body.userId,
      body.type,
      body.subscription,
      body.label,
    );
  }

  @Delete('unsubscribe/device')
  async unsubscribeDevice(
    @Body()
    body: {
      userId: string;
      type: UserType;
      endpoint: string;
    },
  ) {
    return this.pushService.unsubscribeDevice(
      body.userId,
      body.type,
      body.endpoint,
    );
  }

  @Delete('unsubscribe/all')
  async unsubscribeAll(@Body() body: { userId: string; type: UserType }) {
    return this.pushService.unsubscribeAllDevices(body.userId, body.type);
  }

  @Get('subscriptions')
  async getSubscriptions(@Body() body: { userId: string; type: UserType }) {
    return this.pushService.getSubscriptions(body.userId, body.type);
  }
}
