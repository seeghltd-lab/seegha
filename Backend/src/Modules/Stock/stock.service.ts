import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateStockDto {
  itemName: string;
  categoryId?: string;
  supplierId?: string;
  unit: string;
  quantity: number;
  unitCost: number;
  warehouseLocation: string;
  receivedDate: string;
  reorderLevel?: number;
  expiryDate?: string;
  description?: string;
  stockImg?: string;
}

interface StockFilters {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(data: CreateStockDto, adminId: string) {
    const sku = await this.uniqueSKU();
    const unitCost = new Decimal(data.unitCost);
    const quantity = Number(data.quantity);
    const totalValue = unitCost.times(quantity);

    const stock = await this.prisma.stock.create({
      data: {
        sku,
        adminId,
        itemName: data.itemName,
        categoryId: data.categoryId || null,
        supplierId: data.supplierId || null,
        unit: data.unit,
        quantity,
        unitCost,
        totalValue,
        warehouseLocation: data.warehouseLocation,
        receivedDate: new Date(data.receivedDate),
        reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : 5,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        description: data.description,
        stockImg: data.stockImg,
      },
    });

    // Record stock history
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
      },
    });

    return stock;
  }

  async findAll(adminId: string, filters: StockFilters = {}) {
    const {
      search,
      categoryId,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = { adminId };
    if (categoryId) where.categoryId = categoryId;
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
        history: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!stock) throw new NotFoundException('Stock not found');
    return stock;
  }

  async update(id: string, data: Partial<CreateStockDto>, adminId: string) {
    const stock = await this.prisma.stock.findUnique({ where: { id } });
    if (!stock) throw new NotFoundException('Stock not found');

    const oldQty = stock.quantity;
    const newQty = data.quantity !== undefined ? Number(data.quantity) : oldQty;
    const unitCost = data.unitCost ? new Decimal(data.unitCost) : stock.unitCost;
    const totalValue = unitCost.times(newQty);

    const updated = await this.prisma.stock.update({
      where: { id },
      data: {
        itemName: data.itemName,
        categoryId: data.categoryId !== undefined ? data.categoryId || null : undefined,
        supplierId: data.supplierId !== undefined ? data.supplierId || null : undefined,
        unit: data.unit,
        quantity: newQty,
        unitCost,
        totalValue,
        warehouseLocation: data.warehouseLocation,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : undefined,
        reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        description: data.description,
        stockImg: data.stockImg,
      },
    });

    // Record adjustment if quantity changed
    if (oldQty !== newQty) {
      await this.prisma.stockHistory.create({
        data: {
          stockId: id,
          movementType: newQty > oldQty ? 'IN' : 'OUT',
          qtyBefore: oldQty,
          qtyChange: Math.abs(newQty - oldQty),
          qtyAfter: newQty,
          unitPrice: unitCost,
          notes: 'Manual stock adjustment',
          createdByAdminId: adminId,
        },
      });
    }

    return updated;
  }

  async remove(id: string) {
    const stock = await this.prisma.stock.findUnique({ where: { id } });
    if (!stock) throw new NotFoundException('Stock not found');
    return this.prisma.stock.delete({ where: { id } });
  }

  async getAlerts(adminId: string) {
    const stocks = await this.prisma.stock.findMany({
      where: { adminId },
      include: { category: { select: { name: true } } },
    });

    const lowStock = stocks.filter((s) => s.quantity <= s.reorderLevel);
    return { lowStock, count: lowStock.length };
  }

  async getHistory(adminId: string) {
    return this.prisma.stockHistory.findMany({
      where: { stock: { adminId } },
      orderBy: { createdAt: 'desc' },
      include: {
        stock: { select: { id: true, sku: true, itemName: true } },
      },
    });
  }

  async getHistoryByStock(stockId: string) {
    const stock = await this.prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock) throw new NotFoundException('Stock not found');
    return this.prisma.stockHistory.findMany({
      where: { stockId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
