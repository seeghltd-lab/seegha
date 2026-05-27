import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WorkerCategoryService } from './worker-category.service';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Controller('worker-categories')
export class WorkerCategoryController {
  constructor(private readonly workerCategoryService: WorkerCategoryService) {}

  @Post()
  @UseGuards(DualAuthGuard)
  create(@Body() body: { name: string }, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName =
      req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.workerCategoryService.create(body, callerId, callerType, callerName);
  }

  @Get()
  @UseGuards(DualAuthGuard)
  findAll() {
    return this.workerCategoryService.findAll();
  }

  @Delete(':id')
  @UseGuards(DualAuthGuard)
  remove(@Param('id') id: string, @Req() req: any) {
    const callerId = req.admin?.id ?? req.employee?.id;
    const callerType: 'ADMIN' | 'EMPLOYEE' = req.admin ? 'ADMIN' : 'EMPLOYEE';
    const callerName =
      req.admin?.names ?? req.admin?.email ?? req.employee?.firstName ?? req.employee?.email;
    return this.workerCategoryService.remove(id, callerId, callerType, callerName);
  }
}
