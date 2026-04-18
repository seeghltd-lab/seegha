import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { EmployeePermissionGuard } from '../../Guards/employee-permission.guard';

@Controller('requisitions')
export class RequisitionController {
  constructor(private readonly requisitionService: RequisitionService) {}

  @Post()
  @SetMetadata('permission', 'create_requisition')
  @UseGuards(DualAuthGuard, EmployeePermissionGuard)
  create(@Body() body: any, @Req() req: any) {
    const employeeId = req.admin ? body.employeeId : req.employee.id;
    return this.requisitionService.create(body, employeeId);
  }

  @Get()
  @UseGuards(DualAuthGuard)
  findAll(@Query() query: any, @Req() req: any) {
    const role: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerId = req.admin?.id ?? req.employee?.id;
    return this.requisitionService.findAll(query, callerId, role);
  }

  // Must be before /:id to avoid route collision
  @Get(':id/receiving-summary')
  @UseGuards(DualAuthGuard)
  getReceivingSummary(@Param('id') id: string) {
    return this.requisitionService.getReceivingSummary(id);
  }

  @Get(':id')
  @UseGuards(DualAuthGuard)
  findOne(@Param('id') id: string, @Req() req: any) {
    const role: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerId = req.admin?.id ?? req.employee?.id;
    return this.requisitionService.findOne(id, callerId, role);
  }

  @Put(':id/approve')
  @SetMetadata('permission', 'approve_requisition')
  @UseGuards(DualAuthGuard, EmployeePermissionGuard)
  approve(
    @Param('id') id: string,
    @Body() body: { items?: any[]; notes?: string },
    @Req() req: any,
  ) {
    const approverId = req.admin?.id ?? req.employee?.id;
    const approverType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    return this.requisitionService.approveRequisition(id, approverId, approverType, body);
  }

  @Put(':id/reject')
  @SetMetadata('permission', 'approve_requisition')
  @UseGuards(DualAuthGuard, EmployeePermissionGuard)
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    const approverId = req.admin?.id ?? req.employee?.id;
    const approverType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    return this.requisitionService.rejectRequisition(id, approverId, approverType, reason);
  }

  @Put(':id/receive')
  @SetMetadata('permission', 'receive_requisition')
  @UseGuards(DualAuthGuard, EmployeePermissionGuard)
  receiveItems(
    @Param('id') id: string,
    @Body() body: { items: { itemId: string; receivedQty: number; note?: string }[] },
    @Req() req: any,
  ) {
    const isAdmin = !!req.admin;
    const receivedById = req.admin?.id ?? req.employee?.id;
    const receivedByType: 'ADMIN' | 'EMPLOYEE' = isAdmin ? 'ADMIN' : 'EMPLOYEE';
    const receivedByName = isAdmin
      ? (req.admin.names ?? req.admin.email ?? 'Admin')
      : `${req.employee.firstName ?? ''} ${req.employee.lastName ?? ''}`.trim() || req.employee.email;
    return this.requisitionService.receiveItems(id, receivedById, receivedByType, receivedByName, body.items);
  }

  @Delete(':id')
  @UseGuards(DualAuthGuard)
  remove(@Param('id') id: string, @Req() req: any) {
    const role: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerId = req.admin?.id ?? req.employee?.id;
    return this.requisitionService.remove(id, callerId, role);
  }
}
