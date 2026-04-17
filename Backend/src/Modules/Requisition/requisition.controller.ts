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
  UseGuards,
} from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { EmployeeAuthGuard } from '../../Guards/employee-auth.guard';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Controller('requisitions')
export class RequisitionController {
  constructor(private readonly requisitionService: RequisitionService) {}

  @Post()
  @UseGuards(EmployeeAuthGuard)
  create(@Body() body: any, @Req() req: any) {
    return this.requisitionService.create(body, req.employee.id);
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
  @UseGuards(AdminAuthGuard)
  approve(
    @Param('id') id: string,
    @Body() body: { items?: any[]; notes?: string },
    @Req() req: any,
  ) {
    return this.requisitionService.approveRequisition(id, req.admin.id, body);
  }

  @Put(':id/reject')
  @UseGuards(AdminAuthGuard)
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.requisitionService.rejectRequisition(id, req.admin.id, reason);
  }

  @Put(':id/receive')
  @UseGuards(DualAuthGuard)
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
