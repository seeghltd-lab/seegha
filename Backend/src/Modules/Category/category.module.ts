import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, AdminAuthGuard],
  exports: [CategoryService],
})
export class CategoryModule {}
