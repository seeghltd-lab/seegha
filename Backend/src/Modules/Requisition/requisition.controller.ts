import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Controller('requisitions')
export class RequisitionController {
  constructor(private readonly requisitionService: RequisitionService) {}

  @Post()
  @UseGuards(DualAuthGuard)
  create(@Body() body: any, @Req() req: any) {
    const isAdmin = !!req.admin;
    const creator = isAdmin
      ? { type: 'ADMIN' as const, id: req.admin.id, name: req.admin.names || req.admin.email || 'Admin' }
      : { type: 'EMPLOYEE' as const, id: req.employee.id, name: `${req.employee.firstName ?? ''} ${req.employee.lastName ?? ''}`.trim() || req.employee.email };
    const payload = isAdmin ? { ...body, employeeId: body.employeeId || null } : { ...body, employeeId: req.employee.id };
    return this.requisitionService.create(payload, creator);
  }

  @Get()
  @UseGuards(DualAuthGuard)
  findAll(@Query() query: any, @Req() req: any) {
    const role: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerId = req.admin?.id ?? req.employee?.id;
    return this.requisitionService.findAll(query, callerId, role);
  }

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

  @Put(':id')
  @UseGuards(DualAuthGuard)
  update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    if (!req.admin) {
      throw new ForbiddenException('Admin access required');
    }
    return this.requisitionService.updateRequisition(id, req.admin.id, body);
  }

  @Put(':id/approve')
  @UseGuards(DualAuthGuard)
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
  @UseGuards(DualAuthGuard)
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
