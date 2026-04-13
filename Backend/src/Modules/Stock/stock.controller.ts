import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { EmployeePermissionGuard } from '../../Guards/employee-permission.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('stocks')
@UseGuards(DualAuthGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @UseGuards(EmployeePermissionGuard)
  @RequirePermission('CREATE_STOCK')
  create(@Body() createStockDto: any) {
    return this.stockService.create(createStockDto);
  }

  @Get()
  findAll() {
    return this.stockService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(EmployeePermissionGuard)
  @RequirePermission('MANAGE_STOCK')
  update(@Param('id') id: string, @Body() updateStockDto: any) {
    return this.stockService.update(id, updateStockDto);
  }

  @Delete(':id')
  @UseGuards(EmployeePermissionGuard)
  @RequirePermission('DELETE_STOCK')
  remove(@Param('id') id: string) {
    return this.stockService.remove(id);
  }
}
