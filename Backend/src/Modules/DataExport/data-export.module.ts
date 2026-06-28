import { Module } from '@nestjs/common';
import { DataExportController } from './data-export.controller';
import { DataExportService } from './data-export.service';
import { DataImportService } from './data-import.service';
import { ActivityLogModule } from '../ActivityLog/activity-log.module';

@Module({
  imports: [ActivityLogModule],
  controllers: [DataExportController],
  providers: [DataExportService, DataImportService],
})
export class DataExportModule {}
