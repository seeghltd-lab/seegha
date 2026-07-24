import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { DataExportService } from './data-export.service';
import { DataImportService } from './data-import.service';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { AdminOrBackupKeyGuard } from '../../Guards/admin-or-backup-key.guard';
import { ActivityLogService } from '../ActivityLog/activity-log.service';
import { RequestWithAdmin } from '../../common/interfaces/request-admin.interface';

@Controller('data-export')
export class DataExportController {
  constructor(
    private readonly exportService: DataExportService,
    private readonly importService: DataImportService,
    private readonly activityLog: ActivityLogService,
  ) {}

  @Post('export')
  @UseGuards(AdminOrBackupKeyGuard)
  async export(@Body() options: any, @Req() req: RequestWithAdmin, @Res() res: Response) {
    const format: string = options.format ?? 'json';
    const actor = req.isBackupServiceCall
      ? { id: 'backup-service', name: 'Backup Service', type: 'ADMIN' as const }
      : { id: req.admin!.id, name: req.admin!.names, type: 'ADMIN' as const };
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      const payload = await this.exportService.buildJsonExport(options, actor);
      const json = JSON.stringify(payload, null, 2);
      this.activityLog.log({
        action: 'EXPORT_DATA', entityType: 'DataExport', entityLabel: 'JSON export',
        performedById: actor.id, performedByType: 'ADMIN', performedByName: actor.name,
        metadata: { format: 'json', groups: options.groups ?? [], counts: payload.meta.counts },
        ipAddress: req.ip,
      });
      res.setHeader('Content-Disposition', `attachment; filename="amza-backup-${dateStr}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.send(json);
    }

    if (format === 'excel') {
      const buffer = await this.exportService.buildExcelExport(options);
      this.activityLog.log({
        action: 'EXPORT_DATA', entityType: 'DataExport', entityLabel: 'Excel export',
        performedById: actor.id, performedByType: 'ADMIN', performedByName: actor.name,
        metadata: { format: 'excel', groups: options.groups ?? [] }, ipAddress: req.ip,
      });
      res.setHeader('Content-Disposition', `attachment; filename="amza-export-${dateStr}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const buffer = await this.exportService.buildPdfExport(options);
      this.activityLog.log({
        action: 'EXPORT_DATA', entityType: 'DataExport', entityLabel: 'PDF export',
        performedById: actor.id, performedByType: 'ADMIN', performedByName: actor.name,
        metadata: { format: 'pdf', groups: options.groups ?? [] }, ipAddress: req.ip,
      });
      res.setHeader('Content-Disposition', `attachment; filename="amza-report-${dateStr}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      return res.send(buffer);
    }

    return res.status(400).json({ message: 'Invalid format. Use json, excel, or pdf.' });
  }

  @Post('import/preview')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importPreview(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    if (!file) return { error: 'No file uploaded' };
    const payload = JSON.parse(file.buffer.toString('utf-8'));
    const strategy = body.conflictStrategy ?? 'SKIP';
    const groups: string[] | undefined = body.groups ? JSON.parse(body.groups) : undefined;
    return this.importService.preview(payload, strategy, groups);
  }

  @Post('import')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importData(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: RequestWithAdmin,
  ) {
    if (!file) return { error: 'No file uploaded' };
    const payload = JSON.parse(file.buffer.toString('utf-8'));
    const groups: string[] | undefined = body.groups ? JSON.parse(body.groups) : undefined;
    const options = { conflictStrategy: body.conflictStrategy ?? 'SKIP', groups };
    const actor = { id: req.admin!.id, name: req.admin!.names, fileName: file.originalname };
    const results = await this.importService.commit(payload, options, actor);

    const summary = results.reduce(
      (acc, r) => ({ total: acc.total + r.total, created: acc.created + r.created, updated: acc.updated + r.updated, skipped: acc.skipped + r.skipped, failed: acc.failed + r.failed }),
      { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 },
    );

    this.activityLog.log({
      action: 'IMPORT_DATA', entityType: 'DataExport', entityLabel: 'JSON import',
      performedById: req.admin!.id, performedByType: 'ADMIN', performedByName: req.admin!.names,
      metadata: { ...summary, groups: groups ?? 'all' }, ipAddress: req.ip,
    });

    return { results, summary };
  }

  @Post('import/stock-csv/preview')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async previewStockCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.importService.previewStockFromCsv(file);
  }

  @Post('import/stock-csv')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importStockCsv(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithAdmin,
    @Res() res: Response,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const actor = { id: req.admin!.id };
    const result = await this.importService.importStockFromCsv(file, actor);

    this.activityLog.log({
      action: 'IMPORT_STOCK_CSV', entityType: 'Stock', entityLabel: `CSV import: ${file.originalname}`,
      performedById: req.admin!.id, performedByType: 'ADMIN', performedByName: req.admin!.names,
      metadata: { created: result.created, skipped: result.skipped, failed: result.failed, total: result.total },
      ipAddress: req.ip,
    });

    return res.json(result);
  }

  @Get('import/history')
  @UseGuards(AdminAuthGuard)
  async importHistory() {
    return this.importService.listSnapshots();
  }

  @Post('import/rollback/:id')
  @UseGuards(AdminAuthGuard)
  async rollbackImport(@Param('id') id: string, @Req() req: RequestWithAdmin) {
    await this.importService.rollback(id, { id: req.admin!.id, name: req.admin!.names });
    this.activityLog.log({
      action: 'IMPORT_ROLLBACK', entityType: 'DataExport', entityLabel: `Rollback of import ${id}`,
      performedById: req.admin!.id, performedByType: 'ADMIN', performedByName: req.admin!.names,
      metadata: { snapshotId: id }, ipAddress: req.ip,
    });
    return { success: true };
  }
}
