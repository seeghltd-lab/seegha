import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { ActivityLogService } from '../ActivityLog/activity-log.service';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentType } from '@prisma/client';
import { Prisma } from '@prisma/client';

interface CreateStockDto {
  itemName: string;
  categoryId?: string;
  supplierId?: string;
  unit: string;
  quantity: number;
  unitCost: number;
  warehouseLocation?: string;
  siteId?: string;
  receivedDate: string;
  reorderLevel?: number;
  expiryDate?: string;
  description?: string;
  stockImg?: string;
  paymentType?: 'CREDIT' | 'DEBIT';
}

interface StockFilters {
  search?: string;
  categoryId?: string;
  siteId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

interface DirectReceiptItemDto extends CreateStockDto {
  // same fields, no difference — just semantically different caller
}

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  private generateSKU(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let sku = 'STK-';
    for (let i = 0; i < 6; i++) {
      sku += chars[Math.floor(Math.random() * chars.length)];
    }
    return sku;
  }

  private async uniqueSKU(): Promise<string> {
    let sku = this.generateSKU();
    while (await this.prisma.stock.findUnique({ where: { sku } })) {
      sku = this.generateSKU();
    }
    return sku;
  }

  async create(data: CreateStockDto, adminId: string, adminName?: string) {
    const sku = await this.uniqueSKU();
    const unitCost = new Decimal(data.unitCost);
    const quantity = Number(data.quantity);
    const totalValue = unitCost.times(quantity);

    let stock: any;
    try {
      stock = await this.prisma.stock.create({
      data: {
        sku,
        adminId,
        itemName: data.itemName,
        categoryId: data.categoryId || null,
        supplierId: data.supplierId || null,
        siteId: data.siteId || null,
        unit: data.unit,
        quantity,
        unitCost,
        totalValue,
        warehouseLocation: data.warehouseLocation || null,
        receivedDate: new Date(data.receivedDate),
        reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : 5,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        description: data.description,
        stockImg: data.stockImg,
      },
    });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const site = data.siteId ? 'this site' : 'global inventory';
        throw new BadRequestException(`"${data.itemName}" already exists in ${site}. Use a different name or update the existing item.`);
      }
      throw e;
    }

    await this.prisma.stockHistory.create({
      data: {
        stockId: stock.id,
        movementType: 'IN',
        qtyBefore: 0,
        qtyChange: quantity,
        qtyAfter: quantity,
        unitPrice: unitCost,
        notes: 'Initial stock receipt',
        createdByAdminId: adminId,
        siteId: data.siteId || null,
      },
    });

    // Auto-create payment entry if supplier is linked
    if (data.supplierId) {
      const pType = data.paymentType === 'DEBIT' ? PaymentType.DEBIT : PaymentType.CREDIT;
      await this.prisma.supplierPayment.create({
        data: {
          supplierId: data.supplierId,
          stockId: stock.id,
          type: pType,
          quantity: new Decimal(quantity),
          amount: totalValue,
          reference: `Auto: ${stock.sku}`,
          notes: `Stock received: ${data.itemName}`,
          adminId,
        },
      });
    }

    this.activityLog.log({
      action: 'STOCK_CREATED',
      entityType: 'Stock',
      entityId: stock.id,
      entityLabel: `${stock.itemName} (${stock.sku})`,
      performedById: adminId,
      performedByType: 'ADMIN',
      performedByName: adminName,
      metadata: { sku: stock.sku, quantity, unitCost: data.unitCost },
    });

