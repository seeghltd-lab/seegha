import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { ActivityLogService } from '../ActivityLog/activity-log.service';
import { SupplierStatus, PaymentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  paymentTerms?: string;
  rating?: number;
  status?: SupplierStatus;
  notes?: string;
}

interface SupplierFilters {
  search?: string;
  status?: SupplierStatus;
  page?: number;
  limit?: number;
}

interface AddPaymentDto {
  type: PaymentType;
  amount: number;
  quantity?: number;
  stockId?: string;
  supplierId?: string;
  reference?: string;
  notes?: string;
  date?: string;
  status?: 'UNPAID' | 'PAID' | 'PARTIAL';
  paidAmount?: number;
}

@Injectable()
export class SupplierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  private generateCode(): string {
    const chars = '0123456789ABCDEF';
    let code = 'SUP-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private async uniqueCode(): Promise<string> {
    let code = this.generateCode();
    while (await this.prisma.supplier.findUnique({ where: { code } })) {
      code = this.generateCode();
    }
    return code;
  }

  async create(
    data: CreateSupplierDto,
    callerId: string,
    callerName?: string,
    callerType: 'ADMIN' | 'EMPLOYEE' = 'ADMIN',
  ) {
    if (data.email) {
      // Check email uniqueness globally (not scoped to adminId)
      const existing = await this.prisma.supplier.findFirst({
        where: { email: data.email },
      });
      if (existing) {
        throw new ConflictException(
          'A supplier with this email already exists',
        );
      }
    }

    const code = await this.uniqueCode();
    const adminId = callerType === 'ADMIN' ? callerId : null;

    return this.prisma.supplier.create({
      data: {
        code,
        adminId,
        name: data.name,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country ?? 'Rwanda',
        paymentTerms: data.paymentTerms,
        rating: data.rating ?? 0,
        status: data.status ?? 'ACTIVE',
        notes: data.notes,
      },
    }).then((supplier) => {
      this.activityLog.log({
        action: 'SUPPLIER_CREATED',
        entityType: 'Supplier',
        entityId: supplier.id,
        entityLabel: supplier.name,
        performedById: callerId,
        performedByType: callerType,
        performedByName: callerName,
        metadata: { code: supplier.code, status: supplier.status },
      });
      return supplier;
    });
  }

  async findAll(adminId: string | undefined, filters: SupplierFilters = {}) {
    const { search, status, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    // No adminId scoping — employees see everything
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { code: { contains: search } },
        { contactPerson: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { stockSuppliers: true } } },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      suppliers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const supplier = await (this.prisma.supplier.findUnique as any)({
      where: { id },
      include: {
        stockSuppliers: {
          include: {
            stock: {
              include: {
                category: { select: { id: true, name: true } },
                site: { select: { id: true, name: true } },
              },
            },
          },
        },
        payments: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
          include: {
            stock: { select: { id: true, sku: true, itemName: true, unit: true, unitCost: true, site: { select: { id: true, name: true } } } },
            requisitionItem: {
              select: {
                id: true,
                itemName: true,
                quantity: true,
                unit: true,
                requisitionId: true,
                requisition: { select: { id: true, createdAt: true, status: true } },
              },
            },
            purchaseOrderItem: {
              select: {
                id: true,
                itemName: true,
                quantity: true,
                unit: true,
                purchaseOrderId: true,
                purchaseOrder: { select: { id: true, reference: true, status: true } },
              },
            },
          },
        },
        _count: { select: { stockSuppliers: true } },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    // Flatten junction to stocks array, sorted by receivedDate desc
    const stocks: any[] = (supplier.stockSuppliers ?? [])
      .map((ss: any) => ss.stock)
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());

    const allPayments: any[] = supplier.payments ?? [];

    // Compute payment summary
    let totalCredit = new Decimal(0);
    let totalDebit = new Decimal(0);
    let totalQtyCredit = new Decimal(0);
    let totalQtyDebit = new Decimal(0);
    for (const p of allPayments) {
      if (p.type === 'CREDIT') {
        totalCredit = totalCredit.plus(p.amount);
        totalQtyCredit = totalQtyCredit.plus(p.quantity ?? 0);
      } else {
        totalDebit = totalDebit.plus(p.amount);
        totalQtyDebit = totalQtyDebit.plus(p.quantity ?? 0);
      }
    }
    const balance = totalCredit.minus(totalDebit);

    // Split payments into normal and requisition-linked
    const normalPayments = allPayments.filter((p: any) => !p.requisitionItemId);
    const reqPayments = allPayments.filter((p: any) => !!p.requisitionItemId);
    const reqGroups: Record<string, { requisitionId: string; requisition: any; items: any[] }> = {};
    for (const p of reqPayments) {
      const reqId = p.requisitionItem?.requisitionId ?? 'unknown';
      if (!reqGroups[reqId]) {
        reqGroups[reqId] = {
          requisitionId: reqId,
          requisition: p.requisitionItem?.requisition,
          items: [],
        };
      }
      reqGroups[reqId].items.push(p);
    }

    // Aggregate total stock value
    const totalStockValue = stocks.reduce(
      (sum: Decimal, s: any) => sum.plus(s.totalValue),
      new Decimal(0),
    );

    // Fetch related requisitions (those containing items from this supplier's stocks)
    const stockIds = stocks.map((s: any) => s.id);
    const requisitions = stockIds.length
      ? await this.prisma.requisition.findMany({
          where: { items: { some: { stockId: { in: stockIds } } } },
          orderBy: { createdAt: 'desc' },
          include: {
            employee: { select: { firstName: true, lastName: true } },
            items: {
              where: { stockId: { in: stockIds } },
              select: { id: true, itemName: true, quantity: true, unit: true, costPrice: true, receivingStatus: true },
            },
            _count: { select: { items: true } },
          },
        })
      : [];

    const { stockSuppliers: _ss, ...supplierRest } = supplier as any;
    return {
      ...supplierRest,
      stocks,
      normalPayments,
      requisitionGroups: Object.values(reqGroups),
      paymentSummary: {
        totalCredit: totalCredit.toNumber(),
        totalDebit: totalDebit.toNumber(),
        balance: balance.toNumber(),
        totalQtyCredit: totalQtyCredit.toNumber(),
        totalQtyDebit: totalQtyDebit.toNumber(),
        outstandingQty: totalQtyCredit.minus(totalQtyDebit).toNumber(),
      },
      totalStockValue: totalStockValue.toNumber(),
      requisitions,
    };
  }

  async findForSelect(_adminId?: string) {
    // No scoping — return all active suppliers visible to anyone with access
    return this.prisma.supplier.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, data: Partial<CreateSupplierDto>, adminId?: string, adminName?: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    const updated = await this.prisma.supplier.update({ where: { id }, data });
    this.activityLog.log({
      action: 'SUPPLIER_UPDATED',
      entityType: 'Supplier',
      entityId: id,
      entityLabel: updated.name,
      performedById: adminId ?? 'system',
      performedByType: 'ADMIN',
      performedByName: adminName,
      metadata: { changes: data },
    });
    return updated;
  }

  async remove(id: string, adminId?: string, adminName?: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { stockSuppliers: true, payments: true } } },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (supplier._count.stockSuppliers > 0) {
      throw new BadRequestException(
        `Cannot delete supplier with ${supplier._count.stockSuppliers} linked stock item(s). Reassign or remove them first.`,
      );
    }
    if (supplier._count.payments > 0) {
      throw new BadRequestException(
        `Cannot delete supplier with ${supplier._count.payments} payment record(s). Clear payment history first.`,
      );
    }
    await this.prisma.supplier.delete({ where: { id } });
    this.activityLog.log({
      action: 'SUPPLIER_DELETED',
      entityType: 'Supplier',
      entityId: id,
      entityLabel: supplier.name,
      performedById: adminId ?? 'system',
      performedByType: 'ADMIN',
      performedByName: adminName,
    });
    return { message: 'Supplier deleted' };
  }

  async addPayment(supplierId: string, data: AddPaymentDto, adminId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    if (!data.amount || new Decimal(data.amount).lte(0)) {
      throw new BadRequestException('Amount must be greater than 0');
    }


    return this.prisma.supplierPayment.create({
      data: {
        supplierId,
        stockId: data.stockId || null,
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

  async updatePayment(supplierId: string, paymentId: string, data: Partial<AddPaymentDto>) {
    const payment = await this.prisma.supplierPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.supplierId !== supplierId) throw new BadRequestException('Payment does not belong to this supplier');
    return this.prisma.supplierPayment.update({
      where: { id: paymentId },
      data: {
        ...(data.type      !== undefined && { type: data.type }),
        ...(data.amount    !== undefined && { amount: new Decimal(data.amount) }),
        ...(data.reference !== undefined && { reference: data.reference ?? null }),
        ...(data.notes     !== undefined && { notes: data.notes ?? null }),
        ...(data.date      !== undefined && { date: new Date(data.date) }),
        ...(data.stockId   !== undefined && { stockId: data.stockId || null }),
        ...(data.status     !== undefined && { status: data.status ?? null }),
        ...(data.paidAmount !== undefined && { paidAmount: new Decimal(data.paidAmount) }),
      },
    });
  }

  async deletePayment(supplierId: string, paymentId: string, adminId: string, adminName: string) {
    const payment = await this.prisma.supplierPayment.findFirst({
      where: { id: paymentId, supplierId, deletedAt: null },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    // If deleting a DEBIT that covered credits via PAID_CREDITS notes, restore those credits' statuses
    if (payment.type === 'DEBIT' && (payment.notes as string | null)?.startsWith('PAID_CREDITS:')) {
      const parts = (payment.notes as string).replace('PAID_CREDITS:', '').split(',').filter(Boolean);
      for (const part of parts) {
        const [creditId, paidAmtStr] = part.split('=');
        const paidAmt = parseFloat(paidAmtStr ?? '0');
        if (!creditId?.trim()) continue;
        const credit = await this.prisma.supplierPayment.findUnique({
          where: { id: creditId.trim() },
          select: { paidAmount: true, amount: true },
        });
        if (credit) {
          const newPaid = Math.max(0, parseFloat(credit.paidAmount.toString()) - paidAmt);
          const newStatus =
            newPaid <= 0.001 ? 'UNPAID'
            : newPaid >= parseFloat(credit.amount.toString()) - 0.001 ? 'PAID'
            : 'PARTIAL';
          await this.prisma.supplierPayment.update({
            where: { id: creditId.trim() },
            data: { paidAmount: new Decimal(newPaid), status: newStatus as any },
          });
        }
      }
    }

    await this.prisma.supplierPayment.update({
      where: { id: paymentId },
      data: { deletedAt: new Date() },
    });

    this.activityLog.log({
      action: 'PAYMENT_DELETED',
      entityType: 'SupplierPayment',
      entityId: paymentId,
      entityLabel: `${payment.type} - ${payment.reference ?? paymentId}`,
      performedById: adminId,
      performedByType: 'ADMIN',
      performedByName: adminName,
      metadata: { amount: payment.amount, type: payment.type },
    });

    return { success: true };
  }

  async getPayments(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const payments: any[] = await this.prisma.supplierPayment.findMany({
      where: { supplierId, deletedAt: null },
      orderBy: { date: 'desc' },
      include: {
        stock: { select: { id: true, sku: true, itemName: true, unit: true, site: { select: { id: true, name: true } } } },
        requisitionItem: {
          select: {
            id: true,
            itemName: true,
            quantity: true,
            unit: true,
            requisitionId: true,
            requisition: { select: { id: true, createdAt: true, status: true } },
          },
        },
        purchaseOrderItem: {
          select: {
            id: true,
            itemName: true,
            quantity: true,
            unit: true,
            purchaseOrderId: true,
            purchaseOrder: { select: { id: true, reference: true, status: true } },
          },
        },
      },
    } as any);

    const normalPayments = payments.filter((p: any) => !p.requisitionItemId);
    const reqPayments = payments.filter((p: any) => !!p.requisitionItemId);

    // Group reqPayments by requisitionId
    const reqGroups: Record<string, { requisitionId: string; requisition: any; items: any[] }> = {};
    for (const p of reqPayments) {
      const reqId = p.requisitionItem?.requisitionId ?? 'unknown';
      if (!reqGroups[reqId]) {
        reqGroups[reqId] = {
          requisitionId: reqId,
          requisition: p.requisitionItem?.requisition,
          items: [],
        };
      }
      reqGroups[reqId].items.push(p);
    }

    // Compute summary over ALL payments
    let totalCredit = new Decimal(0);
    let totalDebit = new Decimal(0);
    let totalQtyCredit = new Decimal(0);
    let totalQtyDebit = new Decimal(0);
    for (const p of payments) {
      if (p.type === 'CREDIT') {
        totalCredit = totalCredit.plus(p.amount);
        totalQtyCredit = totalQtyCredit.plus(p.quantity ?? 0);
      } else {
        totalDebit = totalDebit.plus(p.amount);
        totalQtyDebit = totalQtyDebit.plus(p.quantity ?? 0);
      }
    }

    return {
      normalPayments,
      requisitionGroups: Object.values(reqGroups),
      summary: {
        totalCredit: totalCredit.toNumber(),
        totalDebit: totalDebit.toNumber(),
        balance: totalCredit.minus(totalDebit).toNumber(),
        totalQtyCredit: totalQtyCredit.toNumber(),
        totalQtyDebit: totalQtyDebit.toNumber(),
      },
    };
  }

  async addStockPayment(stockId: string, data: AddPaymentDto, adminId: string) {
    const stock = await this.prisma.stock.findUnique({ where: { id: stockId }, select: { id: true } });
    if (!stock) throw new NotFoundException('Stock not found');

    let resolvedSupplierId: string;
    if (data.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier) throw new NotFoundException('Supplier not found');
      await this.prisma.stockSupplier.upsert({
        where: { stockId_supplierId: { stockId, supplierId: data.supplierId } },
        create: { stockId, supplierId: data.supplierId },
        update: {},
      });
      resolvedSupplierId = data.supplierId;
    } else {
      const junction = await this.prisma.stockSupplier.findFirst({ where: { stockId } });
      if (!junction) throw new BadRequestException('This stock item has no linked supplier');
      resolvedSupplierId = junction.supplierId;
    }

    return this.prisma.supplierPayment.create({
      data: {
        supplierId: resolvedSupplierId,
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
    if (!stock) throw new NotFoundException('Stock not found');

    const payments = await this.prisma.supplierPayment.findMany({
      where: { stockId },
      orderBy: { date: 'desc' },
    });

    let totalCredit = new Decimal(0);
    let totalDebit = new Decimal(0);
    for (const p of payments) {
      if (p.type === 'CREDIT') totalCredit = totalCredit.plus(p.amount);
      else totalDebit = totalDebit.plus(p.amount);
    }

    return {
      payments,
      summary: {
        totalCredit: totalCredit.toNumber(),
        totalDebit: totalDebit.toNumber(),
        balance: totalCredit.minus(totalDebit).toNumber(),
      },
    };
  }
}
