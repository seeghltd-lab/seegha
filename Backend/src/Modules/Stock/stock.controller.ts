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
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

const stockStorage = diskStorage({
  destination: './uploads/stock',
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `stock-${unique}${extname(file.originalname)}`);
  },
});

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('stockImg', { storage: stockStorage }))
  create(
    @Body() body: any,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const stockImg = file ? `/uploads/stock/${file.filename}` : undefined;
    return this.stockService.create({ ...body, stockImg }, req.admin.id);
  }

  @Get()
  @UseGuards(DualAuthGuard)
  findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const adminId = req.admin?.id ?? '';
    return this.stockService.findAll(adminId, {
      search,
      categoryId,
      page: parseInt(page ?? '1') || 1,
      limit: parseInt(limit ?? '12') || 12,
      sortBy,
      sortOrder,
      dateFrom,
      dateTo,
    });
  }

  @Get('alerts')
  @UseGuards(AdminAuthGuard)
  getAlerts(@Req() req: any) {
    return this.stockService.getAlerts(req.admin.id);
  }

  @Get('history')
  @UseGuards(AdminAuthGuard)
  getHistory(@Req() req: any) {
    return this.stockService.getHistory(req.admin.id);
  }

  @Get('history/:stockId')
  @UseGuards(AdminAuthGuard)
  getHistoryByStock(@Param('stockId') stockId: string) {
    return this.stockService.getHistoryByStock(stockId);
  }

  @Get(':id')
  @UseGuards(DualAuthGuard)
  findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('stockImg', { storage: stockStorage }))
  update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const stockImg = file ? `/uploads/stock/${file.filename}` : undefined;
    const data = stockImg ? { ...body, stockImg } : body;
    return this.stockService.update(id, data, req.admin.id);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  remove(@Param('id') id: string) {
    return this.stockService.remove(id);
  }
}
