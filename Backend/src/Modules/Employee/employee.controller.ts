import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { EmployeeService } from './employee.service';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { EmployeeUploadConfig } from '../../common/utils/file-upload.util';

@Controller('employees')
@UseGuards(AdminAuthGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'profileImg', maxCount: 1 }], EmployeeUploadConfig),
  )
  async create(
    @Body() body: any,
    @UploadedFiles() files: { profileImg?: any[] },
    @Req() req: any,
  ) {
    const profilePicture = files?.profileImg?.[0]
      ? `uploads/profile/${files.profileImg[0].filename}`
      : undefined;

    return this.employeeService.create(
      { ...body, profilePicture },
      req.admin?.id,
      req.admin?.names ?? req.admin?.email,
    );
  }

  @Get()
  async findAll() {
    return this.employeeService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'profileImg', maxCount: 1 }], EmployeeUploadConfig),
  )
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files: { profileImg?: any[] },
    @Req() req: any,
  ) {
    const profilePicture = files?.profileImg?.[0]
      ? `uploads/profile/${files.profileImg[0].filename}`
      : undefined;

    return this.employeeService.update(
      id,
      { ...body, profilePicture },
      req.admin?.id,
      req.admin?.names ?? req.admin?.email,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.employeeService.remove(id, req.admin?.id, req.admin?.names ?? req.admin?.email);
  }
}
