import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import * as webpush from 'web-push';
import { UserType } from '@prisma/client';

type WebPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

@Injectable()
export class PushNotificationService {
  constructor(private readonly prisma: PrismaService) {
    webpush.setVapidDetails(
      process.env.VAPID_MAILTO ?? 'mailto:admin@stockapp.com',
      process.env.VAPID_PUBLIC_KEY ?? '',
      process.env.VAPID_PRIVATE_KEY ?? '',
    );
  }

  async subscribe(
    userId: string,
    type: UserType,
    subscription: WebPushSubscription,
    label?: string,
  ) {
    const existing = await this.prisma.pushSubscription.findFirst({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      return await this.prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          userId,
          type,
          label,
        },
      });
    }

    return await this.prisma.pushSubscription.create({
      data: {
        userId,
        type,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        label,
      },
    });
  }

  async unsubscribeDevice(userId: string, type: UserType, endpoint: string) {
    const sub = await this.prisma.pushSubscription.findFirst({
      where: { endpoint },
    });

    if (!sub || sub.userId !== userId || sub.type !== type) {
      throw new NotFoundException('Subscription not found for this device');
    }

    await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
    return { success: true, message: 'Device unsubscribed successfully' };
  }

  async unsubscribeAllDevices(userId: string, type: UserType) {
    const deleted = await this.prisma.pushSubscription.deleteMany({
      where: { userId, type },
    });
    return {
      success: true,
      message: `Unsubscribed ${deleted.count} devices`,
    };
  }

  async sendToUser(userId: string, type: UserType, payload: any) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId, type },
    });

    if (!subscriptions.length) {
      return { success: false, message: 'No subscriptions found' };
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
          return { success: true };
        } catch (error: any) {
          if (error?.statusCode === 410) {
            await this.prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => {});
          }
          throw error;
        }
      }),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    return { success: true, sent: successful, total: subscriptions.length };
  }

  async sendToAll(type: UserType, payload: any) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { type },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
          return { success: true };
        } catch (error: any) {
          if (error?.statusCode === 410) {
            await this.prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => {});
          }
          throw error;
        }
      }),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    return { success: true, sent: successful, total: subscriptions.length };
  }

  async getSubscriptions(userId: string, type: UserType) {
    return this.prisma.pushSubscription.findMany({ where: { userId, type } });
  }

  async getTotalSubscriptions(type?: UserType) {
    return this.prisma.pushSubscription.count({
      where: type ? { type } : {},
    });
  }
}
