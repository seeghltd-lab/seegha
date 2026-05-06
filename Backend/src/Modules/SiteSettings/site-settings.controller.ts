import {
  Body,
  Controller,
  Get,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SiteSettingsService, siteLogoStorage } from './site-settings.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  getAll() {
    return this.siteSettingsService.getAll();
  }

  @Put()
  @UseGuards(DualAuthGuard)
  update(@Body() body: Record<string, string>) {
    return this.siteSettingsService.updateMany(body);
  }

  @Put('logo')
  @UseGuards(DualAuthGuard)
  @UseInterceptors(FileInterceptor('logo', { storage: siteLogoStorage }))
  uploadLogo(@UploadedFile() file: any) {
    return this.siteSettingsService.updateLogo(`/uploads/site/${file.filename}`);
  }
}
