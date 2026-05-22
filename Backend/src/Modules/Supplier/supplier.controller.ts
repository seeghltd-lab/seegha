import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { SupplierStatus } from '@prisma/client';

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @UseGuards(DualAuthGuard)
  create(@Body() body: any, @Req() req: any) {
    const isAdmin = !!req.admin;
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    const callerType: 'ADMIN' | 'EMPLOYEE' = isAdmin ? 'ADMIN' : 'EMPLOYEE';
    return this.supplierService.create(body, callerId, callerName, callerType);
  }

  @Put(':id')
  @UseGuards(DualAuthGuard)
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.supplierService.update(id, body, callerId, callerName);
  }

  @Delete(':id')
  @UseGuards(DualAuthGuard)
  remove(@Param('id') id: string, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.supplierService.remove(id, callerId, callerName);
  }

  @Post(':id/payments')
  @UseGuards(DualAuthGuard)
  addPayment(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    return this.supplierService.addPayment(id, body, callerId);
  }

  @Patch(':id/payments/:paymentId')
  @UseGuards(DualAuthGuard)
  updatePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() body: any,
  ) {
    return this.supplierService.updatePayment(id, paymentId, body);
  }

  @Delete(':id/payments/:paymentId')
  @UseGuards(DualAuthGuard)
  deletePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Req() req: any,
  ) {
    const adminId = req.admin?.id ?? req.employee?.id;
    const adminName = req.admin?.names ?? req.admin?.email ?? '';
    return this.supplierService.deletePayment(id, paymentId, adminId, adminName);
  }

  @Get('select')
  @UseGuards(DualAuthGuard)
  findForSelect(@Req() req: any) {
    return this.supplierService.findForSelect(req.admin?.id);
  }

  @Get()
  @UseGuards(DualAuthGuard)
  findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('status') status?: SupplierStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.supplierService.findAll(req.admin?.id, {
      search,
      status,
      page: parseInt(page ?? '1') || 1,
      limit: parseInt(limit ?? '10') || 10,
    });
  }

  @Get(':id/payments')
  @UseGuards(DualAuthGuard)
  getPayments(@Param('id') id: string) {
    return this.supplierService.getPayments(id);
  }

  @Get(':id')
  @UseGuards(DualAuthGuard)
  findOne(@Param('id') id: string) {
    return this.supplierService.findOne(id);
  }
}
