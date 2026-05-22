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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { StockService } from './stock.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { PaymentType } from '@prisma/client';

const stockStorage = diskStorage({
  destination: './uploads/stock',
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `stock-${unique}${extname(file.originalname)}`);
  },
});

@Controller('stock')
@UseGuards(DualAuthGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // ─── Static routes first (before /:id) ──────────────

  @Post('batch')
  batchCreate(@Body() body: { items: any[] }, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.stockService.batchCreate(body.items, callerId, callerName);
  }

  @Post('direct-receipt')
  directReceipt(@Body() body: { items: any[] }, @Req() req: any) {
    const isAdmin = !!req.admin;
    const creatorId = req.admin?.id ?? req.employee?.id;
    const creatorType: 'ADMIN' | 'EMPLOYEE' = isAdmin ? 'ADMIN' : 'EMPLOYEE';
    const creatorName = isAdmin
      ? (req.admin.names ?? req.admin.email ?? 'Admin')
      : `${req.employee.firstName ?? ''} ${req.employee.lastName ?? ''}`.trim() || req.employee.email;
    return this.stockService.directReceipt(body.items, creatorId, creatorType, creatorName);
  }

  @Get('alerts')
  getAlerts(@Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    return this.stockService.getAlerts(callerId);
  }

  @Get('history')
  getHistory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('movementType') movementType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    const callerId = req.admin?.id ?? req.employee?.id;
    return this.stockService.getHistory(callerId, {
      page: parseInt(page ?? '1') || 1,
      limit: parseInt(limit ?? '20') || 20,
      movementType,
      dateFrom,
      dateTo,
      search,
    });
  }

  @Get('history/:stockId')
  getHistoryByStock(
    @Param('stockId') stockId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('movementType') movementType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.stockService.getHistoryByStock(stockId, {
      page: parseInt(page ?? '1') || 1,
      limit: parseInt(limit ?? '20') || 20,
      movementType,
      dateFrom,
      dateTo,
    });
  }

  // ─── Standard CRUD ───────────────────────────────────

  @Post()
  @UseInterceptors(FileInterceptor('stockImg', { storage: stockStorage }))
  create(@Body() body: any, @Req() req: any, @UploadedFile() file?: any) {
    const stockImg = file ? `/uploads/stock/${file.filename}` : undefined;
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.stockService.create({ ...body, stockImg }, callerId, callerName);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('siteId') siteId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const adminId = req.admin?.id;
    return this.stockService.findAll(adminId, {
      search,
      categoryId,
      siteId,
      page: parseInt(page ?? '1') || 1,
      limit: parseInt(limit ?? '12') || 12,
      sortBy,
      sortOrder,
      dateFrom,
      dateTo,
    });
  }

  // ─── Payment routes (before /:id) ────────────────────

  @Post(':id/payments')
  recordPayment(
    @Param('id') id: string,
    @Body() body: { supplierId: string; type: PaymentType; amount: number; reference?: string; notes?: string; date?: string },
    @Req() req: any,
  ) {
    const callerId = req.admin?.id ?? req.employee?.id;
    return this.stockService.recordPayment(id, body, callerId);
  }

  @Get(':id/payments')
  getStockPayments(@Param('id') id: string) {
    return this.stockService.getStockPayments(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('stockImg', { storage: stockStorage }))
  update(@Param('id') id: string, @Body() body: any, @Req() req: any, @UploadedFile() file?: any) {
    const stockImg = file ? `/uploads/stock/${file.filename}` : undefined;
    const data = stockImg ? { ...body, stockImg } : body;
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.stockService.update(id, data, callerId, callerName);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.stockService.remove(id, callerId, callerName);
  }
}
