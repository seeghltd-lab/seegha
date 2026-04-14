import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { EmployeeAuthService } from './employee-auth.service';
import { EmployeeAuthGuard } from '../../../Guards/employee-auth.guard';
import { AdminAuthGuard } from '../../../Guards/admin-auth.guard';
import { EmployeeUploadConfig } from '../../../common/utils/file-upload.util';
import { RequestWithEmployee } from '../../../common/interfaces/request-employee.interface';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as
    | 'none'
    | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('employee-auth')
export class EmployeeAuthController {
  constructor(private readonly employeeAuthService: EmployeeAuthService) {}

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.employeeAuthService.employeeLogin(body);
    res.cookie('AccessEmployeeToken', result.token, COOKIE_OPTIONS);
    return { employee: result.employee, message: 'Login successful' };
  }

  @Post('logout')
  @UseGuards(EmployeeAuthGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('AccessEmployeeToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  @UseGuards(EmployeeAuthGuard)
  async getProfile(@Req() req: RequestWithEmployee) {
    return this.employeeAuthService.getProfile(req.employee!.id);
  }

  @Patch('change-password')
  @UseGuards(EmployeeAuthGuard)
  async changePassword(@Req() req: RequestWithEmployee, @Body() body: any) {
    return this.employeeAuthService.changePassword(req.employee!.id, body);
  }

  @Post('lock')
  @UseGuards(AdminAuthGuard)
  async lockEmployee(@Body() body: { employeeId: string }) {
    return this.employeeAuthService.lockEmployee(body.employeeId);
  }

  @Post('unlock')
  @UseGuards(AdminAuthGuard)
  async unlockEmployee(@Body() body: { employeeId: string }) {
    return this.employeeAuthService.unlockEmployee(body.employeeId);
  }

  @Put('profile')
  @UseGuards(EmployeeAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'profileImg', maxCount: 1 }], EmployeeUploadConfig),
  )
  async updateProfile(
    @Req() req: RequestWithEmployee,
    @Body() body: any,
    @UploadedFiles() files: { profileImg?: any[] },
  ) {
    const profilePicture = files?.profileImg?.[0]
      ? `uploads/profile/${files.profileImg[0].filename}`
      : undefined;

    return this.employeeAuthService.updateProfile(req.employee!.id, {
      ...body,
      profilePicture,
    });
  }
}
