import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { ActivityLogModule } from '../ActivityLog/activity-log.module';
import { mkdirSync } from 'fs';

mkdirSync('./uploads/stock', { recursive: true });

@Module({
  imports: [MulterModule.register({ dest: './uploads/stock' }), ActivityLogModule],
  controllers: [StockController],
  providers: [StockService, DualAuthGuard],
  exports: [StockService],
})
export class StockModule {}
