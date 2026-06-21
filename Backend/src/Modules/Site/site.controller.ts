import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SiteService, CreateSiteDto } from './site.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

mkdirSync('./uploads/sites', { recursive: true });

const siteImageStorage = diskStorage({
  destination: './uploads/sites',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `site-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('sites')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  // ─── Static / prefix routes first ────────────────────

  @Get('stats')
  @UseGuards(DualAuthGuard)
  async getStats(@Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    return this.siteService.getStats(callerId, callerType);
  }

  // my-access must be before /:id to avoid param conflict
  @Get('my-access/:siteId')
  @UseGuards(DualAuthGuard)
  async getMyAccess(@Param('siteId') siteId: string, @Req() req: any) {
    const employeeId = req.employee?.id ?? req.admin?.id;
    return this.siteService.getMyAccess(siteId, employeeId);
  }

  // ─── Core CRUD ────────────────────────────────────────

  @Post()
  @UseGuards(DualAuthGuard)
  @UseInterceptors(FileInterceptor('image', { storage: siteImageStorage }))
  async create(@Body() data: CreateSiteDto, @Req() req: any, @UploadedFile() file: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    const siteData = { ...data };
    if (file) siteData.image = `/uploads/sites/${file.filename}`;
    return this.siteService.create(siteData, callerId, callerType, callerName);
  }

  @Get()
  @UseGuards(DualAuthGuard)
  async findAll(@Req() req: any, @Query() filters: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    return this.siteService.findAll(filters, callerId, callerType);
  }

  @Get(':id')
  @UseGuards(DualAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.siteService.findOne(id);
  }

  @Put(':id')
  @UseGuards(DualAuthGuard)
  @UseInterceptors(FileInterceptor('image', { storage: siteImageStorage }))
  async update(@Param('id') id: string, @Body() data: Partial<CreateSiteDto>, @Req() req: any, @UploadedFile() file: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    const siteData = { ...data };
    if (file) siteData.image = `/uploads/sites/${file.filename}`;
    return this.siteService.update(id, siteData, callerId, callerType, callerName);
  }

  @Delete(':id')
  @UseGuards(DualAuthGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.siteService.remove(id, callerId, callerType, callerName);
  }

  // ─── Worker Records ───────────────────────────────────

  @Post(':id/workers')
  @UseGuards(DualAuthGuard)
  async addWorkerRecord(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email ?? 'Unknown';
    return this.siteService.addWorkerRecord(id, body, callerId, callerName, callerType);
  }

  @Get(':id/workers')
  @UseGuards(DualAuthGuard)
  async getWorkerRecords(@Param('id') id: string) {
    return this.siteService.getWorkerRecords(id);
  }

  @Delete(':id/workers/:recordId')
  @UseGuards(DualAuthGuard)
  async removeWorkerRecord(@Param('recordId') recordId: string, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.siteService.removeWorkerRecord(recordId, callerId, callerType, callerName);
  }

  // ─── Expenses ─────────────────────────────────────────

  @Post(':id/expenses')
  @UseGuards(DualAuthGuard)
  async addExpense(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.siteService.addExpense(id, body, callerId, callerType, callerName);
  }

  @Get(':id/expenses')
  @UseGuards(DualAuthGuard)
  async getExpenses(@Param('id') id: string) {
    return this.siteService.getExpenses(id);
  }

  @Delete(':id/expenses/:expenseId')
  @UseGuards(DualAuthGuard)
  async removeExpense(@Param('expenseId') expenseId: string, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.siteService.removeExpense(expenseId, callerId, callerType, callerName);
  }

  // ─── Stock Out ────────────────────────────────────────

  @Post(':siteId/stock-out')
  @UseGuards(DualAuthGuard)
  async recordStockOut(@Param('siteId') siteId: string, @Body() body: any, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.siteService.recordStockOut(siteId, body, callerId, callerType, callerName);
  }

  @Get(':siteId/stock-out')
  @UseGuards(DualAuthGuard)
  async getStockOuts(
    @Param('siteId') siteId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.siteService.getStockOuts(siteId, { page, limit, search, dateFrom, dateTo });
  }

  @Get(':siteId/stock-out/summary')
  @UseGuards(DualAuthGuard)
  async getStockOutSummary(@Param('siteId') siteId: string) {
    return this.siteService.getStockOutSummary(siteId);
  }

  @Put(':siteId/stock-out/:id')
  @UseGuards(DualAuthGuard)
  async updateStockOut(@Param('siteId') siteId: string, @Param('id') id: string, @Body() body: any, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.siteService.updateStockOut(id, body, callerId, callerType, callerName);
  }

  @Delete(':siteId/stock-out/:id')
  @UseGuards(DualAuthGuard)
  async deleteStockOut(@Param('siteId') siteId: string, @Param('id') id: string, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.siteService.deleteStockOut(id, callerId, callerType, callerName);
  }

  @Patch(':siteId/stock-out/:id/return')
  @UseGuards(DualAuthGuard)
  async returnStockOut(@Param('siteId') siteId: string, @Param('id') id: string, @Body() body: any, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.siteService.returnStockOut(id, body?.notes, callerId, callerType, callerName);
  }

  // ─── Site Employee Access ─────────────────────────────

  @Post(':siteId/access')
  @UseGuards(DualAuthGuard)
  async assignEmployeeToSite(@Param('siteId') siteId: string, @Body() body: any) {
    return this.siteService.assignEmployeeToSite(siteId, body);
  }

  @Get(':siteId/access')
  @UseGuards(DualAuthGuard)
  async getSiteAccess(@Param('siteId') siteId: string) {
    return this.siteService.getSiteAccess(siteId);
  }

  @Put(':siteId/access/:employeeId')
  @UseGuards(DualAuthGuard)
  async updateSiteAccess(
    @Param('siteId') siteId: string,
    @Param('employeeId') employeeId: string,
    @Body() body: any,
  ) {
    return this.siteService.updateSiteAccess(siteId, employeeId, body);
  }

  @Delete(':siteId/access/:employeeId')
  @UseGuards(DualAuthGuard)
  async removeSiteAccess(
    @Param('siteId') siteId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.siteService.removeSiteAccess(siteId, employeeId);
  }
}
