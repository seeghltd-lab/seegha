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
import { SupplierService } from './supplier.service';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { SupplierStatus } from '@prisma/client';

@Controller('suppliers')
@UseGuards(AdminAuthGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.supplierService.create(body, req.admin.id);
  }

  @Get('select')
  findForSelect(@Req() req: any) {
    return this.supplierService.findForSelect(req.admin.id);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('status') status?: SupplierStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.supplierService.findAll(req.admin.id, {
      search,
      status,
      page: parseInt(page ?? '1') || 1,
      limit: parseInt(limit ?? '10') || 10,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplierService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.supplierService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.supplierService.remove(id);
  }
}
