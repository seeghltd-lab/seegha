import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SiteService, CreateSiteDto } from './site.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

mkdirSync('./uploads/sites', { recursive: true });

const siteImageStorage = diskStorage({
  destination: './uploads/sites',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `site-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('sites')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Post()
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('image', { storage: siteImageStorage }))
  async create(
    @Body() data: CreateSiteDto,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const adminId = req.admin?.id;
    const siteData = { ...data };
    if (file) {
      siteData.image = `/uploads/sites/${file.filename}`;
    }
    return this.siteService.create(siteData, adminId);
  }

  @Get()
  @UseGuards(DualAuthGuard)
  async findAll(@Req() req: any, @Query() filters: any) {
    const adminId = req.admin?.id;
    return this.siteService.findAll(adminId, filters);
  }

  @Get('stats')
  @UseGuards(AdminAuthGuard)
  async getStats(@Req() req: any) {
    const adminId = req.admin?.id;
    return this.siteService.getStats(adminId);
  }

  @Get(':id')
  @UseGuards(DualAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.siteService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('image', { storage: siteImageStorage }))
  async update(
    @Param('id') id: string,
    @Body() data: Partial<CreateSiteDto>,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const siteData = { ...data };
    if (file) {
      siteData.image = `/uploads/sites/${file.filename}`;
    }
    return this.siteService.update(id, siteData);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async remove(@Param('id') id: string) {
    return this.siteService.remove(id);
  }
}
