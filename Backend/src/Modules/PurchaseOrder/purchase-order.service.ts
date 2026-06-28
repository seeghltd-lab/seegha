import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { ActivityLogService } from '../ActivityLog/activity-log.service';
import { PaymentType, PurchaseOrderStatus, ReceivingStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface CallerCtx {
  id: string;
  type: 'ADMIN' | 'EMPLOYEE';
  name: string;
}

interface CreatePOItemDto {
  itemName: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitCost?: number;
  notes?: string;
  paymentType?: string;
  stockId?: string;
  categoryId?: string;
}

interface CreatePODto {
  supplierId: string;
  siteId?: string;
  notes?: string;
  expectedDate?: string;
  date?: string;
  items: CreatePOItemDto[];
}

interface ReceiveItemDto {
  itemId: string;
  receivedQty: number;
  note?: string;
}

@Injectable()
export class PurchaseOrderService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  private async generatePOReference(): Promise<string> {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let ref: string;
    do {
      ref = 'PO-';
      for (let i = 0; i < 6; i++) {
        ref += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (
      await this.prisma.purchaseOrder.findUnique({ where: { reference: ref } })
    );
    return ref;
  }

  private generateSKUBase(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let sku = 'STK-';
    for (let i = 0; i < 6; i++) {
      sku += chars[Math.floor(Math.random() * chars.length)];
    }
    return sku;
  }

  private async generateUniqueSKU(): Promise<string> {
    let sku = this.generateSKUBase();
    while (await this.prisma.stock.findUnique({ where: { sku } })) {
      sku = this.generateSKUBase();
    }
    return sku;
  }

  async create(data: CreatePODto, caller: CallerCtx) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (data.siteId) {
      const site = await this.prisma.site.findUnique({ where: { id: data.siteId } });
      if (!site) throw new NotFoundException('Site not found');
    }

    const reference = await this.generatePOReference();

    const po = await this.prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        siteId: data.siteId ?? null,
        reference,
        notes: data.notes ?? null,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        date: data.date ? new Date(data.date) : new Date(),
        createdByAdminId: caller.id,
        items: {
          create: data.items.map((item) => ({
            stockId: item.stockId ?? null,
            categoryId: item.categoryId ?? null,
            itemName: item.itemName,
            description: item.description ?? null,
            quantity: new Decimal(item.quantity),
            unit: item.unit ?? null,
            unitCost: item.unitCost != null ? new Decimal(item.unitCost) : null,
            notes: item.notes ?? null,
            paymentType: item.paymentType ?? 'NONE',
          })),
        },
      },
      include: {
        items: {
          include: {
            stock: { select: { id: true, sku: true, itemName: true, unit: true } },
            category: { select: { id: true, name: true } },
          },
        },
        supplier: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true } },
      },
    });

    await this.activityLog.log({
      action: 'PO_CREATED',
      entityType: 'PurchaseOrder',
      entityId: po.id,
      entityLabel: po.reference ?? undefined,
      performedById: caller.id,
      performedByType: caller.type,
      performedByName: caller.name,
      metadata: { supplierId: data.supplierId, siteId: data.siteId, itemCount: data.items.length },
    });

    return po;
  }

  async findAll(filters: {
    supplierId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.status) where.status = filters.status as PurchaseOrderStatus;
    if (filters.search) {
      where.OR = [
        { reference: { contains: filters.search } },
        { notes: { contains: filters.search } },
        { supplier: { name: { contains: filters.search } } },
      ];
    }

    const [purchaseOrders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          supplier: { select: { id: true, name: true, code: true } },
          site: { select: { id: true, name: true } },
          items: {
            select: {
              id: true,
              itemName: true,
              quantity: true,
              unit: true,
              unitCost: true,
              receivedQty: true,
              receivingStatus: true,
              paymentType: true,
              stockId: true,
              categoryId: true,
            },
          },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { purchaseOrders, total, page, limit };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
            contactPerson: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
            paymentTerms: true,
          },
        },
        site: { select: { id: true, name: true, location: true } },
        items: {
          include: {
            stock: { select: { id: true, sku: true, itemName: true, unit: true, quantity: true, siteId: true } },
            category: { select: { id: true, name: true } },
            payments: {
              where: { deletedAt: null },
              select: {
                id: true,
                type: true,
                amount: true,
                quantity: true,
                status: true,
                paidAmount: true,
                reference: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async update(
    id: string,
    caller: CallerCtx,
    body: {
      notes?: string;
      expectedDate?: string;
      siteId?: string;
      items?: Array<{
        id?: string;
        itemName?: string;
        description?: string;
        quantity?: number;
        unit?: string;
        unitCost?: number;
        notes?: string;
        paymentType?: string;
        stockId?: string;
        categoryId?: string;
        remove?: boolean;
      }>;
    },
  ) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === 'CANCELLED') {
      throw new BadRequestException('Cannot edit a cancelled purchase order');
    }

    const updateData: any = {};
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.expectedDate !== undefined) {
      updateData.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
    }
    if (body.siteId !== undefined) updateData.siteId = body.siteId || null;

    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        if (item.id && item.remove) {
          const existing = po.items.find((i) => i.id === item.id);
          if (existing && Number(existing.receivedQty) > 0) {
            throw new BadRequestException(
              `Cannot remove item "${existing.itemName}" that has already been partially received`,
            );
          }
          await this.prisma.purchaseOrderItem.delete({ where: { id: item.id } });
        } else if (item.id) {
          await this.prisma.purchaseOrderItem.update({
            where: { id: item.id },
            data: {
              itemName: item.itemName,
              description: item.description,
              quantity: item.quantity != null ? new Decimal(item.quantity) : undefined,
              unit: item.unit,
              unitCost: item.unitCost != null ? new Decimal(item.unitCost) : undefined,
              notes: item.notes,
              paymentType: item.paymentType,
              stockId: item.stockId ?? undefined,
              categoryId: item.categoryId ?? undefined,
            },
          });
        } else {
          await this.prisma.purchaseOrderItem.create({
            data: {
              purchaseOrderId: id,
              stockId: item.stockId ?? null,
              categoryId: item.categoryId ?? null,
              itemName: item.itemName ?? '',
              description: item.description ?? null,
              quantity: new Decimal(item.quantity ?? 0),
              unit: item.unit ?? null,
              unitCost: item.unitCost != null ? new Decimal(item.unitCost) : null,
              notes: item.notes ?? null,
              paymentType: item.paymentType ?? 'NONE',
            },
          });
        }
      }

      const allItems = await this.prisma.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });
      if (allItems.length === 0) {
        throw new BadRequestException('Purchase order must have at least one item');
      }

      if (po.status === 'FULLY_RECEIVED') {
        const hasUnreceived = allItems.some(
          (i) => i.receivingStatus !== ReceivingStatus.FULLY_RECEIVED,
        );
        if (hasUnreceived) {
          updateData.status = PurchaseOrderStatus.PARTIALLY_RECEIVED;
        }
      }
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { items: true, site: { select: { id: true, name: true } } },
    });

    await this.activityLog.log({
      action: 'PO_UPDATED',
      entityType: 'PurchaseOrder',
      entityId: id,
      entityLabel: po.reference ?? undefined,
      performedById: caller.id,
      performedByType: caller.type,
      performedByName: caller.name,
    });

    return updated;
  }

  async receiveItems(id: string, caller: CallerCtx, items: ReceiveItemDto[]) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            payments: { where: { deletedAt: null } },
          },
        },
      },
    }) as any;
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === 'CANCELLED') {
      throw new BadRequestException('Cannot receive items for a cancelled purchase order');
    }
    if (po.status === 'FULLY_RECEIVED') {
      throw new BadRequestException('All items have already been received');
    }

    for (const receiveData of items) {
      const item = po.items.find((i: any) => i.id === receiveData.itemId);
      if (!item) {
        throw new NotFoundException(`Item ${receiveData.itemId} not found in this purchase order`);
      }

      const newReceivedQty = Number(item.receivedQty) + Number(receiveData.receivedQty);
      const totalQty = Number(item.quantity);

      if (Number(receiveData.receivedQty) <= 0) {
        throw new BadRequestException('Received quantity must be greater than 0');
      }
      if (newReceivedQty > totalQty) {
        throw new BadRequestException(
          `Cannot receive more than ordered for "${item.itemName}". Ordered: ${totalQty}, already received: ${Number(item.receivedQty)}, attempting: ${receiveData.receivedQty}`,
        );
      }

      const newStatus: ReceivingStatus =
        newReceivedQty >= totalQty
          ? ReceivingStatus.FULLY_RECEIVED
          : ReceivingStatus.PARTIALLY_RECEIVED;

      let resolvedStockId = item.stockId;

      if (item.stockId) {
        // Update existing stock quantity
        const stock = await this.prisma.stock.findUnique({ where: { id: item.stockId } });
        if (stock) {
          const addQty = Math.round(Number(receiveData.receivedQty));
          const newQty = stock.quantity + addQty;
          const unitCostToUse = item.unitCost ?? stock.unitCost;
          const newTotalValue = new Decimal(unitCostToUse).times(newQty);

          await this.prisma.stock.update({
            where: { id: stock.id },
            data: { quantity: newQty, totalValue: newTotalValue },
          });

          await this.prisma.stockHistory.create({
            data: {
              stockId: stock.id,
              movementType: 'IN',
              qtyBefore: stock.quantity,
              qtyChange: addQty,
              qtyAfter: newQty,
              unitPrice: new Decimal(unitCostToUse),
              notes: `Received via ${po.reference}`,
              createdByAdminId: caller.id,
              siteId: stock.siteId,
            },
          });

          // Ensure supplier-stock link exists
          await this.prisma.stockSupplier.upsert({
            where: { stockId_supplierId: { stockId: stock.id, supplierId: po.supplierId } },
            create: { stockId: stock.id, supplierId: po.supplierId },
            update: {},
          });
        }
      } else {
        // Create new stock at po.siteId
        const addQty = Math.round(Number(receiveData.receivedQty));
        const unitCost = item.unitCost ?? new Decimal(0);
        const totalValue = new Decimal(unitCost).times(addQty);
        const sku = await this.generateUniqueSKU();

        let newStock: any;
        const existing = await this.prisma.stock.findFirst({
          where: { itemName: item.itemName, siteId: po.siteId ?? null, deletedAt: null },
        });

        if (existing) {
          const newQty = existing.quantity + addQty;
          const newTotalValue = new Decimal(unitCost).times(newQty);
          newStock = await this.prisma.stock.update({
            where: { id: existing.id },
            data: { quantity: newQty, totalValue: newTotalValue },
          });

          await this.prisma.stockHistory.create({
            data: {
              stockId: existing.id,
              movementType: 'IN',
              qtyBefore: existing.quantity,
              qtyChange: addQty,
              qtyAfter: newQty,
              unitPrice: new Decimal(unitCost),
              notes: `Received via ${po.reference}`,
              createdByAdminId: caller.id,
              siteId: po.siteId,
            },
          });
        } else {
          newStock = await this.prisma.stock.create({
            data: {
              sku,
              adminId: caller.id,
              itemName: item.itemName,
              categoryId: item.categoryId ?? null,
              siteId: po.siteId ?? null,
              unit: item.unit ?? '',
              quantity: addQty,
              unitCost: new Decimal(unitCost),
              totalValue,
              receivedDate: new Date(),
              reorderLevel: 5,
            },
          });

          await this.prisma.stockHistory.create({
            data: {
              stockId: newStock.id,
              movementType: 'IN',
              qtyBefore: 0,
              qtyChange: addQty,
              qtyAfter: addQty,
              unitPrice: new Decimal(unitCost),
              notes: `Created via PO ${po.reference}`,
              createdByAdminId: caller.id,
              siteId: po.siteId,
            },
          });
        }

        // Link supplier to stock
        await this.prisma.stockSupplier.upsert({
          where: { stockId_supplierId: { stockId: newStock.id, supplierId: po.supplierId } },
          create: { stockId: newStock.id, supplierId: po.supplierId },
          update: {},
        });

        // Update PO item's stockId
        await this.prisma.purchaseOrderItem.update({
          where: { id: item.id },
          data: { stockId: newStock.id },
        });

        resolvedStockId = newStock.id;
      }

      await this.prisma.purchaseOrderItem.update({
        where: { id: item.id },
        data: {
          receivedQty: new Decimal(newReceivedQty),
          receivingStatus: newStatus,
        },
      });

      if (item.paymentType !== 'NONE') {
        const unitCost = item.unitCost;
        const amount =
          unitCost != null
            ? new Decimal(receiveData.receivedQty).times(unitCost)
            : new Decimal(0);

        await this.prisma.supplierPayment.create({
          data: {
            supplierId: po.supplierId,
            purchaseOrderItemId: item.id,
            stockId: resolvedStockId ?? null,
            requisitionItemId: null,
            type: item.paymentType as PaymentType,
            quantity: new Decimal(receiveData.receivedQty),
            amount,
            reference: po.reference,
            notes: `Received via ${po.reference} — ${item.itemName}`,
            adminId: caller.id,
            status: 'UNPAID',
            paidAmount: new Decimal(0),
          },
        });
      }
    }

    const allItems = await this.prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: id },
    });

    const allFullyReceived = allItems.every(
      (i) => i.receivingStatus === ReceivingStatus.FULLY_RECEIVED,
    );
    const anyReceived = allItems.some(
      (i) => i.receivingStatus !== ReceivingStatus.NOT_RECEIVED,
    );

    const newStatus: PurchaseOrderStatus = allFullyReceived
      ? PurchaseOrderStatus.FULLY_RECEIVED
      : anyReceived
        ? PurchaseOrderStatus.PARTIALLY_RECEIVED
        : PurchaseOrderStatus.PENDING;

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: newStatus },
      include: {
        items: {
          include: {
            stock: { select: { id: true, sku: true, itemName: true } },
            category: { select: { id: true, name: true } },
            payments: { where: { deletedAt: null } },
          },
        },
        site: { select: { id: true, name: true } },
      },
    });

    await this.activityLog.log({
      action: allFullyReceived ? 'PO_FULLY_RECEIVED' : 'PO_ITEMS_RECEIVED',
      entityType: 'PurchaseOrder',
      entityId: id,
      entityLabel: po.reference ?? undefined,
      performedById: caller.id,
      performedByType: caller.type,
      performedByName: caller.name,
      metadata: { itemsReceived: items.length },
    });

    return updated;
  }

  async setItemPaymentType(
    poId: string,
    itemId: string,
    paymentType: string,
    caller: CallerCtx,
  ) {
    const validTypes = ['NONE', 'CREDIT', 'DEBIT'];
    if (!validTypes.includes(paymentType)) {
      throw new BadRequestException(`paymentType must be one of: ${validTypes.join(', ')}`);
    }

    const item = await this.prisma.purchaseOrderItem.findUnique({
      where: { id: itemId },
      include: { payments: { where: { deletedAt: null } } },
    });
    if (!item || item.purchaseOrderId !== poId) {
      throw new NotFoundException('Item not found in this purchase order');
    }
    if (item.payments.length > 0 && Number(item.receivedQty) > 0) {
      throw new BadRequestException(
        'Cannot change payment type after item has been received with an existing payment',
      );
    }

    await this.prisma.purchaseOrderItem.update({
      where: { id: itemId },
      data: { paymentType },
    });

    await this.activityLog.log({
      action: 'PO_ITEM_PAYMENT_TYPE_SET',
      entityType: 'PurchaseOrderItem',
      entityId: itemId,
      entityLabel: item.itemName,
      performedById: caller.id,
      performedByType: caller.type,
      performedByName: caller.name,
      metadata: { paymentType },
    });

    return { success: true };
  }

  async cancel(id: string, caller: CallerCtx, reason?: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === 'CANCELLED') {
      throw new BadRequestException('Purchase order is already cancelled');
    }
    const hasReceived = po.items.some((i) => Number(i.receivedQty) > 0);
    if (hasReceived) {
      throw new BadRequestException(
        'Cannot cancel a purchase order that has items already received',
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
    });

    await this.activityLog.log({
      action: 'PO_CANCELLED',
      entityType: 'PurchaseOrder',
      entityId: id,
      entityLabel: po.reference ?? undefined,
      performedById: caller.id,
      performedByType: caller.type,
      performedByName: caller.name,
      metadata: { reason: reason ?? null },
    });

    return updated;
  }

  async remove(id: string, caller: CallerCtx) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING purchase orders can be deleted');
    }

    await this.prisma.purchaseOrder.delete({ where: { id } });

    await this.activityLog.log({
      action: 'PO_DELETED',
      entityType: 'PurchaseOrder',
      entityId: id,
      entityLabel: po.reference ?? undefined,
      performedById: caller.id,
      performedByType: caller.type,
      performedByName: caller.name,
    });

    return { success: true };
  }
}
