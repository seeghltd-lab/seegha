import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { mkdirSync } from 'fs';

// Ensure upload directory exists at startup
mkdirSync('./uploads/stock', { recursive: true });

@Module({
  imports: [MulterModule.register({ dest: './uploads/stock' })],
  controllers: [StockController],
  providers: [StockService, AdminAuthGuard, DualAuthGuard],
  exports: [StockService],
})
export class StockModule {}
