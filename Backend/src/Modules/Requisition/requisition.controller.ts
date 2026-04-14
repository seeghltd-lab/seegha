import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

  // Employee creates a requisition
  @Post()
  @UseGuards(EmployeeAuthGuard)
  create(@Body() body: any, @Req() req: any) {
    return this.requisitionService.create(body, req.employee.id);
  }

  // Both admin (sees all) and employee (sees own) list requisitions
  @Get()
  @UseGuards(DualAuthGuard)
  findAll(@Query() query: any, @Req() req: any) {
    const role: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerId = req.admin?.id ?? req.employee?.id;
    return this.requisitionService.findAll(query, callerId, role);
  }

  // Get one requisition detail
  @Get(':id')
  @UseGuards(DualAuthGuard)
  findOne(@Param('id') id: string, @Req() req: any) {
    const role: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerId = req.admin?.id ?? req.employee?.id;
    return this.requisitionService.findOne(id, callerId, role);
  }

  // Admin updates requisition status
  @Patch(':id/status')
  @UseGuards(AdminAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: any; notes?: string },
    @Req() req: any,
  ) {
    return this.requisitionService.updateStatus(id, body.status, req.admin.id, body.notes);
  }

  // Delete: admin anytime, employee only if PENDING
  @Delete(':id')
  @UseGuards(DualAuthGuard)
  remove(@Param('id') id: string, @Req() req: any) {
    const role: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerId = req.admin?.id ?? req.employee?.id;
    return this.requisitionService.remove(id, callerId, role);
  }
}
