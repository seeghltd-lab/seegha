import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';

export interface LogActivityDto {
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  performedById: string;
  performedByType: 'ADMIN' | 'EMPLOYEE';
  performedByName?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export interface ActivityLogFilters {
  entityType?: string;
  performedByType?: string;
  performedById?: string;
  action?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a single activity. Fire-and-forget safe — errors are swallowed
   * so a logging failure never breaks the main operation.
   */
  async log(dto: LogActivityDto): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId ?? null,
          entityLabel: dto.entityLabel ?? null,
          performedById: dto.performedById,
          performedByType: dto.performedByType,
          performedByName: dto.performedByName ?? null,
          metadata: dto.metadata ?? undefined,
          ipAddress: dto.ipAddress ?? null,
        },
      });
    } catch (err) {
      console.error('[ActivityLog] Failed to write log:', err?.message);
    }
  }

  async findAll(filters: ActivityLogFilters = {}) {
    const {
      entityType,
      performedByType,
      performedById,
      action,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (performedByType) where.performedByType = performedByType;
    if (performedById) where.performedById = performedById;
    if (action) where.action = { contains: action };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { action: { contains: search } },
        { entityType: { contains: search } },
        { entityLabel: { contains: search } },
        { performedByName: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const [total, byType, byEntity, recentActions] = await Promise.all([
      this.prisma.activityLog.count(),

      this.prisma.activityLog.groupBy({
        by: ['performedByType'],
        _count: { _all: true },
      }),

      this.prisma.activityLog.groupBy({
        by: ['entityType'],
        _count: { _all: true },
        orderBy: { _count: { entityType: 'desc' } },
        take: 8,
      }),

      this.prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      total,
      byPerformerType: byType.map((r) => ({
        type: r.performedByType,
        count: r._count._all,
      })),
      byEntityType: byEntity.map((r) => ({
        entity: r.entityType,
        count: r._count._all,
      })),
      recentActions,
    };
  }

  async clearOlderThan(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const { count } = await this.prisma.activityLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return { deleted: count };
  }
}
