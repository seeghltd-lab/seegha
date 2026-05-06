import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Controller('activity-logs')
@UseGuards(DualAuthGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  findAll(
    @Query('entityType') entityType?: string,
    @Query('performedByType') performedByType?: string,
    @Query('performedById') performedById?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogService.findAll({
      entityType,
      performedByType,
      performedById,
      action,
      search,
      dateFrom,
      dateTo,
      page: parseInt(page ?? '1') || 1,
      limit: parseInt(limit ?? '20') || 20,
    });
  }

  @Get('stats')
  getStats() {
    return this.activityLogService.getStats();
  }

  @Delete('purge/:days')
  purge(@Param('days') days: string) {
    return this.activityLogService.clearOlderThan(parseInt(days) || 90);
  }
}
