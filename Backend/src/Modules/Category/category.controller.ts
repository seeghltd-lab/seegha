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
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(DualAuthGuard)
  create(@Body() body: { name: string; description?: string }, @Req() req: any) {
    const isAdmin = !!req.admin;
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = isAdmin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.categoryService.create(body, callerId, callerType, callerName);
  }

  @Get()
  @UseGuards(DualAuthGuard)
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  @UseGuards(DualAuthGuard)
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Put(':id')
  @UseGuards(DualAuthGuard)
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.categoryService.update(id, body, callerId, callerType, callerName);
  }

  @Delete(':id')
  @UseGuards(DualAuthGuard)
  remove(@Param('id') id: string, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName = req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.categoryService.remove(id, callerId, callerType, callerName);
  }
}
