import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { ActivityLogService } from '../ActivityLog/activity-log.service';
import { AppSocketGateway } from '../../Global/socket/socket.gateway';
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
  categoryId?: string;
}

interface AddExpenseDto {
  description: string;
  amount: number;
  category?: string;
  date?: string;
  reference?: string;
  notes?: string;
}

interface RecordStockOutDto {
  stockId: string;
  quantity: number;
  unit: string;
  notes?: string;
  date?: string;
}

interface UpdateStockOutDto {
  quantity?: number;
  notes?: string;
  date?: string;
}

interface SiteAccessDto {
  employeeId: string;
  canManageInfo?: boolean;
  canManageWorkers?: boolean;
  canManageExpenses?: boolean;
  canManageStock?: boolean;
  canManageStockOut?: boolean;
}

@Injectable()
export class SiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly socket: AppSocketGateway,
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

  async findAll(filters: any = {}, callerId?: string, callerType?: 'ADMIN' | 'EMPLOYEE') {
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

    // For employees: filter by their site assignments unless they have global site_management
    if (callerType === 'EMPLOYEE' && callerId) {
      const hasSiteManagement = await this.prisma.employeePermission.findFirst({
        where: { employeeId: callerId, permission: { name: 'site_management' } },
        include: { permission: true },
      });
      if (!hasSiteManagement) {
        const accesses = await this.prisma.siteEmployeeAccess.findMany({
          where: { employeeId: callerId },
          select: { siteId: true },
        });
        where.id = { in: accesses.map((a) => a.siteId) };
      }
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
        categoryId: data.categoryId ?? null,
      },
      include: { category: { select: { id: true, name: true } } },
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
      include: { category: { select: { id: true, name: true } } },
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

  // ─── Stock Out ───────────────────────────────────────

  async recordStockOut(
    siteId: string,
    data: RecordStockOutDto,
    callerId: string,
    callerType: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({ where: { id: data.stockId } });
      if (!stock) throw new NotFoundException('Stock item not found');

      const isEquipment = stock.stockType === 'EQUIPMENT';
      const available = isEquipment ? stock.quantity - stock.quantityOut : stock.quantity;
      if (available < data.quantity) {
        throw new BadRequestException(`Insufficient stock. Available: ${available} ${stock.unit}`);
      }

      const record = await tx.stockOut.create({
        data: {
          siteId,
          stockId: data.stockId,
          quantity: data.quantity,
          unit: data.unit || stock.unit,
          notes: data.notes || null,
          date: data.date ? new Date(data.date) : new Date(),
          recordedById: callerId,
          recordedByType: callerType,
          recordedByName: callerName || null,
        },
        include: { stock: { select: { id: true, itemName: true, sku: true, unit: true } } },
      });

      const availableAfter = available - data.quantity;

      if (isEquipment) {
        await tx.stock.update({
          where: { id: data.stockId },
          data: { quantityOut: { increment: data.quantity } },
        });
      } else {
        await tx.stock.update({
          where: { id: data.stockId },
          data: {
            quantity: { decrement: data.quantity },
            totalValue: new Decimal(availableAfter * Number(stock.unitCost)),
          },
        });
      }

      await tx.stockHistory.create({
        data: {
          stockId: data.stockId,
          movementType: 'OUT',
          qtyBefore: available,
          qtyChange: -data.quantity,
          qtyAfter: availableAfter,
          siteId,
          notes: data.notes || (isEquipment ? 'Equipment checked out (in-use)' : 'Stock out recorded'),
          createdByAdminId: callerType === 'ADMIN' ? callerId : null,
          createdByEmployeeId: callerType !== 'ADMIN' ? callerId : null,
        },
      });

      this.activityLog.log({
        action: 'STOCK_OUT_RECORDED',
        entityType: 'StockOut',
        entityId: record.id,
        entityLabel: stock.itemName,
        performedById: callerId,
        performedByType: callerType,
        performedByName: callerName,
        metadata: { siteId, quantity: data.quantity, stockId: data.stockId },
      });

      return record;
    });
  }

  async returnStockOut(
    stockOutId: string,
    returnNotes: string | undefined,
    callerId: string,
    callerType: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const stockOut = await tx.stockOut.findUnique({ where: { id: stockOutId } });
      if (!stockOut) throw new NotFoundException('Stock out record not found');

      const stock = await tx.stock.findUnique({ where: { id: stockOut.stockId } });
      if (!stock) throw new NotFoundException('Stock item not found');

      if (stock.stockType !== 'EQUIPMENT') {
        throw new BadRequestException('Only equipment checkouts can be returned');
      }
      if (stockOut.status !== 'OUT') {
        throw new BadRequestException('This checkout has already been returned');
      }

      const updated = await tx.stockOut.update({
        where: { id: stockOutId },
        data: { status: 'RETURNED', returnedAt: new Date(), returnNotes: returnNotes || null },
        include: { stock: { select: { id: true, itemName: true, sku: true, unit: true } } },
      });

      const availableBefore = stock.quantity - stock.quantityOut;
      const restoreQty = Math.min(stockOut.quantity, stock.quantityOut);
      await tx.stock.update({
        where: { id: stock.id },
        data: { quantityOut: { decrement: restoreQty } },
      });

      await tx.stockHistory.create({
        data: {
          stockId: stock.id,
          movementType: 'RETURN',
          qtyBefore: availableBefore,
          qtyChange: restoreQty,
          qtyAfter: availableBefore + restoreQty,
          siteId: stockOut.siteId,
          notes: `Equipment returned${returnNotes ? `: ${returnNotes}` : ''}`,
          createdByAdminId: callerType === 'ADMIN' ? callerId : null,
          createdByEmployeeId: callerType !== 'ADMIN' ? callerId : null,
        },
      });

      this.activityLog.log({
        action: 'STOCK_OUT_RETURNED',
        entityType: 'StockOut',
        entityId: stockOutId,
        entityLabel: stock.itemName,
        performedById: callerId,
        performedByType: callerType,
        performedByName: callerName,
        metadata: { siteId: stockOut.siteId, quantity: stockOut.quantity, stockId: stock.id },
      });

      return updated;
    });
  }

  async getStockOuts(siteId: string, params: any = {}) {
    const { page = 1, limit = 20, search, dateFrom, dateTo } = params;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = { siteId };
    if (search) {
      where.stock = { itemName: { contains: search } };
    }
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59');
    }

    const [records, total] = await this.prisma.$transaction([
      this.prisma.stockOut.findMany({
        where,
        include: { stock: { select: { id: true, itemName: true, sku: true, unit: true, stockType: true, quantity: true, quantityOut: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.stockOut.count({ where }),
    ]);

    return { records, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  async getStockOutSummary(siteId: string) {
    const stockOuts = await this.prisma.stockOut.findMany({
      where: { siteId },
      include: { stock: { select: { id: true, itemName: true, sku: true, unit: true, quantity: true } } },
    });

    const map = new Map<string, any>();
    for (const out of stockOuts) {
      if (!map.has(out.stockId)) {
        map.set(out.stockId, { stock: out.stock, totalOut: 0, recordCount: 0 });
      }
      const entry = map.get(out.stockId);
      entry.totalOut += out.quantity;
      entry.recordCount++;
    }

    return Array.from(map.values());
  }

  async updateStockOut(
    id: string,
    data: UpdateStockOutDto,
    callerId: string,
    callerType: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockOut.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Stock out record not found');
      if (existing.status === 'RETURNED') {
        throw new BadRequestException('Cannot edit a checkout that has already been returned');
      }

      if (data.quantity !== undefined) {
        const diff = data.quantity - existing.quantity;
        if (diff !== 0) {
          const stock = await tx.stock.findUnique({ where: { id: existing.stockId } });
          if (!stock) throw new NotFoundException('Stock item not found');
          const isEquipment = stock.stockType === 'EQUIPMENT';
          const available = isEquipment ? stock.quantity - stock.quantityOut : stock.quantity;

          if (diff > 0 && available < diff) {
            throw new BadRequestException(`Insufficient stock. Available: ${available} ${stock.unit}`);
          }

          const availableAfter = available - diff;

          if (isEquipment) {
            await tx.stock.update({
              where: { id: existing.stockId },
              data: { quantityOut: { increment: diff } },
            });
          } else {
            await tx.stock.update({
              where: { id: existing.stockId },
              data: {
                quantity: { decrement: diff },
                totalValue: new Decimal(availableAfter * Number(stock.unitCost)),
              },
            });
          }

          await tx.stockHistory.create({
            data: {
              stockId: existing.stockId,
              movementType: 'ADJUSTMENT',
              qtyBefore: available,
              qtyChange: -diff,
              qtyAfter: availableAfter,
              siteId: existing.siteId,
              notes: `Stock out updated from ${existing.quantity} to ${data.quantity}`,
              createdByAdminId: callerType === 'ADMIN' ? callerId : null,
              createdByEmployeeId: callerType !== 'ADMIN' ? callerId : null,
            },
          });
        }
      }

      return tx.stockOut.update({
        where: { id },
        data: {
          quantity: data.quantity ?? existing.quantity,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          date: data.date ? new Date(data.date) : existing.date,
        },
        include: { stock: { select: { id: true, itemName: true, sku: true, unit: true } } },
      });
    });
  }

  async deleteStockOut(
    id: string,
    callerId: string,
    callerType: 'ADMIN' | 'EMPLOYEE',
    callerName?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockOut.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Stock out record not found');

      const stock = await tx.stock.findUnique({ where: { id: existing.stockId } });
      // Equipment checkouts that were already returned had their quantityOut
      // settled by returnStockOut() — deleting the row here must not double-restore.
      if (stock && !(stock.stockType === 'EQUIPMENT' && existing.status === 'RETURNED')) {
        const isEquipment = stock.stockType === 'EQUIPMENT';
        const available = isEquipment ? stock.quantity - stock.quantityOut : stock.quantity;
        const availableAfter = available + existing.quantity;

        if (isEquipment) {
          await tx.stock.update({
            where: { id: existing.stockId },
            data: { quantityOut: { decrement: Math.min(existing.quantity, stock.quantityOut) } },
          });
        } else {
          await tx.stock.update({
            where: { id: existing.stockId },
            data: {
              quantity: { increment: existing.quantity },
              totalValue: new Decimal(availableAfter * Number(stock.unitCost)),
            },
          });
        }

        await tx.stockHistory.create({
          data: {
            stockId: existing.stockId,
            movementType: 'ADJUSTMENT',
            qtyBefore: available,
            qtyChange: existing.quantity,
            qtyAfter: availableAfter,
            siteId: existing.siteId,
            notes: `Stock out record deleted — quantity restored`,
            createdByAdminId: callerType === 'ADMIN' ? callerId : null,
            createdByEmployeeId: callerType !== 'ADMIN' ? callerId : null,
          },
        });
      }

      await tx.stockOut.delete({ where: { id } });

      this.activityLog.log({
        action: 'STOCK_OUT_DELETED',
        entityType: 'StockOut',
        entityId: id,
        entityLabel: stock?.itemName || 'Unknown item',
        performedById: callerId,
        performedByType: callerType,
        performedByName: callerName,
        metadata: { siteId: existing.siteId, quantity: existing.quantity },
      });

      return { message: 'Stock out record deleted and quantity restored' };
    });
  }

  // ─── Site Employee Access ─────────────────────────────

  async assignEmployeeToSite(siteId: string, data: SiteAccessDto) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');

    const employee = await this.prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const existing = await this.prisma.siteEmployeeAccess.findUnique({
      where: { siteId_employeeId: { siteId, employeeId: data.employeeId } },
    });
    if (existing) throw new BadRequestException('Employee already has access to this site');

    const record = await this.prisma.siteEmployeeAccess.create({
      data: {
        siteId,
        employeeId: data.employeeId,
        canManageInfo: data.canManageInfo ?? false,
        canManageWorkers: data.canManageWorkers ?? false,
        canManageExpenses: data.canManageExpenses ?? false,
        canManageStock: data.canManageStock ?? false,
        canManageStockOut: data.canManageStockOut ?? false,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true, position: true } },
      },
    });
    this.socket.emitToAllAdmins('siteAccessAssigned', { siteId, record });
    this.socket.emitToEmployee(data.employeeId, 'siteAccessAssigned', { siteId });
    return record;
  }

  async updateSiteAccess(siteId: string, employeeId: string, data: Partial<SiteAccessDto>) {
    const existing = await this.prisma.siteEmployeeAccess.findUnique({
      where: { siteId_employeeId: { siteId, employeeId } },
    });
    if (!existing) throw new NotFoundException('Site access record not found');

    const updated = await this.prisma.siteEmployeeAccess.update({
      where: { siteId_employeeId: { siteId, employeeId } },
      data: {
        canManageInfo: data.canManageInfo ?? existing.canManageInfo,
        canManageWorkers: data.canManageWorkers ?? existing.canManageWorkers,
        canManageExpenses: data.canManageExpenses ?? existing.canManageExpenses,
        canManageStock: data.canManageStock ?? existing.canManageStock,
        canManageStockOut: data.canManageStockOut ?? existing.canManageStockOut,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true, position: true } },
      },
    });
    this.socket.emitToAllAdmins('siteAccessUpdated', { siteId, employeeId, record: updated });
    this.socket.emitToEmployee(employeeId, 'siteAccessUpdated', { siteId });
    return updated;
  }

  async removeSiteAccess(siteId: string, employeeId: string) {
    const existing = await this.prisma.siteEmployeeAccess.findUnique({
      where: { siteId_employeeId: { siteId, employeeId } },
    });
    if (!existing) throw new NotFoundException('Site access record not found');

    await this.prisma.siteEmployeeAccess.delete({
      where: { siteId_employeeId: { siteId, employeeId } },
    });
    this.socket.emitToAllAdmins('siteAccessRemoved', { siteId, employeeId });
    this.socket.emitToEmployee(employeeId, 'siteAccessRemoved', { siteId });
    return { message: 'Employee access removed from site' };
  }

  async getSiteAccess(siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');

    return this.prisma.siteEmployeeAccess.findMany({
      where: { siteId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true, position: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMyAccess(siteId: string, employeeId: string) {
    return this.prisma.siteEmployeeAccess.findUnique({
      where: { siteId_employeeId: { siteId, employeeId } },
    });
  }
}
