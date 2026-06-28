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
import { PurchaseOrderService } from './purchase-order.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  private callerCtx(req: any) {
    return {
      id: req.admin?.id ?? req.employee?.id,
      type: (req.admin ? 'ADMIN' : 'EMPLOYEE') as 'ADMIN' | 'EMPLOYEE',
      name:
        req.admin?.names ??
        req.admin?.email ??
        req.employee?.firstName ??
        req.employee?.email ??
        'Unknown',
    };
  }

  @Post()
  @UseGuards(DualAuthGuard)
  create(@Body() body: any, @Req() req: any) {
    return this.purchaseOrderService.create(body, this.callerCtx(req));
  }

  @Get()
  @UseGuards(DualAuthGuard)
  findAll(
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrderService.findAll({
      supplierId,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @UseGuards(DualAuthGuard)
  findOne(@Param('id') id: string) {
    return this.purchaseOrderService.findOne(id);
  }

  @Put(':id')
  @UseGuards(DualAuthGuard)
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.purchaseOrderService.update(id, this.callerCtx(req), body);
  }

  @Put(':id/receive')
  @UseGuards(DualAuthGuard)
  receiveItems(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.purchaseOrderService.receiveItems(
      id,
      this.callerCtx(req),
      body.items ?? [],
    );
  }

  @Put(':id/cancel')
  @UseGuards(DualAuthGuard)
  cancel(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.purchaseOrderService.cancel(id, this.callerCtx(req), body.reason);
  }

  @Delete(':id')
  @UseGuards(DualAuthGuard)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.purchaseOrderService.remove(id, this.callerCtx(req));
  }

  @Patch(':id/items/:itemId/payment-type')
  @UseGuards(DualAuthGuard)
  setItemPaymentType(
    @Param('id') poId: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.purchaseOrderService.setItemPaymentType(
      poId,
      itemId,
      body.paymentType,
      this.callerCtx(req),
    );
  }
}
