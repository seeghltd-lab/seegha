import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { SenderType } from '@prisma/client';

@Controller('notifications')
@UseGuards(DualAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    const senderId = req.admin?.id ?? req.employee?.id;
    const senderType: SenderType = req.admin ? 'ADMIN' : 'EMPLOYEE';
    return this.notificationService.createNotification({ ...body, senderId, senderType });
  }

  @Get()
  async getNotifications(
    @Query('recipientId') recipientId: string,
    @Query('recipientType') recipientType: 'ADMIN' | 'EMPLOYEE',
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
  ) {
    return this.notificationService.getNotificationsForRecipient(
      recipientId,
      recipientType,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      search,
    );
  }

  @Get('unread-count')
  async getUnreadCount(
    @Query('recipientId') recipientId: string,
    @Query('recipientType') recipientType: 'ADMIN' | 'EMPLOYEE',
  ) {
    return this.notificationService.getUnreadCount(recipientId, recipientType);
  }

  @Put('read-all')
  async markAllAsRead(
    @Query('recipientId') recipientId: string,
    @Query('recipientType') recipientType: 'ADMIN' | 'EMPLOYEE',
  ) {
    return this.notificationService.markAllAsRead(recipientId, recipientType);
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const recipientId = req.admin?.id ?? req.employee?.id;
    return this.notificationService.markAsRead(id, recipientId);
  }
}
