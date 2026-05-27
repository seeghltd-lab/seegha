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
import { CloudinaryService, CLOUDINARY_FOLDERS } from '../../Global/cloudinary/cloudinary.service';
import { EmployeeCombinedUploadConfig } from '../../common/utils/file-upload.util';
import * as path from 'path';

type EmployeeFiles = {
  profileImg?: Express.Multer.File[];
  idCardImage?: Express.Multer.File[];
  cvDocument?: Express.Multer.File[];
  supportingDocument?: Express.Multer.File[];
};

@Controller('employees')
@UseGuards(AdminAuthGuard)
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private async uploadFile(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const isDoc = /\.(pdf|doc|docx)$/.test(ext);
    if (isDoc) {
      const result = await this.cloudinary.uploadFileFromBuffer(
        file.buffer,
        CLOUDINARY_FOLDERS.employeeDocs,
        ext.replace('.', ''),
      );
      return result.secure_url;
    }
    const result = await this.cloudinary.uploadImageFromBuffer(
      file.buffer,
      CLOUDINARY_FOLDERS.profile,
    );
    return result.secure_url;
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profileImg', maxCount: 1 },
        { name: 'idCardImage', maxCount: 1 },
        { name: 'cvDocument', maxCount: 1 },
        { name: 'supportingDocument', maxCount: 1 },
      ],
      EmployeeCombinedUploadConfig,
    ),
  )
  async create(
    @Body() body: any,
    @UploadedFiles() files: EmployeeFiles,
    @Req() req: any,
  ) {
    const [profilePicture, idCardImage, cvDocument, supportingDocument] =
      await Promise.all([
        files?.profileImg?.[0]      ? this.uploadFile(files.profileImg[0])      : Promise.resolve(undefined),
        files?.idCardImage?.[0]     ? this.uploadFile(files.idCardImage[0])     : Promise.resolve(undefined),
        files?.cvDocument?.[0]      ? this.uploadFile(files.cvDocument[0])      : Promise.resolve(undefined),
        files?.supportingDocument?.[0] ? this.uploadFile(files.supportingDocument[0]) : Promise.resolve(undefined),
      ]);

    return this.employeeService.create(
      { ...body, profilePicture, idCardImage, cvDocument, supportingDocument },
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
    FileFieldsInterceptor(
      [
        { name: 'profileImg', maxCount: 1 },
        { name: 'idCardImage', maxCount: 1 },
        { name: 'cvDocument', maxCount: 1 },
        { name: 'supportingDocument', maxCount: 1 },
      ],
      EmployeeCombinedUploadConfig,
    ),
  )
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files: EmployeeFiles,
    @Req() req: any,
  ) {
    const [profilePicture, idCardImage, cvDocument, supportingDocument] =
      await Promise.all([
        files?.profileImg?.[0]      ? this.uploadFile(files.profileImg[0])      : Promise.resolve(undefined),
        files?.idCardImage?.[0]     ? this.uploadFile(files.idCardImage[0])     : Promise.resolve(undefined),
        files?.cvDocument?.[0]      ? this.uploadFile(files.cvDocument[0])      : Promise.resolve(undefined),
        files?.supportingDocument?.[0] ? this.uploadFile(files.supportingDocument[0]) : Promise.resolve(undefined),
      ]);

    return this.employeeService.update(
      id,
      { ...body, profilePicture, idCardImage, cvDocument, supportingDocument },
      req.admin?.id,
      req.admin?.names ?? req.admin?.email,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.employeeService.remove(
      id,
      req.admin?.id,
      req.admin?.names ?? req.admin?.email,
    );
  }
}
