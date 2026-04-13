import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';
import { EmployeePermissionGuard } from '../../Guards/employee-permission.guard';
import { Reflector } from '@nestjs/core';

@Module({
  controllers: [StockController],
  providers: [StockService, DualAuthGuard, EmployeePermissionGuard, Reflector],
  exports: [StockService],
})
export class StockModule {}