    return stock;
  }

  async batchCreate(items: CreateStockDto[], adminId: string, adminName?: string) {
    return this.prisma.$transaction(async (tx) => {
      const created: any[] = [];
      for (const data of items) {
        const sku = await this.uniqueSKU();
        const unitCost = new Decimal(data.unitCost ?? 0);
        const quantity = Number(data.quantity);
        const totalValue = unitCost.times(quantity);

        let stock: any;
        try {
          stock = await tx.stock.create({
            data: {
              sku,
              adminId,
              itemName: data.itemName,
              categoryId: data.categoryId || null,
              supplierId: data.supplierId || null,
              siteId: data.siteId || null,
              unit: data.unit || '',
              quantity,
              unitCost,
              totalValue,
              warehouseLocation: data.warehouseLocation || null,
              receivedDate: new Date(data.receivedDate),
              reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : 5,
              expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
              description: data.description,
              stockImg: data.stockImg,
            },
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            const site = data.siteId ? 'this site' : 'global inventory';
            throw new BadRequestException(`"${data.itemName}" already exists in ${site}. Use a different name or update the existing item.`);
          }
          throw e;
        }

        await tx.stockHistory.create({
          data: {
            stockId: stock.id,
            movementType: 'IN',
            qtyBefore: 0,
            qtyChange: quantity,
            qtyAfter: quantity,
            unitPrice: unitCost,
            notes: 'Batch stock receipt',
            createdByAdminId: adminId,
            siteId: data.siteId || null,
          },
        });

        if (data.supplierId) {
          const pType = data.paymentType === 'DEBIT' ? PaymentType.DEBIT : PaymentType.CREDIT;
          await tx.supplierPayment.create({
            data: {
              supplierId: data.supplierId,
              stockId: stock.id,
              type: pType,
              quantity: new Decimal(quantity),
              amount: totalValue,
              reference: `Auto: ${stock.sku}`,
              notes: `Stock received: ${data.itemName}`,
              adminId,
            },
          });
        }

        this.activityLog.log({
          action: 'STOCK_CREATED',
          entityType: 'Stock',
          entityId: stock.id,
          entityLabel: `${stock.itemName} (${stock.sku})`,
          performedById: adminId,
          performedByType: 'ADMIN',
          performedByName: adminName,
          metadata: { sku: stock.sku, quantity, unitCost: Number(unitCost), source: 'batch' },
        });

        created.push(stock);
      }
      return created;
    }, { timeout: 30000 });
  }

  async directReceipt(
    items: DirectReceiptItemDto[],
    creatorId: string,
    creatorType: 'ADMIN' | 'EMPLOYEE',
    creatorName: string,
  ) {
    let adminId: string;
    if (creatorType === 'ADMIN') {
      adminId = creatorId;
    } else {
      const firstSiteId = items[0]?.siteId;
      if (!firstSiteId) throw new BadRequestException('Site is required for employee direct receipt');
      const site = await this.prisma.site.findUnique({ where: { id: firstSiteId }, select: { adminId: true } });
      if (!site) throw new BadRequestException('Invalid site selected');
      adminId = site.adminId as string;
    }

    return this.prisma.$transaction(async (tx) => {
      const created: any[] = [];
      for (const data of items) {
        const sku = await this.uniqueSKU();
        const unitCost = new Decimal(data.unitCost ?? 0);
        const quantity = Number(data.quantity);
        const totalValue = unitCost.times(quantity);

        let stock: any;
        try {
          stock = await tx.stock.create({
            data: {
              sku,
              adminId,
              itemName: data.itemName,
              categoryId: data.categoryId || null,
              supplierId: data.supplierId || null,
              siteId: data.siteId || null,
              unit: data.unit || '',
              quantity,
              unitCost,
              totalValue,
              warehouseLocation: data.warehouseLocation || null,
              receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
              reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : 5,
              expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
              description: data.description,
            },
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            const site = data.siteId ? 'this site' : 'global inventory';
            throw new BadRequestException(`"${data.itemName}" already exists in ${site}. Use a different name or update the existing item.`);
          }
          throw e;
        }

        await tx.stockHistory.create({
          data: {
            stockId: stock.id,
            movementType: 'IN',
            qtyBefore: 0,
            qtyChange: quantity,
            qtyAfter: quantity,
            unitPrice: unitCost,
            notes: `Direct Receipt by ${creatorName}`,
            createdByAdminId: creatorType === 'ADMIN' ? creatorId : null,
            createdByEmployeeId: creatorType === 'EMPLOYEE' ? creatorId : null,
            siteId: data.siteId || null,
          },
        });

        if (data.supplierId) {
          const pType = data.paymentType === 'DEBIT' ? PaymentType.DEBIT : PaymentType.CREDIT;
          await tx.supplierPayment.create({
            data: {
              supplierId: data.supplierId,
              stockId: stock.id,
              type: pType,
              quantity: new Decimal(quantity),
              amount: totalValue,
              reference: `Direct: ${stock.sku}`,
              notes: `Direct receipt by ${creatorName}: ${data.itemName}`,
              adminId,
            },
          });
        }

        this.activityLog.log({
          action: 'STOCK_CREATED',
          entityType: 'Stock',
          entityId: stock.id,
          entityLabel: `${stock.itemName} (${stock.sku})`,
          performedById: creatorId,
          performedByType: creatorType,
          performedByName: creatorName,
          metadata: { sku: stock.sku, quantity, unitCost: Number(unitCost), source: 'direct-receipt' },
        });

        created.push(stock);
      }
      return created;
    }, { timeout: 30000 });
  }

  async findAll(adminId: string | undefined, filters: StockFilters = {}) {
    const {
      search,
      categoryId,
      siteId,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (categoryId) where.categoryId = categoryId;
    if (siteId) where.siteId = siteId;
    if (dateFrom || dateTo) {
      where.receivedDate = {};
      if (dateFrom) where.receivedDate.gte = new Date(dateFrom);
      if (dateTo) where.receivedDate.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { itemName: { contains: search } },
        { sku: { contains: search } },
        { description: { contains: search } },
        { warehouseLocation: { contains: search } },
      ];
    }

    const validSortFields: Record<string, string> = {
      name: 'itemName',
      date: 'receivedDate',
      quantity: 'quantity',
      totalValue: 'totalValue',
      createdAt: 'createdAt',
    };
    const orderField = validSortFields[sortBy] ?? 'createdAt';

    const [stocks, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: sortOrder },
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true, code: true } },
          site: { select: { id: true, name: true } },
        },
      }),
      this.prisma.stock.count({ where }),
    ]);

    return {
      stocks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: { select: { id: true, name: true, code: true, phone: true } },
        site: { select: { id: true, name: true, location: true } },
        history: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!stock || stock.deletedAt !== null) throw new NotFoundException('Stock not found');
    return stock;
  }

  async update(id: string, data: Partial<CreateStockDto>, adminId: string, adminName?: string) {
    const stock = await this.prisma.stock.findUnique({ where: { id } });
    if (!stock || stock.deletedAt !== null) throw new NotFoundException('Stock not found');

    const oldQty = stock.quantity;
    const newQty = data.quantity !== undefined ? Number(data.quantity) : oldQty;
    const oldUnitCost = Number(stock.unitCost);
    const newUnitCost = data.unitCost !== undefined ? Number(data.unitCost) : oldUnitCost;
    const unitCost = new Decimal(newUnitCost);
    const totalValue = unitCost.times(newQty);

    const updated = await this.prisma.stock.update({
      where: { id },
      data: {
        itemName: data.itemName,
        categoryId: data.categoryId !== undefined ? data.categoryId || null : undefined,
        supplierId: data.supplierId !== undefined ? data.supplierId || null : undefined,
        siteId: data.siteId !== undefined ? data.siteId || null : undefined,
        unit: data.unit,
        quantity: newQty,
        unitCost,
        totalValue,
        warehouseLocation: data.warehouseLocation !== undefined ? data.warehouseLocation || null : undefined,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : undefined,
        reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        description: data.description,
        stockImg: data.stockImg,
      },
    });

    const qtyChanged = oldQty !== newQty;
    const costChanged = oldUnitCost !== newUnitCost;

    // Build a human-readable list of what changed (non-qty fields)
    const changedFields: string[] = [];
    if (data.itemName && data.itemName !== stock.itemName) changedFields.push(`name: "${stock.itemName}" → "${data.itemName}"`);
    if (costChanged) changedFields.push(`unit cost: ${oldUnitCost} → ${newUnitCost}`);
    if (data.unit && data.unit !== stock.unit) changedFields.push(`unit: ${stock.unit} → ${data.unit}`);
    if (data.warehouseLocation !== undefined && data.warehouseLocation !== stock.warehouseLocation) changedFields.push(`location updated`);
    if (data.reorderLevel !== undefined && Number(data.reorderLevel) !== stock.reorderLevel) changedFields.push(`reorder level: ${stock.reorderLevel} → ${data.reorderLevel}`);

    if (qtyChanged) {
      // Quantity movement — IN or OUT
      await this.prisma.stockHistory.create({
        data: {
          stockId: id,
          movementType: newQty > oldQty ? 'IN' : 'OUT',
          qtyBefore: oldQty,
          qtyChange: Math.abs(newQty - oldQty),
          qtyAfter: newQty,
          unitPrice: unitCost,
          notes: changedFields.length > 0
            ? `Manual adjustment. Also changed: ${changedFields.join('; ')}`
            : 'Manual quantity adjustment',
          createdByAdminId: adminId,
        },
      });
    } else if (changedFields.length > 0 || costChanged) {
      // No qty change but other fields changed — record as ADJUSTMENT
      await this.prisma.stockHistory.create({
        data: {
          stockId: id,
          movementType: 'ADJUSTMENT',
          qtyBefore: oldQty,
          qtyChange: 0,
          qtyAfter: newQty,
          unitPrice: unitCost,
          notes: `Details updated: ${changedFields.length > 0 ? changedFields.join('; ') : 'fields modified'}`,
          createdByAdminId: adminId,
        },
      });
    }

    this.activityLog.log({
      action: 'STOCK_UPDATED',
      entityType: 'Stock',
      entityId: id,
      entityLabel: `${updated.itemName} (${updated.sku})`,
      performedById: adminId,
      performedByType: 'ADMIN',
      performedByName: adminName,
      metadata: {
        qtyBefore: oldQty,
        qtyAfter: newQty,
        unitCostBefore: oldUnitCost,
        unitCostAfter: newUnitCost,
        changedFields,
      },
    });

    return updated;
  }

  async remove(id: string, adminId?: string, adminName?: string) {
    const stock = await this.prisma.stock.findUnique({ where: { id } });
    if (!stock || stock.deletedAt !== null) throw new NotFoundException('Stock not found');
    await this.prisma.stock.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.activityLog.log({
      action: 'STOCK_DELETED',
      entityType: 'Stock',
      entityId: id,
      entityLabel: `${stock.itemName} (${stock.sku})`,
      performedById: adminId ?? 'system',
      performedByType: 'ADMIN',
      performedByName: adminName,
    });
    return { message: 'Stock deleted' };
  }

  async getAlerts(adminId: string) {
    const stocks = await this.prisma.stock.findMany({
      where: { deletedAt: null },
      include: { category: { select: { name: true } } },
    });

    const lowStock = stocks.filter((s) => s.quantity <= s.reorderLevel);
    return { lowStock, count: lowStock.length };
  }

  async getHistory(adminId: string, filters: { page?: number; limit?: number; movementType?: string; dateFrom?: string; dateTo?: string; search?: string } = {}) {
    const { page = 1, limit = 20, movementType, dateFrom, dateTo, search } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (movementType) where.movementType = movementType;
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
        { stock: { itemName: { contains: search } } },
        { stock: { sku: { contains: search } } },
        { notes: { contains: search } },
      ];
    }

    const [history, total] = await Promise.all([
      this.prisma.stockHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          stock: { select: { id: true, sku: true, itemName: true, unit: true } },
        },
      }),
      this.prisma.stockHistory.count({ where }),
    ]);

    return {
      history,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getHistoryByStock(
    stockId: string,
    filters: { page?: number; limit?: number; movementType?: string; dateFrom?: string; dateTo?: string } = {},
  ) {
    const stock = await this.prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock) throw new NotFoundException('Stock not found');

    const { page = 1, limit = 20, movementType, dateFrom, dateTo } = filters;
    const skip = (page - 1) * limit;

    const where: any = { stockId };
    if (movementType) where.movementType = movementType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [history, total] = await Promise.all([
      this.prisma.stockHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockHistory.count({ where }),
    ]);

    return {
      stock: { id: stock.id, sku: stock.sku, itemName: stock.itemName, unit: stock.unit, quantity: stock.quantity },
      history,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async recordPayment(
    stockId: string,
    data: { type: PaymentType; amount: number; quantity?: number; reference?: string; notes?: string; date?: string },
    adminId: string,
  ) {
    const stock = await this.prisma.stock.findUnique({
      where: { id: stockId },
      select: { id: true, supplierId: true, itemName: true, deletedAt: true },
    });
    if (!stock || stock.deletedAt !== null) throw new NotFoundException('Stock not found');
    if (!stock.supplierId) throw new BadRequestException('This stock item has no linked supplier. Link a supplier first.');

    return this.prisma.supplierPayment.create({
      data: {
        supplierId: stock.supplierId,
        stockId,
        type: data.type,
        quantity: data.quantity != null ? new Decimal(data.quantity) : null,
        amount: new Decimal(data.amount),
        reference: data.reference || null,
        notes: data.notes || null,
        date: data.date ? new Date(data.date) : new Date(),
        adminId,
      },
    });
  }

  async getStockPayments(stockId: string) {
    const stock = await this.prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock || stock.deletedAt !== null) throw new NotFoundException('Stock not found');

    const payments = await this.prisma.supplierPayment.findMany({
      where: { stockId },
      orderBy: { date: 'desc' },
    });

    let totalCredit = new Decimal(0);
    let totalDebit = new Decimal(0);
    let totalQtyCredit = new Decimal(0);
    let totalQtyDebit = new Decimal(0);
    for (const p of payments) {
      if (p.type === PaymentType.CREDIT) {
        totalCredit = totalCredit.plus(p.amount);
        totalQtyCredit = totalQtyCredit.plus(p.quantity ?? 0);
      } else {
        totalDebit = totalDebit.plus(p.amount);
        totalQtyDebit = totalQtyDebit.plus(p.quantity ?? 0);
      }
    }

    return {
      payments,
      summary: {
        totalCredit: totalCredit.toNumber(),
        totalDebit: totalDebit.toNumber(),
        balance: totalCredit.minus(totalDebit).toNumber(),
        totalQtyCredit: totalQtyCredit.toNumber(),
        totalQtyDebit: totalQtyDebit.toNumber(),
      },
    };
  }
}
