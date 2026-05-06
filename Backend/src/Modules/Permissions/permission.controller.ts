import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Controller('permissions')
@UseGuards(DualAuthGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  async create(@Body() body: { name: string; description?: string }, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.permissionService.createPermission(body, callerId, callerName);
  }

  @Get()
  async findAll() {
    return this.permissionService.findAll();
  }

  @Get('employee/:id')
  async getByEmployee(@Param('id') employeeId: string) {
    return this.permissionService.getPermissionsByEmployee(employeeId);
  }

  @Get('by-permission/:id')
  async getByPermission(@Param('id') permissionId: string) {
    return this.permissionService.getEmployeesByPermission(permissionId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.permissionService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
    @Req() req: any,
  ) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.permissionService.updatePermission(id, body, callerId, callerName);
  }

  @Post('assign')
  async assign(@Body() body: { employeeId: string; permissionId: string }, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.permissionService.assignPermission(body.employeeId, body.permissionId, callerId, callerName);
  }

  @Delete('remove')
  async remove(@Body() body: { employeeId: string; permissionId: string }, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.permissionService.removePermission(body.employeeId, body.permissionId, callerId, callerName);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.permissionService.deletePermission(id, callerId, callerName);
  }
}
