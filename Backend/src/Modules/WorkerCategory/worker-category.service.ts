import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { ActivityLogService } from '../ActivityLog/activity-log.service';

@Injectable()
export class WorkerCategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(
    data: { name: string },
    callerId: string,
    callerType: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    const existing = await this.prisma.workerCategory.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new BadRequestException(`Category "${data.name}" already exists`);
    }

    const category = await this.prisma.workerCategory.create({
      data: {
        name: data.name,
        adminId: callerType === 'ADMIN' ? callerId : null,
      },
    });

    this.activityLog.log({
      action: 'WORKER_CATEGORY_CREATED',
      entityType: 'WorkerCategory',
      entityId: category.id,
      entityLabel: category.name,
      performedById: callerId,
      performedByType: callerType,
      performedByName: callerName,
      metadata: { name: category.name },
    });

    return category;
  }

  async findAll() {
    return this.prisma.workerCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async remove(
    id: string,
    callerId?: string,
    callerType?: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    const cat = await this.prisma.workerCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Worker category not found');

    await this.prisma.workerCategory.delete({ where: { id } });

    this.activityLog.log({
      action: 'WORKER_CATEGORY_DELETED',
      entityType: 'WorkerCategory',
      entityId: id,
      entityLabel: cat.name,
      performedById: callerId ?? 'system',
      performedByType: callerType ?? 'ADMIN',
      performedByName: callerName,
    });

    return { message: 'Worker category deleted' };
  }
}
