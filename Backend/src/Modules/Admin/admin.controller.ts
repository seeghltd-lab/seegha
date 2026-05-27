import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { RolesGuard } from '../../Guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithAdmin } from '../../common/interfaces/request-admin.interface';
import { CloudinaryService, CLOUDINARY_FOLDERS } from '../../Global/cloudinary/cloudinary.service';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('admin-auth')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.adminService.registerAdmin(body);
  }

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.adminService.adminLogin(body);
    res.cookie('AccessAdminToken', result.token, COOKIE_OPTIONS);
    return { admin: result.admin, message: 'Login successful' };
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('AccessAdminToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  @UseGuards(AdminAuthGuard)
  async getProfile(@Req() req: RequestWithAdmin) {
    return this.adminService.getProfile(req.admin!.id);
  }

  @Put('edit-profile')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('profilePicture', { storage: memoryStorage() }))
  async editProfile(
    @Req() req: RequestWithAdmin,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let profilePicture: string | undefined;
    if (file) {
      const result = await this.cloudinary.uploadImageFromBuffer(
        file.buffer,
        CLOUDINARY_FOLDERS.profile,
      );
      profilePicture = result.secure_url;

      // Delete old profile picture from Cloudinary if it exists
      const current = await this.adminService.getProfile(req.admin!.id);
      if (current.profilePicture) {
        this.cloudinary.deleteByUrl(current.profilePicture, 'image');
      }
    }

    return this.adminService.editProfile(req.admin!.id, { ...body, profilePicture });
  }

  @Patch('change-password')
  @UseGuards(AdminAuthGuard)
  async changePassword(@Req() req: RequestWithAdmin, @Body() body: any) {
    return this.adminService.changePassword(req.admin!.id, body);
  }

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  async getDashboard(
    @Req() req: RequestWithAdmin,
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getDashboard(req.admin!.id, period, from, to);
  }

  @Get('all')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  async getAllAdmins() {
    return this.adminService.getAllAdmins();
  }
}
