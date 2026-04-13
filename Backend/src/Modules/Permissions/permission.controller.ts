import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @UseGuards(AdminAuthGuard)
  async create(@Body() body: { name: string; description?: string }) {
    return this.permissionService.createPermission(body);
  }

  @Get()
  @UseGuards(AdminAuthGuard)
  async findAll() {
    return this.permissionService.findAll();
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.permissionService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.permissionService.updatePermission(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async delete(@Param('id') id: string) {
    return this.permissionService.deletePermission(id);
  }

  @Post('assign')
  @UseGuards(AdminAuthGuard)
  async assign(@Body() body: { employeeId: string; permissionId: string }) {
    return this.permissionService.assignPermission(
      body.employeeId,
      body.permissionId,
    );
  }

  @Delete('remove')
  @UseGuards(AdminAuthGuard)
  async remove(@Body() body: { employeeId: string; permissionId: string }) {
    return this.permissionService.removePermission(
      body.employeeId,
      body.permissionId,
    );
  }

  @Get('employee/:id')
  @UseGuards(DualAuthGuard)
  async getByEmployee(@Param('id') employeeId: string) {
    return this.permissionService.getPermissionsByEmployee(employeeId);
  }

  @Get('by-permission/:id')
  @UseGuards(AdminAuthGuard)
  async getByPermission(@Param('id') permissionId: string) {
    return this.permissionService.getEmployeesByPermission(permissionId);
  }
}
