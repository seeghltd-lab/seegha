import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { ActivityLogService } from '../ActivityLog/activity-log.service';
import { NotificationService } from '../Notification/notification.service';
import { AppSocketGateway } from '../../Global/socket/socket.gateway';
import { Decimal } from '@prisma/client/runtime/library';

type CallerType = 'ADMIN' | 'EMPLOYEE';

interface InitiateMigrationDto {
  stockId: string;
  destinationSiteId: string;
  quantity: number;
  notes?: string;
  instant?: boolean;
}

interface MigrationFilters {
  siteId?: string;
  status?: string;
  stockId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class StockMigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly notifications: NotificationService,
    private readonly socket: AppSocketGateway,
  ) {}

  private generateSKU(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let sku = 'STK-';
    for (let i = 0; i < 6; i++) {
      sku += chars[Math.floor(Math.random() * chars.length)];
    }
    return sku;
  }

  private async uniqueSKU(tx: any): Promise<string> {
    let sku = this.generateSKU();
    while (await tx.stock.findUnique({ where: { sku } })) {
      sku = this.generateSKU();
    }
    return sku;
  }

  private async assertSitePermission(siteId: string, callerId: string, callerType: CallerType) {
    if (callerType === 'ADMIN') return;
    const access = await this.prisma.siteEmployeeAccess.findUnique({
      where: { siteId_employeeId: { siteId, employeeId: callerId } },
    });
    if (!access?.canManageStockOut) {
      throw new ForbiddenException('You do not have permission to manage stock movements at this site');
    }
  }

  private async getSiteRecipients(siteId: string): Promise<{ id: string; type: 'ADMIN' | 'EMPLOYEE' }[]> {
    const [admins, accesses] = await Promise.all([
      this.prisma.admin.findMany({ where: { isLocked: false }, select: { id: true } }),
      this.prisma.siteEmployeeAccess.findMany({ where: { siteId }, select: { employeeId: true } }),
    ]);
    return [
      ...admins.map((a) => ({ id: a.id, type: 'ADMIN' as const })),
      ...accesses.map((a) => ({ id: a.employeeId, type: 'EMPLOYEE' as const })),
    ];
  }

  /** Merge migrated quantity into an existing same-name stock at the destination site (weighted-average cost), or create a new row. */
  private async mergeOrCreateDestinationStock(
    tx: any,
    params: {
      sourceStock: { itemName: string; categoryId: string | null; unit: string; reorderLevel: number; description: string | null; stockType: string; adminId: string };
      destinationSiteId: string;
      quantity: number;
      unitCostAtMigration: Decimal | number;
      adminId: string;
    },
  ) {
    const existing = await tx.stock.findFirst({
      where: { itemName: params.sourceStock.itemName, siteId: params.destinationSiteId, deletedAt: null },
    });

    const migratedCost = Number(params.unitCostAtMigration);

    if (existing) {
      const newQty = existing.quantity + params.quantity;
      const newUnitCost = newQty > 0
        ? (existing.quantity * Number(existing.unitCost) + params.quantity * migratedCost) / newQty
        : Number(existing.unitCost);
      const updated = await tx.stock.update({
        where: { id: existing.id },
        data: {
          quantity: newQty,
          unitCost: new Decimal(newUnitCost),
          totalValue: new Decimal(newUnitCost).times(newQty),
        },
      });
      return { stock: updated, qtyBefore: existing.quantity, qtyAfter: newQty };
    }

    const sku = await this.uniqueSKU(tx);
    const totalValue = new Decimal(migratedCost).times(params.quantity);
    const created = await tx.stock.create({
      data: {
        sku,
        adminId: params.adminId,
        itemName: params.sourceStock.itemName,
        categoryId: params.sourceStock.categoryId,
        siteId: params.destinationSiteId,
        unit: params.sourceStock.unit,
        quantity: params.quantity,
        unitCost: new Decimal(migratedCost),
        totalValue,
        receivedDate: new Date(),
        reorderLevel: params.sourceStock.reorderLevel,
        description: params.sourceStock.description,
        stockType: params.sourceStock.stockType as any,
      },
    });
    return { stock: created, qtyBefore: 0, qtyAfter: params.quantity };
  }

  async initiate(data: InitiateMigrationDto, callerId: string, callerType: CallerType, callerName?: string) {
    const stock = await this.prisma.stock.findUnique({ where: { id: data.stockId } });
    if (!stock) throw new NotFoundException('Stock item not found');
    if (!stock.siteId) throw new BadRequestException('This stock item is not assigned to a site');
    if (stock.siteId === data.destinationSiteId) {
      throw new BadRequestException('Source and destination site cannot be the same');
    }
    if (!data.quantity || data.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const destinationSite = await this.prisma.site.findUnique({ where: { id: data.destinationSiteId } });
    if (!destinationSite) throw new NotFoundException('Destination site not found');

    await this.assertSitePermission(stock.siteId, callerId, callerType);

    const isEquipment = stock.stockType === 'EQUIPMENT';
    const available = isEquipment ? stock.quantity - stock.quantityOut : stock.quantity;
    if (available < data.quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${available} ${stock.unit}`);
    }

    const instant = !!data.instant;

    const migration = await this.prisma.$transaction(async (tx) => {
      const qtyAfterSource = stock.quantity - data.quantity;
      await tx.stock.update({
        where: { id: stock.id },
        data: {
          quantity: { decrement: data.quantity },
          totalValue: new Decimal(qtyAfterSource).times(stock.unitCost),
        },
      });

      let created = await tx.stockMigration.create({
        data: {
          stockId: stock.id,
          sourceSiteId: stock.siteId as string,
          destinationSiteId: data.destinationSiteId,
          quantity: data.quantity,
          unit: stock.unit,
          unitCostAtMigration: stock.unitCost,
          status: instant ? 'RECEIVED' : 'IN_TRANSIT',
          instant,
          notes: data.notes || null,
          initiatedById: callerId,
          initiatedByType: callerType,
          initiatedByName: callerName || null,
          ...(instant
            ? { receivedById: callerId, receivedByType: callerType, receivedByName: callerName || null, receivedAt: new Date() }
            : {}),
        },
      });

      await tx.stockHistory.create({
        data: {
          stockId: stock.id,
          movementType: 'MIGRATION_OUT',
          qtyBefore: stock.quantity,
          qtyChange: -data.quantity,
          qtyAfter: qtyAfterSource,
          siteId: stock.siteId,
          migrationId: created.id,
          notes: `Migrated to ${destinationSite.name}${data.notes ? `: ${data.notes}` : ''}`,
          createdByAdminId: callerType === 'ADMIN' ? callerId : null,
          createdByEmployeeId: callerType !== 'ADMIN' ? callerId : null,
        },
      });

      if (instant) {
        const { stock: destStock, qtyBefore, qtyAfter } = await this.mergeOrCreateDestinationStock(tx, {
          sourceStock: stock,
          destinationSiteId: data.destinationSiteId,
          quantity: data.quantity,
          unitCostAtMigration: stock.unitCost,
          adminId: stock.adminId,
        });

        created = await tx.stockMigration.update({
          where: { id: created.id },
          data: { destinationStockId: destStock.id },
        });

        await tx.stockHistory.create({
          data: {
            stockId: destStock.id,
            movementType: 'MIGRATION_IN',
            qtyBefore,
            qtyChange: data.quantity,
            qtyAfter,
            siteId: data.destinationSiteId,
            migrationId: created.id,
            notes: `Received via migration from ${callerType === 'ADMIN' ? 'admin' : 'site'} dispatch`,
            createdByAdminId: callerType === 'ADMIN' ? callerId : null,
            createdByEmployeeId: callerType !== 'ADMIN' ? callerId : null,
          },
        });
      }

      return created;
    });

    this.activityLog.log({
      action: instant ? 'STOCK_MIGRATION_RECEIVED' : 'STOCK_MIGRATION_INITIATED',
      entityType: 'StockMigration',
      entityId: migration.id,
      entityLabel: `${stock.itemName} × ${data.quantity}`,
      performedById: callerId,
      performedByType: callerType,
      performedByName: callerName,
      metadata: {
        sourceSiteId: stock.siteId,
        destinationSiteId: data.destinationSiteId,
        stockId: stock.id,
        quantity: data.quantity,
        instant,
      },
    });

    const recipients = await this.getSiteRecipients(data.destinationSiteId);
    this.notifications
      .createNotification({
        recipients,
        title: instant ? 'Stock received via migration' : 'Incoming stock migration',
        message: instant
          ? `${data.quantity} ${stock.unit} of ${stock.itemName} transferred from another site.`
          : `${data.quantity} ${stock.unit} of ${stock.itemName} is on its way — confirm receipt when it arrives.`,
        senderId: callerId,
        senderType: callerType,
      })
      .catch(() => {});

    this.socket.emitToAllAdmins(instant ? 'stockMigrationReceived' : 'stockMigrationInitiated', { migration });

    return migration;
  }

  async receive(id: string, notes: string | undefined, callerId: string, callerType: CallerType, callerName?: string) {
    const migration = await this.prisma.stockMigration.findUnique({ where: { id }, include: { stock: true } });
    if (!migration) throw new NotFoundException('Migration not found');
    if (migration.status !== 'IN_TRANSIT') {
      throw new BadRequestException('This migration is not awaiting receipt');
    }

    await this.assertSitePermission(migration.destinationSiteId, callerId, callerType);

    const updated = await this.prisma.$transaction(async (tx) => {
      const { stock: destStock, qtyBefore, qtyAfter } = await this.mergeOrCreateDestinationStock(tx, {
        sourceStock: migration.stock,
        destinationSiteId: migration.destinationSiteId,
        quantity: migration.quantity,
        unitCostAtMigration: migration.unitCostAtMigration,
        adminId: migration.stock.adminId,
      });

      const result = await tx.stockMigration.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          destinationStockId: destStock.id,
          receivedById: callerId,
          receivedByType: callerType,
          receivedByName: callerName || null,
          receivedAt: new Date(),
        },
      });

      await tx.stockHistory.create({
        data: {
          stockId: destStock.id,
          movementType: 'MIGRATION_IN',
          qtyBefore,
          qtyChange: migration.quantity,
          qtyAfter,
          siteId: migration.destinationSiteId,
          migrationId: migration.id,
          notes: `Received via migration${notes ? `: ${notes}` : ''}`,
          createdByAdminId: callerType === 'ADMIN' ? callerId : null,
          createdByEmployeeId: callerType !== 'ADMIN' ? callerId : null,
        },
      });

      return result;
    });

    this.activityLog.log({
      action: 'STOCK_MIGRATION_RECEIVED',
      entityType: 'StockMigration',
      entityId: id,
      entityLabel: `${migration.stock.itemName} × ${migration.quantity}`,
      performedById: callerId,
      performedByType: callerType,
      performedByName: callerName,
      metadata: {
        sourceSiteId: migration.sourceSiteId,
        destinationSiteId: migration.destinationSiteId,
        stockId: migration.stockId,
        quantity: migration.quantity,
      },
    });

    const recipients = await this.getSiteRecipients(migration.sourceSiteId);
    this.notifications
      .createNotification({
        recipients,
        title: 'Migration received',
        message: `${migration.quantity} ${migration.unit} of ${migration.stock.itemName} was received at the destination site.`,
        senderId: callerId,
        senderType: callerType,
      })
      .catch(() => {});

    this.socket.emitToAllAdmins('stockMigrationReceived', { migration: updated });

    return updated;
  }

  private async restoreSourceAndTerminate(
    id: string,
    status: 'CANCELLED' | 'REJECTED',
    reason: string | undefined,
    requiredSiteId: 'sourceSiteId' | 'destinationSiteId',
    callerId: string,
    callerType: CallerType,
  ) {
    const migration = await this.prisma.stockMigration.findUnique({ where: { id }, include: { stock: true } });
    if (!migration) throw new NotFoundException('Migration not found');
    if (migration.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Only in-transit migrations can be cancelled or rejected');
    }

    await this.assertSitePermission(migration[requiredSiteId], callerId, callerType);

    const updated = await this.prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({ where: { id: migration.stockId } });
      if (!stock) throw new NotFoundException('Stock item not found');
      const qtyAfter = stock.quantity + migration.quantity;

      await tx.stock.update({
        where: { id: migration.stockId },
        data: {
          quantity: { increment: migration.quantity },
          totalValue: new Decimal(qtyAfter).times(stock.unitCost),
        },
      });

      const result = await tx.stockMigration.update({
        where: { id },
        data: {
          status,
          cancelReason: reason || null,
          cancelledAt: new Date(),
        },
      });

      await tx.stockHistory.create({
        data: {
          stockId: migration.stockId,
          movementType: 'ADJUSTMENT',
          qtyBefore: stock.quantity,
          qtyChange: migration.quantity,
          qtyAfter,
          siteId: migration.sourceSiteId,
          migrationId: migration.id,
          notes: `Migration ${status.toLowerCase()} — quantity restored${reason ? `: ${reason}` : ''}`,
          createdByAdminId: callerType === 'ADMIN' ? callerId : null,
          createdByEmployeeId: callerType !== 'ADMIN' ? callerId : null,
        },
      });

      return result;
    });

    this.activityLog.log({
      action: `STOCK_MIGRATION_${status}`,
      entityType: 'StockMigration',
      entityId: id,
      entityLabel: `${migration.stock.itemName} × ${migration.quantity}`,
      performedById: callerId,
      performedByType: callerType,
      metadata: { reason, sourceSiteId: migration.sourceSiteId, destinationSiteId: migration.destinationSiteId },
    });

    this.socket.emitToAllAdmins(`stockMigration${status === 'CANCELLED' ? 'Cancelled' : 'Rejected'}`, { migration: updated });

    return updated;
  }

  async cancel(id: string, reason: string | undefined, callerId: string, callerType: CallerType) {
    return this.restoreSourceAndTerminate(id, 'CANCELLED', reason, 'sourceSiteId', callerId, callerType);
  }

  async reject(id: string, reason: string | undefined, callerId: string, callerType: CallerType) {
    if (!reason?.trim()) {
      throw new BadRequestException('A reason is required to reject a migration');
    }
    return this.restoreSourceAndTerminate(id, 'REJECTED', reason, 'destinationSiteId', callerId, callerType);
  }

  async findAll(filters: MigrationFilters, callerId: string, callerType: CallerType) {
    const page = parseInt(filters.page ?? '1', 10);
    const limit = parseInt(filters.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const andConditions: any[] = [];
    if (filters.siteId) {
      andConditions.push({ OR: [{ sourceSiteId: filters.siteId }, { destinationSiteId: filters.siteId }] });
    }
    if (filters.stockId) andConditions.push({ stockId: filters.stockId });
    if (filters.dateFrom || filters.dateTo) {
      const range: any = {};
      if (filters.dateFrom) range.gte = new Date(filters.dateFrom);
      if (filters.dateTo) range.lte = new Date(filters.dateTo + 'T23:59:59');
      andConditions.push({ dispatchedAt: range });
    }

    if (callerType === 'EMPLOYEE') {
      const hasSiteManagement = await this.prisma.employeePermission.findFirst({
        where: { employeeId: callerId, permission: { name: 'site_management' } },
      });
      if (!hasSiteManagement) {
        const accesses = await this.prisma.siteEmployeeAccess.findMany({
          where: { employeeId: callerId },
          select: { siteId: true },
        });
        const siteIds = accesses.map((a) => a.siteId);
        andConditions.push({ OR: [{ sourceSiteId: { in: siteIds } }, { destinationSiteId: { in: siteIds } }] });
      }
    }

    const where: any = { ...(filters.status ? { status: filters.status } : {}), ...(andConditions.length ? { AND: andConditions } : {}) };

    const [migrations, total] = await this.prisma.$transaction([
      this.prisma.stockMigration.findMany({
        where,
        include: {
          stock: { select: { id: true, itemName: true, sku: true, unit: true, stockType: true } },
          destinationStock: { select: { id: true, itemName: true, sku: true } },
          sourceSite: { select: { id: true, name: true } },
          destinationSite: { select: { id: true, name: true } },
        },
        orderBy: { dispatchedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockMigration.count({ where }),
    ]);

    return { migrations, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const migration = await this.prisma.stockMigration.findUnique({
      where: { id },
      include: {
        stock: { select: { id: true, itemName: true, sku: true, unit: true, stockType: true, unitCost: true } },
        destinationStock: { select: { id: true, itemName: true, sku: true } },
        sourceSite: { select: { id: true, name: true } },
        destinationSite: { select: { id: true, name: true } },
      },
    });
    if (!migration) throw new NotFoundException('Migration not found');
    return migration;
  }
}
