import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { AppSocketGateway } from '../../Global/socket/socket.gateway';
import { PushNotificationService } from '../PushNotification/push-notification.service';
import { SenderType } from '@prisma/client';

type Recipient = { id: string; type: 'ADMIN' | 'EMPLOYEE'; read: boolean };

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: AppSocketGateway,
    private readonly push: PushNotificationService,
  ) {}

  async createNotification(data: {
    recipients: { id: string; type: 'ADMIN' | 'EMPLOYEE' }[];
    title: string;
    message: string;
    link?: string;
    senderId?: string;
    senderType?: SenderType;
  }) {
    const recipients: Recipient[] = data.recipients.map((r) => ({
      ...r,
      read: false,
    }));

    const notification = await this.prisma.notification.create({
      data: {
        recipients,
        title: data.title,
        message: data.message,
        link: data.link,
        senderId: data.senderId,
        senderType: data.senderType,
      },
    });

    // Emit to connected sockets
    this.socket.emitToRecipients(
      data.recipients as { id: string; type: 'ADMIN' | 'EMPLOYEE' }[],
      'new-notification',
      notification,
    );

    // Send push notifications
    for (const recipient of data.recipients) {
      const pushType = recipient.type === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
      this.push
        .sendToUser(recipient.id, pushType as any, {
          title: data.title,
          message: data.message,
          data: { url: data.link },
        })
        .catch(() => {});
    }

    return notification;
  }

  async getNotificationsForRecipient(
    recipientId: string,
    recipientType: 'ADMIN' | 'EMPLOYEE',
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const allNotifications = await this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Filter in-memory (recipients is a JSON array)
    let filtered = allNotifications.filter((n) => {
      const recipients = n.recipients as Recipient[];
      return recipients.some(
        (r) => r.id === recipientId && r.type === recipientType,
      );
    });

    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(lower) ||
          n.message.toLowerCase().includes(lower),
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    // Attach read status per recipient
    const withReadStatus = paginated.map((n) => {
      const recipients = n.recipients as Recipient[];
      const recipientData = recipients.find(
        (r) => r.id === recipientId && r.type === recipientType,
      );
      return { ...n, read: recipientData?.read ?? false };
    });

    return {
      notifications: withReadStatus,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(notificationId: string, recipientId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) return null;

    const recipients = notification.recipients as Recipient[];
    const updated = recipients.map((r) =>
      r.id === recipientId ? { ...r, read: true } : r,
    );

    const result = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { recipients: updated },
    });

    // Emit read event to all sessions of this recipient
    this.socket.emitToAdmin(recipientId, 'notification-read', {
      notificationId,
    });
    this.socket.emitToEmployee(recipientId, 'notification-read', {
      notificationId,
    });

    return result;
  }

  async markAllAsRead(recipientId: string, recipientType: 'ADMIN' | 'EMPLOYEE') {
    const all = await this.prisma.notification.findMany();

    const toUpdate = all.filter((n) => {
      const recipients = n.recipients as Recipient[];
      return recipients.some(
        (r) => r.id === recipientId && r.type === recipientType && !r.read,
      );
    });

    await Promise.all(
      toUpdate.map((n) => {
        const recipients = (n.recipients as Recipient[]).map((r) =>
          r.id === recipientId && r.type === recipientType ? { ...r, read: true } : r,
        );
        return this.prisma.notification.update({ where: { id: n.id }, data: { recipients } });
      }),
    );

    this.socket.emitToAdmin(recipientId, 'notifications-all-read', {});
    this.socket.emitToEmployee(recipientId, 'notifications-all-read', {});

    return { marked: toUpdate.length };
  }

  async getUnreadCount(recipientId: string, recipientType: 'ADMIN' | 'EMPLOYEE') {
    const all = await this.prisma.notification.findMany();
    const unread = all.filter((n) => {
      const recipients = n.recipients as Recipient[];
      return recipients.some(
        (r) => r.id === recipientId && r.type === recipientType && !r.read,
      );
    });
    return { count: unread.length };
  }
}
