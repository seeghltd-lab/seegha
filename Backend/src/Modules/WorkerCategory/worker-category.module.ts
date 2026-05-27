import { Module } from '@nestjs/common';
import { WorkerCategoryService } from './worker-category.service';
import { WorkerCategoryController } from './worker-category.controller';
import { ActivityLogModule } from '../ActivityLog/activity-log.module';

@Module({
  imports: [ActivityLogModule],
  controllers: [WorkerCategoryController],
  providers: [WorkerCategoryService],
  exports: [WorkerCategoryService],
})
export class WorkerCategoryModule {}
