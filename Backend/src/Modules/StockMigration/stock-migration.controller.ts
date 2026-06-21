import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { StockMigrationService } from './stock-migration.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

function callerCtx(req: any) {
  return {
    callerId: req.admin?.id ?? req.employee?.id,
    callerType: (req.admin ? 'ADMIN' : 'EMPLOYEE') as 'ADMIN' | 'EMPLOYEE',
    callerName: req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email,
  };
}

@Controller('stock-migrations')
@UseGuards(DualAuthGuard)
export class StockMigrationController {
  constructor(private readonly stockMigrationService: StockMigrationService) {}

  @Post()
  async initiate(@Body() body: any, @Req() req: any) {
    const { callerId, callerType, callerName } = callerCtx(req);
    return this.stockMigrationService.initiate(body, callerId, callerType, callerName);
  }

  @Get()
  async findAll(@Query() query: any, @Req() req: any) {
    const { callerId, callerType } = callerCtx(req);
    return this.stockMigrationService.findAll(query, callerId, callerType);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.stockMigrationService.findOne(id);
  }

  @Patch(':id/receive')
  async receive(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const { callerId, callerType, callerName } = callerCtx(req);
    return this.stockMigrationService.receive(id, body?.notes, callerId, callerType, callerName);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const { callerId, callerType } = callerCtx(req);
    return this.stockMigrationService.cancel(id, body?.reason, callerId, callerType);
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const { callerId, callerType } = callerCtx(req);
    return this.stockMigrationService.reject(id, body?.reason, callerId, callerType);
  }
}
