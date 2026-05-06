import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { ActivityLogService } from '../ActivityLog/activity-log.service';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(
    data: { name: string; description?: string },
    callerId: string,
    callerType: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    const category = await this.prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        adminId: callerType === 'ADMIN' ? callerId : null,
      },
    });
    this.activityLog.log({
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: category.id,
      entityLabel: category.name,
      performedById: callerId,
      performedByType: callerType,
      performedByName: callerName,
      metadata: { name: category.name, description: category.description },
    });
    return category;
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { stocks: true } } },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { stocks: true } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async update(
    id: string,
    data: { name?: string; description?: string },
    callerId?: string,
    callerType?: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    const updated = await this.prisma.category.update({ where: { id }, data });
    this.activityLog.log({
      action: 'CATEGORY_UPDATED',
      entityType: 'Category',
      entityId: id,
      entityLabel: updated.name,
      performedById: callerId ?? 'system',
      performedByType: callerType ?? 'ADMIN',
      performedByName: callerName,
      metadata: { changes: data },
    });
    return updated;
  }

  async remove(
    id: string,
    callerId?: string,
    callerType?: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { stocks: true } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat._count.stocks > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${cat._count.stocks} linked stock item(s). Reassign or remove them first.`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
    this.activityLog.log({
      action: 'CATEGORY_DELETED',
      entityType: 'Category',
      entityId: id,
      entityLabel: cat.name,
      performedById: callerId ?? 'system',
      performedByType: callerType ?? 'ADMIN',
      performedByName: callerName,
    });
    return { message: 'Category deleted' };
  }
}
