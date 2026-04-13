import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
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
  async editProfile(@Req() req: RequestWithAdmin, @Body() body: any) {
    return this.adminService.editProfile(req.admin!.id, body);
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
