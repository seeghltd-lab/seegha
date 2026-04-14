import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';

@Controller('categories')
@UseGuards(AdminAuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  create(@Body() body: { name: string; description?: string }, @Req() req: any) {
    return this.categoryService.create(body, req.admin.id);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.categoryService.findAll(req.admin.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.categoryService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
