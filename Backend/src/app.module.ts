import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './Prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { EmailModule } from './Global/email/email.module';
import { SocketModule } from './Global/socket/socket.module';
import { AdminModule } from './Modules/Admin/admin.module';
import { EmployeeModule } from './Modules/Employee/employee.module';
import { PermissionModule } from './Modules/Permissions/permission.module';
import { PushNotificationModule } from './Modules/PushNotification/push-notification.module';
import { NotificationModule } from './Modules/Notification/notification.module';
import { StockModule } from './Modules/Stock/stock.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 400 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    EmailModule,
    SocketModule,
    AdminModule,
    EmployeeModule,
    PermissionModule,
    PushNotificationModule,
    NotificationModule,
    StockModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
