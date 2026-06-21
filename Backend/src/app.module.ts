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
import { SupplierModule } from './Modules/Supplier/supplier.module';
import { CategoryModule } from './Modules/Category/category.module';
import { SiteSettingsModule } from './Modules/SiteSettings/site-settings.module';
import { SiteModule } from './Modules/Site/site.module';
import { StockMigrationModule } from './Modules/StockMigration/stock-migration.module';
import { RequisitionModule } from './Modules/Requisition/requisition.module';
import { UnitModule } from './Modules/Unit/unit.module';
import { ActivityLogModule } from './Modules/ActivityLog/activity-log.module';
import { WorkerCategoryModule } from './Modules/WorkerCategory/worker-category.module';
import { CloudinaryModule } from './Global/cloudinary/cloudinary.module';

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
    SupplierModule,
    CategoryModule,
    SiteSettingsModule,
    SiteModule,
    StockMigrationModule,
    RequisitionModule,
    UnitModule,
    ActivityLogModule,
    WorkerCategoryModule,
    CloudinaryModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
