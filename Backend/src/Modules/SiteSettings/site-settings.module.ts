import { Module } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';
import { SiteSettingsController } from './site-settings.controller';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';

@Module({
  controllers: [SiteSettingsController],
  providers: [SiteSettingsService, AdminAuthGuard],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
