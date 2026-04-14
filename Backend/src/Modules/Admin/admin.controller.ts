import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { Response } from 'express';

mkdirSync('./uploads/admin', { recursive: true });

const adminAvatarStorage = diskStorage({
  destination: './uploads/admin',
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `admin-${unique}${extname(file.originalname)}`);
  },
});
import { AdminService } from './admin.service';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { RolesGuard } from '../../Guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithAdmin } from '../../common/interfaces/request-admin.interface';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as
    | 'none'
    | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('admin-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
  @UseInterceptors(FileInterceptor('profilePicture', { storage: adminAvatarStorage }))
  async editProfile(
    @Req() req: RequestWithAdmin,
    @Body() body: any,
    @UploadedFile() file?: any,
  ) {
    const profilePicture = file ? `/uploads/admin/${file.filename}` : undefined;
    return this.adminService.editProfile(req.admin!.id, { ...body, profilePicture });
  }

  @Patch('change-password')
  @UseGuards(AdminAuthGuard)
  async changePassword(@Req() req: RequestWithAdmin, @Body() body: any) {
    return this.adminService.changePassword(req.admin!.id, body);
  }

  @Get('all')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  async getAllAdmins() {
    return this.adminService.getAllAdmins();
  }
}
