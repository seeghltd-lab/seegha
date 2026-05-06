import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { ActivityLogService } from '../ActivityLog/activity-log.service';
import { SiteStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreateSiteDto {
  name: string;
  location: string;
  managerName?: string;
  status?: SiteStatus;
  description?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  image?: string;
}

interface AddWorkerRecordDto {
  workerCount: number;
  date?: string;
  notes?: string;
  recordedBy?: string;
}

interface AddExpenseDto {
  description: string;
  amount: number;
  category?: string;
  date?: string;
  reference?: string;
  notes?: string;
}

@Injectable()
export class SiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(data: CreateSiteDto, callerId: string, callerType: 'ADMIN' | 'EMPLOYEE', callerName?: string) {
    const site = await this.prisma.site.create({
      data: {
        ...data,
        budget: data.budget ? Number(data.budget) : 0,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        adminId: (callerType === 'ADMIN' ? callerId : null) as any,
      },
    });
    this.activityLog.log({
      action: 'SITE_CREATED',
      entityType: 'Site',
      entityId: site.id,
      entityLabel: site.name,
      performedById: callerId,
      performedByType: callerType,
      performedByName: callerName,
      metadata: { location: site.location, status: site.status },
    });
    return site;
  }

  async findAll(filters: any = {}) {
    const { search, status, location } = filters;
    const where: any = {};

    if (status) where.status = status;
    if (location) where.location = location;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { managerName: { contains: search } },
        { location: { contains: search } },
      ];
    }

    return this.prisma.site.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { stocks: true, workerRecords: true, expenses: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        _count: {
          select: { stocks: true, workerRecords: true, expenses: true },
        },
      },
    });
    if (!site) throw new NotFoundException('Site not found');

    const expenseAgg = await this.prisma.siteExpense.aggregate({
      where: { siteId: id },
      _sum: { amount: true },
    });

    const workerAgg = await this.prisma.siteWorkerRecord.aggregate({
      where: { siteId: id },
      _sum: { workerCount: true },
    });

    return {
      ...site,
      totalExpenses: expenseAgg._sum.amount ? Number(expenseAgg._sum.amount) : 0,
      totalWorkersRecorded: workerAgg._sum.workerCount ?? 0,
    };
  }

  async update(
    id: string,
    data: Partial<CreateSiteDto>,
    callerId?: string,
    callerType?: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException('Site not found');
    const updated = await this.prisma.site.update({
      where: { id },
      data: {
        ...data,
        budget: data.budget !== undefined ? Number(data.budget) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    this.activityLog.log({
      action: 'SITE_UPDATED',
      entityType: 'Site',
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
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException('Site not found');
    await this.prisma.site.delete({ where: { id } });
    this.activityLog.log({
      action: 'SITE_DELETED',
      entityType: 'Site',
      entityId: id,
      entityLabel: site.name,
      performedById: callerId ?? 'system',
      performedByType: callerType ?? 'ADMIN',
      performedByName: callerName,
    });
    return { message: 'Site deleted' };
  }

  async getStats(callerId: string, callerType: 'ADMIN' | 'EMPLOYEE') {
    const where = callerType === 'ADMIN' ? { adminId: callerId } : {};
    const sites = await this.prisma.site.findMany({ where });

    const totalSites = sites.length;
    const activeSites = sites.filter(s => s.status === SiteStatus.ACTIVE).length;
    const pausedSites = sites.filter(s => s.status === SiteStatus.PAUSED).length;
    const totalBudget = sites.reduce((sum, s) => sum + Number(s.budget), 0);

    const workerWhere = callerType === 'ADMIN' ? { adminId: callerId } : {};
    const workerAgg = await this.prisma.siteWorkerRecord.aggregate({
      where: workerWhere,
      _sum: { workerCount: true },
    });
    const totalWorkers = workerAgg._sum.workerCount ?? 0;

    return { totalSites, activeSites, pausedSites, totalBudget, totalWorkers };
  }

  // ─── Worker Records ──────────────────────────────────

  async addWorkerRecord(
    siteId: string,
    data: AddWorkerRecordDto,
    callerId: string,
    callerName: string,
    callerType: 'ADMIN' | 'EMPLOYEE' = 'ADMIN',
  ) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');

    const record = await this.prisma.siteWorkerRecord.create({
      data: {
        siteId,
        adminId: callerId,
        workerCount: Number(data.workerCount),
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes || null,
        recordedBy: data.recordedBy || callerName,
      },
    });
    this.activityLog.log({
      action: 'SITE_WORKER_RECORD_ADDED',
      entityType: 'Site',
      entityId: siteId,
      entityLabel: site.name,
      performedById: callerId,
      performedByType: callerType,
      performedByName: callerName,
      metadata: { workerCount: record.workerCount, date: record.date },
    });
    return record;
  }

  async getWorkerRecords(siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');

    const records = await this.prisma.siteWorkerRecord.findMany({
      where: { siteId },
      orderBy: { date: 'desc' },
    });

    const totalWorkers = records.reduce((sum, r) => sum + r.workerCount, 0);
    return { records, totalWorkers };
  }

  async removeWorkerRecord(
    recordId: string,
    callerId?: string,
    callerType?: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    const record = await this.prisma.siteWorkerRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('Worker record not found');
    await this.prisma.siteWorkerRecord.delete({ where: { id: recordId } });
    this.activityLog.log({
      action: 'SITE_WORKER_RECORD_REMOVED',
      entityType: 'Site',
      entityId: record.siteId,
      entityLabel: `Worker record #${recordId}`,
      performedById: callerId ?? 'system',
      performedByType: callerType ?? 'ADMIN',
      performedByName: callerName,
      metadata: { workerCount: record.workerCount, date: record.date },
    });
    return { message: 'Worker record deleted' };
  }

  // ─── Expenses ────────────────────────────────────────

  async addExpense(
    siteId: string,
    data: AddExpenseDto,
    callerId: string,
    callerType: 'ADMIN' | 'EMPLOYEE' = 'ADMIN',
    callerName?: string,
  ) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');

    const expense = await this.prisma.siteExpense.create({
      data: {
        siteId,
        adminId: callerId,
        description: data.description,
        amount: new Decimal(data.amount),
        category: data.category || null,
        date: data.date ? new Date(data.date) : new Date(),
        reference: data.reference || null,
        notes: data.notes || null,
      },
    });
    this.activityLog.log({
      action: 'SITE_EXPENSE_ADDED',
      entityType: 'Site',
      entityId: siteId,
      entityLabel: site.name,
      performedById: callerId,
      performedByType: callerType,
      performedByName: callerName,
      metadata: { description: data.description, amount: data.amount, category: data.category },
    });
    return expense;
  }

  async getExpenses(siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');

    const expenses = await this.prisma.siteExpense.findMany({
      where: { siteId },
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    return { expenses, total };
  }

  async removeExpense(
    expenseId: string,
    callerId?: string,
    callerType?: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    const expense = await this.prisma.siteExpense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new NotFoundException('Expense not found');
    await this.prisma.siteExpense.delete({ where: { id: expenseId } });
    this.activityLog.log({
      action: 'SITE_EXPENSE_REMOVED',
      entityType: 'Site',
      entityId: expense.siteId,
      entityLabel: expense.description,
      performedById: callerId ?? 'system',
      performedByType: callerType ?? 'ADMIN',
      performedByName: callerName,
      metadata: { amount: Number(expense.amount), category: expense.category },
    });
    return { message: 'Expense deleted' };
  }
}
