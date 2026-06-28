import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerAdmin(data: {
    names: string;
    email: string;
    password: string;
    role?: AdminRole;
  }) {
    const existing = await this.prisma.admin.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new BadRequestException('An admin with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const admin = await this.prisma.admin.create({
      data: {
        names: data.names,
        email: data.email,
        password: hashedPassword,
        role: data.role || AdminRole.ADMIN,
      },
    });

    const { password: _, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  async adminLogin(credentials: { identifier: string; password: string }) {
    const admin = await this.prisma.admin.findFirst({
      where: {
        OR: [
          { email: credentials.identifier },
          { phone: credentials.identifier },
        ],
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email, phone or password');
    }

    if (admin.isLocked) {
      throw new UnauthorizedException('This admin account is locked');
    }

    const passwordValid = await bcrypt.compare(
      credentials.password,
      admin.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      id: admin.id,
      email: admin.email,
      names: admin.names,
      role: admin.role,
    };

    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '7d',
    });

    const { password: _, ...adminWithoutPassword } = admin;
    return { admin: adminWithoutPassword, token };
  }

  async getProfile(adminId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new NotFoundException('Admin not found');
    const { password: _, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  async editProfile(
    adminId: string,
    data: { names?: string; email?: string; phone?: string; profilePicture?: string },
  ) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new NotFoundException('Admin not found');

    if (data.email && data.email !== admin.email) {
      const existing = await this.prisma.admin.findUnique({
        where: { email: data.email },
      });
      if (existing) {
        throw new BadRequestException('Email already in use');
      }
    }

    const updated = await this.prisma.admin.update({
      where: { id: adminId },
      data: {
        ...(data.names && { names: data.names }),
        ...(data.email && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.profilePicture && { profilePicture: data.profilePicture }),
      },
    });

    const { password: _, ...adminWithoutPassword } = updated;
    return adminWithoutPassword;
  }

  async changePassword(
    adminId: string,
    data: { currentPassword: string; newPassword: string },
  ) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new NotFoundException('Admin not found');

    const valid = await bcrypt.compare(data.currentPassword, admin.password);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(data.newPassword, 10);
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashed },
    });

    return { message: 'Password changed successfully' };
  }

  async lockAdmin(adminId: string) {
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { isLocked: true },
    });
    return { message: 'Admin account locked' };
  }

  async unlockAdmin(adminId: string) {
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { isLocked: false },
    });
    return { message: 'Admin account unlocked' };
  }

  async getAllAdmins() {
    const admins = await this.prisma.admin.findMany({
      select: {
        id: true,
        names: true,
        email: true,
        role: true,
        isLocked: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return admins;
  }

  private getPeriodRange(
    period: string,
    fromStr?: string,
    toStr?: string,
  ): { start: Date; end: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (period) {
      case 'today':
        return { start: today, end: tomorrow };
      case 'week': {
        const s = new Date(today);
        s.setDate(today.getDate() - 7);
        return { start: s, end: tomorrow };
      }
      case 'month': {
        const s = new Date(today);
        s.setDate(today.getDate() - 30);
        return { start: s, end: tomorrow };
      }
      case 'quarter': {
        const s = new Date(today);
        s.setDate(today.getDate() - 90);
        return { start: s, end: tomorrow };
      }
      case 'year': {
        const s = new Date(today);
        s.setFullYear(today.getFullYear() - 1);
        return { start: s, end: tomorrow };
      }
      case 'custom':
        return {
          start: fromStr ? new Date(fromStr) : today,
          end: toStr
            ? new Date(new Date(toStr).getTime() + 86_400_000)
            : tomorrow,
        };
      default:
        return { start: today, end: tomorrow };
    }
  }

  async getDashboard(
    adminId: string,
    period = 'today',
    fromDate?: string,
    toDate?: string,
  ) {
    const { start, end } = this.getPeriodRange(period, fromDate, toDate);

    const [
      stockAgg,
      pendingReqCount,
      totalEmployees,
      activeEmployees,
      totalSuppliers,
      totalSites,
      totalCategories,
    ] = await Promise.all([
      this.prisma.stock.aggregate({
        where: { deletedAt: null },
        _sum: { totalValue: true },
        _count: { id: true },
      }),
      this.prisma.requisition.count({ where: { status: 'PENDING' } }),
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.supplier.count(),
      this.prisma.site.count(),
      this.prisma.category.count(),
    ]);

    const lowStockResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM Stock
      WHERE deletedAt IS NULL AND quantity <= reorderLevel
    `;
    const lowStockCount = Number(lowStockResult[0].count);

    // Movements in period grouped by day
    const rawMovements = await this.prisma.$queryRaw<
      { date: Date; movementType: string; qty: bigint }[]
    >`
      SELECT DATE(sh.createdAt) as date, sh.movementType,
             SUM(ABS(sh.qtyChange)) as qty
      FROM StockHistory sh
      JOIN Stock s ON sh.stockId = s.id
      WHERE sh.createdAt >= ${start}
        AND sh.createdAt < ${end}
      GROUP BY DATE(sh.createdAt), sh.movementType
      ORDER BY DATE(sh.createdAt) ASC
    `;

    const movementMap = new Map<string, { in: number; out: number }>();
    for (const m of rawMovements) {
      const dateStr = new Date(m.date).toISOString().slice(0, 10);
      if (!movementMap.has(dateStr)) movementMap.set(dateStr, { in: 0, out: 0 });
      const entry = movementMap.get(dateStr)!;
      if (m.movementType === 'IN') entry.in += Number(m.qty);
      if (m.movementType === 'OUT') entry.out += Number(m.qty);
    }
    const movements = Array.from(movementMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));

    // Recent activity in period
    const recentActivity = await this.prisma.activityLog.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    // Site utilization
    const sites = await this.prisma.site.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { stocks: true } },
      },
      orderBy: { name: 'asc' },
    });

    const siteValueRows = await this.prisma.$queryRaw<
      { siteId: string; total: number }[]
    >`
      SELECT siteId, SUM(CAST(totalValue AS DECIMAL(14,2))) as total
      FROM Stock WHERE deletedAt IS NULL AND siteId IS NOT NULL
      GROUP BY siteId
    `;
    const siteValueMap = new Map(
      siteValueRows.map((r) => [r.siteId, Number(r.total)]),
    );

    const siteUtilization = sites.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      stockCount: s._count.stocks,
      totalValue: siteValueMap.get(s.id) || 0,
    }));

    // Pending approvals queue
    const approvalsQueue = await this.prisma.requisition.findMany({
      where: { status: 'PENDING' },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, position: true },
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    return {
      period: { label: period, from: start.toISOString(), to: end.toISOString() },
      kpi: {
        inventoryValue: Number(stockAgg._sum.totalValue ?? 0),
        totalSKUs: stockAgg._count.id,
        pendingRequisitions: pendingReqCount,
        lowStockCount,
        totalEmployees,
        activeEmployees,
        totalSuppliers,
        totalSites,
        totalCategories,
      },
      movements,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityLabel: a.entityLabel,
        performedByName: a.performedByName,
        performedByType: a.performedByType,
        createdAt: a.createdAt,
      })),
      siteUtilization,
      approvalsQueue: approvalsQueue.map((r) => ({
        id: r.id,
        employee: r.employee,
        itemCount: r._count.items,
        createdAt: r.createdAt,
      })),
    };
  }

  async getReports(
    adminId: string,
    period = 'month',
    fromDate?: string,
    toDate?: string,
  ) {
    const { start, end } = this.getPeriodRange(period, fromDate, toDate);
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // ── Stock Health ────────────────────────────────────────────────
    const [
      stockAgg,
      lowStockItems,
      outOfStockItems,
      expiringItems,
      topValueItems,
      categoryBreakdown,
      materialCount,
      equipmentCount,
    ] = await Promise.all([
      this.prisma.stock.aggregate({
        where: { deletedAt: null },
        _sum: { totalValue: true },
        _count: { id: true },
      }),
      this.prisma.$queryRaw<{
        id: string; sku: string; itemName: string; quantity: number;
        reorderLevel: number; unit: string; categoryName: string | null; siteName: string | null;
      }[]>`
        SELECT s.id, s.sku, s.itemName, s.quantity, s.reorderLevel, s.unit,
               c.name AS categoryName, si.name AS siteName
        FROM Stock s
        LEFT JOIN Category c ON s.categoryId = c.id
        LEFT JOIN Site si ON s.siteId = si.id
        WHERE s.deletedAt IS NULL AND s.quantity > 0 AND s.reorderLevel > 0
          AND s.quantity <= s.reorderLevel
        ORDER BY (s.reorderLevel - s.quantity) DESC
        LIMIT 50
      `,
      this.prisma.$queryRaw<{
        id: string; sku: string; itemName: string; unit: string;
        categoryName: string | null; siteName: string | null;
      }[]>`
        SELECT s.id, s.sku, s.itemName, s.unit,
               c.name AS categoryName, si.name AS siteName
        FROM Stock s
        LEFT JOIN Category c ON s.categoryId = c.id
        LEFT JOIN Site si ON s.siteId = si.id
        WHERE s.deletedAt IS NULL AND s.quantity = 0
        ORDER BY s.itemName ASC
        LIMIT 50
      `,
      this.prisma.$queryRaw<{
        id: string; sku: string; itemName: string; quantity: number; unit: string;
        expiryDate: Date; siteName: string | null;
      }[]>`
        SELECT s.id, s.sku, s.itemName, s.quantity, s.unit, s.expiryDate,
               si.name AS siteName
        FROM Stock s
        LEFT JOIN Site si ON s.siteId = si.id
        WHERE s.deletedAt IS NULL AND s.expiryDate IS NOT NULL
          AND s.expiryDate > ${now} AND s.expiryDate <= ${in90Days}
        ORDER BY s.expiryDate ASC
        LIMIT 30
      `,
      this.prisma.$queryRaw<{
        id: string; sku: string; itemName: string; totalValue: number;
        quantity: number; unit: string;
      }[]>`
        SELECT id, sku, itemName, CAST(totalValue AS DECIMAL(14,2)) AS totalValue,
               quantity, unit
        FROM Stock
        WHERE deletedAt IS NULL
        ORDER BY CAST(totalValue AS DECIMAL(14,2)) DESC
        LIMIT 10
      `,
      this.prisma.$queryRaw<{
        categoryName: string; count: bigint; totalValue: number;
      }[]>`
        SELECT COALESCE(c.name, 'Uncategorised') AS categoryName,
               COUNT(s.id) AS count,
               SUM(CAST(s.totalValue AS DECIMAL(14,2))) AS totalValue
        FROM Stock s
        LEFT JOIN Category c ON s.categoryId = c.id
        WHERE s.deletedAt IS NULL
        GROUP BY c.name
        ORDER BY totalValue DESC
      `,
      this.prisma.stock.count({ where: { deletedAt: null, stockType: 'MATERIAL' } }),
      this.prisma.stock.count({ where: { deletedAt: null, stockType: 'EQUIPMENT' } }),
    ]);

    // ── Stock Movements (period) ────────────────────────────────────
    const [rawMovements, rawTopOut, pendingMigrations, movTotals] = await Promise.all([
      this.prisma.$queryRaw<{ date: Date; movementType: string; qty: bigint }[]>`
        SELECT DATE(sh.createdAt) AS date, sh.movementType,
               SUM(ABS(sh.qtyChange)) AS qty
        FROM StockHistory sh
        WHERE sh.createdAt >= ${start} AND sh.createdAt < ${end}
        GROUP BY DATE(sh.createdAt), sh.movementType
        ORDER BY DATE(sh.createdAt) ASC
      `,
      this.prisma.$queryRaw<{ itemName: string; totalOut: bigint }[]>`
        SELECT s.itemName, SUM(ABS(sh.qtyChange)) AS totalOut
        FROM StockHistory sh
        JOIN Stock s ON sh.stockId = s.id
        WHERE sh.createdAt >= ${start} AND sh.createdAt < ${end}
          AND sh.movementType = 'OUT'
        GROUP BY s.itemName
        ORDER BY totalOut DESC
        LIMIT 10
      `,
      this.prisma.stockMigration.findMany({
        where: { status: 'IN_TRANSIT' },
        select: {
          id: true, quantity: true, unit: true, status: true, createdAt: true,
          stock: { select: { itemName: true } },
          sourceSite: { select: { name: true } },
          destinationSite: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.$queryRaw<{ movementType: string; total: bigint }[]>`
        SELECT movementType, SUM(ABS(qtyChange)) AS total
        FROM StockHistory
        WHERE createdAt >= ${start} AND createdAt < ${end}
          AND movementType IN ('IN', 'OUT', 'ADJUSTMENT')
        GROUP BY movementType
      `,
    ]);

    const movementMap = new Map<string, { in: number; out: number }>();
    for (const m of rawMovements) {
      const dateStr = new Date(m.date).toISOString().slice(0, 10);
      if (!movementMap.has(dateStr)) movementMap.set(dateStr, { in: 0, out: 0 });
      const entry = movementMap.get(dateStr)!;
      if (m.movementType === 'IN') entry.in += Number(m.qty);
      if (m.movementType === 'OUT') entry.out += Number(m.qty);
    }
    const dailyTrend = Array.from(movementMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));

    const totalsMap = new Map(movTotals.map((t) => [t.movementType, Number(t.total)]));

    // ── Stockouts ───────────────────────────────────────────────────
    const activeStockOuts = await this.prisma.stockOut.findMany({
      where: { status: 'OUT' },
      select: {
        id: true, quantity: true, unit: true, date: true,
        recordedByName: true, notes: true,
        stock: { select: { itemName: true, sku: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const stockOutBySite = new Map<string, { siteName: string; count: number; totalQty: number }>();
    for (const so of activeStockOuts) {
      const key = so.site?.id ?? 'unknown';
      if (!stockOutBySite.has(key)) {
        stockOutBySite.set(key, { siteName: so.site?.name ?? 'Unknown', count: 0, totalQty: 0 });
      }
      const entry = stockOutBySite.get(key)!;
      entry.count += 1;
      entry.totalQty += Number(so.quantity);
    }

    // ── Purchase Orders ─────────────────────────────────────────────
    const [poStatusCounts, overdueOrders, recentOrders] = await Promise.all([
      this.prisma.$queryRaw<{ status: string; count: bigint }[]>`
        SELECT status, COUNT(*) AS count FROM PurchaseOrder GROUP BY status
      `,
      this.prisma.purchaseOrder.findMany({
        where: {
          status: { notIn: ['FULLY_RECEIVED', 'CANCELLED'] },
          expectedDate: { lt: now, not: null },
        },
        select: {
          id: true, reference: true, status: true, expectedDate: true, date: true,
          supplier: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { expectedDate: 'asc' },
        take: 20,
      }),
      this.prisma.purchaseOrder.findMany({
        select: {
          id: true, reference: true, status: true, date: true,
          supplier: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ]);

    // ── Suppliers ───────────────────────────────────────────────────
    const [supplierStatusCounts, outstandingPayments, topSuppliers] = await Promise.all([
      this.prisma.$queryRaw<{ status: string; count: bigint }[]>`
        SELECT status, COUNT(*) AS count FROM Supplier GROUP BY status
      `,
      this.prisma.$queryRaw<[{ outstanding: number }]>`
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(14,2)) - CAST(paidAmount AS DECIMAL(14,2))), 0) AS outstanding
        FROM SupplierPayment
        WHERE status IN ('UNPAID', 'PARTIAL')
      `,
      this.prisma.$queryRaw<{ supplierId: string; supplierName: string; orderCount: bigint; totalValue: number }[]>`
        SELECT po.supplierId, s.name AS supplierName,
               COUNT(po.id) AS orderCount,
               COALESCE(SUM(poi.quantity * poi.unitCost), 0) AS totalValue
        FROM PurchaseOrder po
        JOIN Supplier s ON po.supplierId = s.id
        LEFT JOIN PurchaseOrderItem poi ON poi.purchaseOrderId = po.id
        GROUP BY po.supplierId, s.name
        ORDER BY orderCount DESC
        LIMIT 5
      `,
    ]);

    // ── Requisitions ────────────────────────────────────────────────
    const [reqStatusCounts, pendingApprovals] = await Promise.all([
      this.prisma.$queryRaw<{ status: string; count: bigint }[]>`
        SELECT status, COUNT(*) AS count FROM Requisition GROUP BY status
      `,
      this.prisma.requisition.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true, createdAt: true,
          employee: { select: { firstName: true, lastName: true, position: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
      }),
    ]);

    // ── Sites ───────────────────────────────────────────────────────
    const [siteStatusCounts, allSites, siteValueRows, siteExpenseRows, latestWorkerRows] =
      await Promise.all([
        this.prisma.$queryRaw<{ status: string; count: bigint }[]>`
          SELECT status, COUNT(*) AS count FROM Site GROUP BY status
        `,
        this.prisma.site.findMany({
          select: { id: true, name: true, status: true, _count: { select: { stocks: true } } },
          orderBy: { name: 'asc' },
        }),
        this.prisma.$queryRaw<{ siteId: string; total: number }[]>`
          SELECT siteId, SUM(CAST(totalValue AS DECIMAL(14,2))) AS total
          FROM Stock WHERE deletedAt IS NULL AND siteId IS NOT NULL GROUP BY siteId
        `,
        this.prisma.$queryRaw<{ siteId: string; total: number }[]>`
          SELECT siteId, SUM(CAST(amount AS DECIMAL(14,2))) AS total
          FROM SiteExpense
          WHERE createdAt >= ${start} AND createdAt < ${end}
          GROUP BY siteId
        `,
        this.prisma.$queryRaw<{ siteId: string; workerCount: number }[]>`
          SELECT siteId, workerCount
          FROM SiteWorkerRecord sw1
          WHERE createdAt = (
            SELECT MAX(sw2.createdAt) FROM SiteWorkerRecord sw2 WHERE sw2.siteId = sw1.siteId
          )
        `,
      ]);

    const siteValueMap = new Map(siteValueRows.map((r) => [r.siteId, Number(r.total)]));
    const siteExpenseMap = new Map(siteExpenseRows.map((r) => [r.siteId, Number(r.total)]));
    const siteWorkerMap = new Map(latestWorkerRows.map((r) => [r.siteId, r.workerCount]));

    return {
      period: { label: period, from: start.toISOString(), to: end.toISOString() },

      stock: {
        totalSKUs: stockAgg._count.id,
        totalValue: Number(stockAgg._sum.totalValue ?? 0),
        lowStockItems: (lowStockItems as any[]).map((s) => ({
          id: s.id, sku: s.sku, itemName: s.itemName,
          quantity: Number(s.quantity), reorderLevel: Number(s.reorderLevel),
          unit: s.unit, categoryName: s.categoryName, siteName: s.siteName,
          deficit: Number(s.reorderLevel) - Number(s.quantity),
        })),
        outOfStockItems: (outOfStockItems as any[]).map((s) => ({
          id: s.id, sku: s.sku, itemName: s.itemName,
          unit: s.unit, categoryName: s.categoryName, siteName: s.siteName,
        })),
        expiringItems: (expiringItems as any[]).map((s) => {
          const daysLeft = Math.ceil(
            (new Date(s.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          return {
            id: s.id, sku: s.sku, itemName: s.itemName,
            quantity: Number(s.quantity), unit: s.unit,
            expiryDate: s.expiryDate, daysLeft, siteName: s.siteName,
          };
        }),
        topValueItems: (topValueItems as any[]).map((s) => ({
          id: s.id, sku: s.sku, itemName: s.itemName,
          totalValue: Number(s.totalValue), quantity: Number(s.quantity), unit: s.unit,
        })),
        categoryBreakdown: (categoryBreakdown as any[]).map((c) => ({
          categoryName: c.categoryName,
          count: Number(c.count),
          totalValue: Number(c.totalValue ?? 0),
        })),
        byType: { MATERIAL: materialCount, EQUIPMENT: equipmentCount },
      },

      movements: {
        totalIn: totalsMap.get('IN') ?? 0,
        totalOut: totalsMap.get('OUT') ?? 0,
        totalAdjustments: totalsMap.get('ADJUSTMENT') ?? 0,
        dailyTrend,
        topOutItems: rawTopOut.map((r) => ({
          itemName: r.itemName,
          totalOut: Number(r.totalOut),
        })),
        pendingMigrations: pendingMigrations.map((m) => ({
          id: m.id, quantity: m.quantity, unit: m.unit, status: m.status,
          itemName: m.stock?.itemName ?? '—',
          fromSite: m.sourceSite?.name ?? '—',
          toSite: m.destinationSite?.name ?? '—',
          createdAt: m.createdAt,
        })),
      },

      stockOuts: {
        totalActive: activeStockOuts.length,
        activeItems: activeStockOuts.map((so) => ({
          id: so.id, quantity: Number(so.quantity), unit: so.unit,
          date: so.date, recordedByName: so.recordedByName, notes: so.notes,
          itemName: so.stock?.itemName ?? '—', sku: so.stock?.sku ?? '—',
          siteName: so.site?.name ?? '—',
        })),
        bySite: Array.from(stockOutBySite.values()).sort((a, b) => b.count - a.count),
      },

      purchaseOrders: {
        statusCounts: Object.fromEntries(
          poStatusCounts.map((r) => [r.status, Number(r.count)]),
        ),
        overdueOrders: overdueOrders.map((po) => ({
          id: po.id, reference: po.reference, status: po.status,
          expectedDate: po.expectedDate,
          daysPastDue: po.expectedDate
            ? Math.floor((now.getTime() - new Date(po.expectedDate).getTime()) / 86_400_000)
            : 0,
          supplierName: po.supplier?.name ?? '—',
          itemCount: po._count.items,
        })),
        recentOrders: recentOrders.map((po) => ({
          id: po.id, reference: po.reference, status: po.status, date: po.date,
          supplierName: po.supplier?.name ?? '—',
          itemCount: po._count.items,
        })),
      },

      suppliers: {
        statusCounts: Object.fromEntries(
          supplierStatusCounts.map((r) => [r.status, Number(r.count)]),
        ),
        outstanding: Number((outstandingPayments as any[])[0]?.outstanding ?? 0),
        topSuppliers: (topSuppliers as any[]).map((s) => ({
          supplierId: s.supplierId,
          supplierName: s.supplierName,
          orderCount: Number(s.orderCount),
          totalValue: Number(s.totalValue ?? 0),
        })),
      },

      requisitions: {
        statusCounts: Object.fromEntries(
          reqStatusCounts.map((r) => [r.status, Number(r.count)]),
        ),
        pendingApprovals: pendingApprovals.map((r) => ({
          id: r.id, createdAt: r.createdAt,
          employeeName: `${r.employee?.firstName ?? ''} ${r.employee?.lastName ?? ''}`.trim(),
          position: r.employee?.position ?? '',
          itemCount: r._count.items,
        })),
      },

      sites: {
        statusCounts: Object.fromEntries(
          siteStatusCounts.map((r) => [r.status, Number(r.count)]),
        ),
        siteDetails: allSites.map((s) => ({
          id: s.id, name: s.name, status: s.status,
          stockCount: s._count.stocks,
          stockValue: siteValueMap.get(s.id) ?? 0,
          workerCount: siteWorkerMap.get(s.id) ?? 0,
          expenseTotal: siteExpenseMap.get(s.id) ?? 0,
        })),
      },
    };
  }
}
