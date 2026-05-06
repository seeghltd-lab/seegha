import { Module } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';
import { SiteSettingsController } from './site-settings.controller';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Module({
  controllers: [SiteSettingsController],
  providers: [SiteSettingsService, DualAuthGuard],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
