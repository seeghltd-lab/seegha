import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UnitService } from './unit.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Controller('units')
@UseGuards(DualAuthGuard)
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Post()
  create(@Body('name') name: string, @Req() req: any) {
    const ownerId = req.admin?.id ?? req.employee?.id;
    return this.unitService.create(name, ownerId);
  }

  @Get()
  findAll(@Query('search') search: string, @Req() req: any) {
    const adminId = req.admin?.id ?? null;
    const employeeId = req.employee?.id ?? null;
    return this.unitService.findAll(adminId, employeeId, search);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unitService.remove(id);
  }
}
