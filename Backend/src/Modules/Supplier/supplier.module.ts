import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';

@Module({
  controllers: [SupplierController],
  providers: [SupplierService, AdminAuthGuard],
  exports: [SupplierService],
})
export class SupplierModule {}
