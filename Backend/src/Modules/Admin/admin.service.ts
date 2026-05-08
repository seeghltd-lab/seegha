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

  async adminLogin(credentials: { email: string; password: string }) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: credentials.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (admin.isLocked) {
      throw new UnauthorizedException('This admin account is locked');
    }

    const passwordValid = await bcrypt.compare(
      credentials.password,
      admin.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
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
}
