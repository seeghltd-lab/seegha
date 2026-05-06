import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { AppSocketGateway } from '../../Global/socket/socket.gateway';
import { NotificationService } from '../Notification/notification.service';
import { ActivityLogService } from '../ActivityLog/activity-log.service';
import { RequisitionStatus, ReceivingStatus, PaymentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateItemDto {
  stockId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  note?: string;
}

interface CreateRequisitionDto {
  description?: string;
  supplierId?: string;
  employeeId?: string;
  siteId?: string;
  items: CreateItemDto[];
}

interface CreatorContext {
  type: 'ADMIN' | 'EMPLOYEE';
  id: string;
  name: string;
}

interface RequisitionFilters {
  status?: string;
  search?: string;
  page?: string;
  limit?: string;
  employeeId?: string;
}

@Injectable()
export class RequisitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: AppSocketGateway,
    private readonly notifications: NotificationService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(data: CreateRequisitionDto, creator: CreatorContext) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const employeeId = data.employeeId || null;

    const stockIds = data.items
      .map((i) => i.stockId)
      .filter((id): id is string => !!id);

    if (stockIds.length > 0) {
      const stocks = await this.prisma.stock.findMany({
        where: { id: { in: stockIds } },
        select: { id: true },
      });
      const foundIds = new Set(stocks.map((s) => s.id));
      const missing = stockIds.find((id) => !foundIds.has(id));
      if (missing) throw new NotFoundException(`Stock item not found: ${missing}`);
    }

    const requisition = await this.prisma.requisition.create({
      data: {
        description: data.description,
        supplierId: data.supplierId || null,
        employeeId: employeeId || null,
        siteId: data.siteId || null,
        createdByAdminId: creator.type === 'ADMIN' ? creator.id : null,
        items: {
          create: data.items.map((item) => ({
            stockId: item.stockId || null,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            note: item.note || null,
          })),
        },
      },
      include: {
        employee: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { stock: { select: { sku: true, itemName: true } } } },
      },
    });

    const creatorLabel = creator.type === 'ADMIN'
      ? `Admin (${creator.name})`
      : creator.name;

    this.socket.emitToAllAdmins('requisition-created', requisition);

    if (creator.type === 'EMPLOYEE') {
      await this.notifications.createNotification({
        recipients: await this.getAllAdminRecipients(),
        title: 'New Requisition',
        message: `${creator.name} submitted a new requisition (${requisition.items.length} item${requisition.items.length !== 1 ? 's' : ''}).`,
        link: `/admin/requisition-management`,
        senderId: creator.id,
        senderType: 'EMPLOYEE',
      });
    }

    this.activityLog.log({
      action: 'REQUISITION_CREATED',
      entityType: 'Requisition',
      entityId: requisition.id,
      entityLabel: `REQ-${requisition.id.slice(-6).toUpperCase()}`,
      performedById: creator.id,
      performedByType: creator.type,
      performedByName: creatorLabel,
      metadata: { itemCount: requisition.items.length, description: data.description },
    });

    return requisition;
  }

  async findAll(
    filters: RequisitionFilters,
    callerId: string,
    callerRole: 'ADMIN' | 'EMPLOYEE',
  ) {
    const page = parseInt(filters.page ?? '1', 10);
    const limit = parseInt(filters.limit ?? '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (callerRole === 'EMPLOYEE') {
      where.employeeId = callerId;
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.status) {
      where.status = filters.status as RequisitionStatus;
    }

    if (filters.search) {
      where.OR = [
        {
          employee: {
            OR: [
              { firstName: { contains: filters.search } },
              { lastName: { contains: filters.search } },
              { email: { contains: filters.search } },
            ],
          },
        },
        { description: { contains: filters.search } },
      ];
    }

    const [requisitions, total] = await Promise.all([
      this.prisma.requisition.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              position: true,
              profilePicture: true,
            },
          },
          supplier: { select: { id: true, name: true, code: true } },
          items: {
            select: {
              id: true,
              itemName: true,
              quantity: true,
              unit: true,
              receivedQty: true,
              receivingStatus: true,
              costPrice: true,
            },
          },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.requisition.count({ where }),
    ]);

    return {
      requisitions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, callerId: string, callerRole: 'ADMIN' | 'EMPLOYEE') {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, code: true, phone: true } },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            profilePicture: true,
          },
        },
        items: {
          include: {
            stock: {
              select: {
                id: true,
                sku: true,
                itemName: true,
                unit: true,
                quantity: true,
                unitCost: true,
                warehouseLocation: true,
              },
            },
            receivingLogs: {
              orderBy: { receivedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!requisition) throw new NotFoundException('Requisition not found');

    if (callerRole === 'EMPLOYEE' && requisition.employeeId !== callerId) {
      throw new ForbiddenException('Access denied');
    }

    return requisition;
  }

  async approveRequisition(
    id: string,
    approverId: string,
    approverType: 'ADMIN' | 'EMPLOYEE',
    body: { items?: any[]; notes?: string; supplierId?: string },
  ) {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        items: true,
      },
    });

    if (!requisition) throw new NotFoundException('Requisition not found');
    if (requisition.status !== 'PENDING') {
      throw new ForbiddenException('Only pending requisitions can be approved');
    }

    // Optionally edit items before approving
    if (body.items) {
      for (const i of body.items) {
        if (i.remove && i.id) {
          await this.prisma.requisitionItem.delete({ where: { id: i.id } });
          continue;
        }

        // Resolve costPrice: use provided value, else fall back to stock.unitCost
        let costPrice = i.costPrice != null ? Number(i.costPrice) : undefined;
        if (costPrice === undefined && i.stockId) {
          const stock = await this.prisma.stock.findUnique({
            where: { id: i.stockId },
            select: { unitCost: true },
          });
          if (stock) costPrice = Number(stock.unitCost);
        }

        if (i.id) {
          await this.prisma.requisitionItem.update({
            where: { id: i.id },
            data: {
              itemName: i.itemName,
              quantity: i.quantity,
              unit: i.unit,
              note: i.note || null,
              stockId: i.stockId || null,
              costPrice: costPrice ?? null,
              ...(i.paymentType !== undefined ? { paymentType: i.paymentType } : {}),
            },
          });
        } else {
          await this.prisma.requisitionItem.create({
            data: {
              requisitionId: id,
              itemName: i.itemName,
              quantity: i.quantity,
              unit: i.unit,
              note: i.note || null,
              stockId: i.stockId || null,
              costPrice: costPrice ?? null,
              ...(i.paymentType !== undefined ? { paymentType: i.paymentType } : {}),
            },
          });
        }
      }
    }

    const updated = await this.prisma.requisition.update({
      where: { id },
      data: {
        status: RequisitionStatus.APPROVED,
        approvedAt: new Date(),
        ...(body.supplierId !== undefined ? { supplierId: body.supplierId || null } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
        items: true,
        _count: { select: { items: true } },
      },
    });

    if (requisition.employee) {
      this.socket.emitToEmployee(requisition.employee.id, 'requisition-updated', updated);
      await this.notifications.createNotification({
        recipients: [{ id: requisition.employee.id, type: 'EMPLOYEE' }],
        title: 'Requisition Approved',
        message: `Your requisition has been approved${body.notes ? `: ${body.notes}` : '.'}`,
        link: `/requisitions`,
        senderId: approverId,
        senderType: approverType,
      });
    }
    this.socket.emitToAllAdmins('requisition-updated', updated);

    this.activityLog.log({
      action: 'REQUISITION_APPROVED',
      entityType: 'Requisition',
      entityId: id,
      entityLabel: `REQ-${id.slice(-6).toUpperCase()}`,
      performedById: approverId,
      performedByType: approverType,
      metadata: { notes: body.notes, supplierId: body.supplierId },
    });

    return updated;
  }

  async rejectRequisition(id: string, approverId: string, approverType: 'ADMIN' | 'EMPLOYEE', reason: string) {
    if (!reason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const requisition = await this.prisma.requisition.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!requisition) throw new NotFoundException('Requisition not found');
    if (requisition.status !== 'PENDING') {
      throw new ForbiddenException('Only pending requisitions can be rejected');
    }

    const updated = await this.prisma.requisition.update({
      where: { id },
      data: {
        status: RequisitionStatus.REJECTED,
        rejectReason: reason,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    });

    if (requisition.employee) {
      this.socket.emitToEmployee(requisition.employee.id, 'requisition-updated', updated);
      await this.notifications.createNotification({
        recipients: [{ id: requisition.employee.id, type: 'EMPLOYEE' }],
        title: 'Requisition Rejected',
        message: `Your requisition was rejected: ${reason}`,
        link: `/requisitions`,
        senderId: approverId,
        senderType: approverType,
      });
    }
    this.socket.emitToAllAdmins('requisition-updated', updated);

    this.activityLog.log({
      action: 'REQUISITION_REJECTED',
      entityType: 'Requisition',
      entityId: id,
      entityLabel: `REQ-${id.slice(-6).toUpperCase()}`,
      performedById: approverId,
      performedByType: approverType,
      metadata: { reason },
    });

    return updated;
  }

  async receiveItems(
    requisitionId: string,
    receivedById: string,
    receivedByType: 'ADMIN' | 'EMPLOYEE',
    receivedByName: string,
    items: {
      itemId: string;
      receivedQty: number;
      note?: string;
      // Optional: create & link a new stock entry for unlinked items
      newStockData?: {
        unitCost: number;
        siteId?: string;
        categoryId?: string;
        supplierId?: string;
        warehouseLocation?: string;
        reorderLevel?: number;
        expiryDate?: string;
        description?: string;
      };
    }[],
  ) {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id: requisitionId },
      include: {
        employee: { select: { id: true } },
        items: { include: { stock: true } },
      },
    });

    if (!requisition) throw new NotFoundException('Requisition not found');
    if (
      requisition.status !== RequisitionStatus.APPROVED &&
      requisition.status !== RequisitionStatus.PARTIALLY_RECEIVED
    ) {
      throw new ForbiddenException('Only approved requisitions can have items received');
    }

    // Resolve adminId for stock creation (employees use site's adminId)
    let resolvedAdminId = receivedByType === 'ADMIN' ? receivedById : null;

    for (const receiveData of items) {
      const item = requisition.items.find((i) => i.id === receiveData.itemId);
      if (!item) {
        throw new BadRequestException(`Item ${receiveData.itemId} not found`);
      }

      const newReceivedQty = item.receivedQty + receiveData.receivedQty;
      if (newReceivedQty > item.quantity) {
        throw new BadRequestException(
          `Cannot receive more than requested for "${item.itemName}". Requested: ${item.quantity}, Already received: ${item.receivedQty}, Trying: ${receiveData.receivedQty}`,
        );
      }

      // ── Auto-create stock if item has no stockId and newStockData is provided ──
      let effectiveStockId = item.stockId;
      let effectiveStock = item.stock;

      if (!effectiveStockId && receiveData.newStockData) {
        const sd = receiveData.newStockData;

        // Resolve adminId from site if employee
        if (!resolvedAdminId && sd.siteId) {
          const site = await this.prisma.site.findUnique({
            where: { id: sd.siteId },
            select: { adminId: true },
          });
          if (site?.adminId) resolvedAdminId = site.adminId;
        }

        if (!resolvedAdminId) {
          // Fallback: find any admin
          const anyAdmin = await this.prisma.admin.findFirst({ select: { id: true } });
          resolvedAdminId = anyAdmin?.id ?? receivedById;
        }

        // Generate unique SKU
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let sku = 'STK-';
        for (let i = 0; i < 6; i++) sku += chars[Math.floor(Math.random() * chars.length)];
        while (await this.prisma.stock.findUnique({ where: { sku } })) {
          sku = 'STK-';
          for (let i = 0; i < 6; i++) sku += chars[Math.floor(Math.random() * chars.length)];
        }

        const unitCost = new Decimal(sd.unitCost);
        const totalValue = unitCost.times(receiveData.receivedQty);

        const newStock = await this.prisma.stock.create({
          data: {
            sku,
            adminId: resolvedAdminId,
            itemName: item.itemName,
            unit: item.unit,
            quantity: receiveData.receivedQty,
            unitCost,
            totalValue,
            categoryId: sd.categoryId || null,
            supplierId: sd.supplierId || (requisition as any).supplierId || null,
            // Use siteId from newStockData, fall back to the requisition's own siteId
            siteId: sd.siteId || (requisition as any).siteId || null,
            warehouseLocation: sd.warehouseLocation || null,
            receivedDate: new Date(),
            reorderLevel: sd.reorderLevel ?? 5,
            expiryDate: sd.expiryDate ? new Date(sd.expiryDate) : null,
            description: sd.description || `Created from requisition REQ-${requisitionId.slice(-6).toUpperCase()}`,
          },
        });

        await this.prisma.stockHistory.create({
          data: {
            stockId: newStock.id,
            movementType: 'IN',
            qtyBefore: 0,
            qtyChange: receiveData.receivedQty,
            qtyAfter: receiveData.receivedQty,
            unitPrice: unitCost,
            notes: `Created & received via requisition REQ-${requisitionId.slice(-6).toUpperCase()}`,
            createdByAdminId: receivedByType === 'ADMIN' ? receivedById : null,
            createdByEmployeeId: receivedByType === 'EMPLOYEE' ? receivedById : null,
          },
        });

        // Link the RequisitionItem to the new stock
        await this.prisma.requisitionItem.update({
          where: { id: item.id },
          data: { stockId: newStock.id, costPrice: sd.unitCost },
        });

        effectiveStockId = newStock.id;
        effectiveStock = newStock as any;

        // Auto-create payment if paymentType is set
        const paymentType = item.paymentType ?? 'NONE';
        const supplierId = sd.supplierId || (requisition as any).supplierId;
        if (paymentType !== 'NONE' && supplierId) {
          await this.prisma.supplierPayment.create({
            data: {
              supplierId,
              stockId: newStock.id,
              requisitionItemId: item.id,
              type: paymentType as PaymentType,
              quantity: receiveData.receivedQty,
              amount: receiveData.receivedQty * sd.unitCost,
              reference: `REQ-${requisitionId.slice(-6).toUpperCase()}`,
              notes: `New stock created & received via requisition`,
              adminId: resolvedAdminId,
            },
          });
        }

        this.activityLog.log({
          action: 'STOCK_CREATED',
          entityType: 'Stock',
          entityId: newStock.id,
          entityLabel: `${newStock.itemName} (${newStock.sku})`,
          performedById: receivedById,
          performedByType: receivedByType,
          performedByName: receivedByName,
          metadata: { sku: newStock.sku, quantity: receiveData.receivedQty, source: 'requisition-receive' },
        });
      }

      // Create receiving log
      await this.prisma.receivingLog.create({
        data: {
          requisitionItemId: item.id,
          receivedQty: receiveData.receivedQty,
          receivedById,
          receivedByType,
          receivedByName,
          note: receiveData.note || null,
        },
      });

      // Determine new receiving status
      let receivingStatus: ReceivingStatus;
      if (newReceivedQty >= item.quantity) {
        receivingStatus = ReceivingStatus.FULLY_RECEIVED;
      } else if (newReceivedQty > 0) {
        receivingStatus = ReceivingStatus.PARTIALLY_RECEIVED;
      } else {
        receivingStatus = ReceivingStatus.NOT_RECEIVED;
      }

      await this.prisma.requisitionItem.update({
        where: { id: item.id },
        data: { receivedQty: newReceivedQty, receivingStatus },
      });

      // Add received qty to existing stock if linked (and not just created above)
      if (effectiveStockId && effectiveStock && item.stockId) {
        const qtyBefore = (effectiveStock as any).quantity;
        const qtyAfter = qtyBefore + receiveData.receivedQty;
        const unitCost = item.costPrice ?? Number((effectiveStock as any).unitCost);
        const totalValue = qtyAfter * unitCost;

        await this.prisma.stock.update({
          where: { id: effectiveStockId },
          data: { quantity: qtyAfter, totalValue },
        });

        await this.prisma.stockHistory.create({
          data: {
            stockId: effectiveStockId,
            movementType: 'IN',
            qtyBefore,
            qtyChange: receiveData.receivedQty,
            qtyAfter,
            notes: `Received via requisition #${requisitionId.slice(-6).toUpperCase()}`,
            createdByAdminId: receivedByType === 'ADMIN' ? receivedById : null,
          },
        });

        // Auto-create payment if paymentType is set and supplier is linked
        const paymentType = item.paymentType ?? 'NONE';
        if (paymentType !== 'NONE' && (effectiveStock as any).supplierId) {
          await this.prisma.supplierPayment.create({
            data: {
              supplierId: (effectiveStock as any).supplierId,
              stockId: effectiveStockId,
              requisitionItemId: item.id,
              type: paymentType as PaymentType,
              quantity: receiveData.receivedQty,
              amount: receiveData.receivedQty * unitCost,
              reference: `REQ-${requisitionId.slice(-6).toUpperCase()}`,
              notes: `Stock received via requisition`,
              adminId: receivedById,
            },
          });
        }
      }
    }

    // Determine overall requisition status
    const updatedItems = await this.prisma.requisitionItem.findMany({
      where: { requisitionId },
    });

    const allFullyReceived = updatedItems.every(
      (i) => i.receivingStatus === ReceivingStatus.FULLY_RECEIVED,
    );
    const anyReceived = updatedItems.some(
      (i) => i.receivingStatus !== ReceivingStatus.NOT_RECEIVED,
    );

    let newStatus: RequisitionStatus;
    let completedAt: Date | null = null;

    if (allFullyReceived) {
      newStatus = RequisitionStatus.FULLY_RECEIVED;
      completedAt = new Date();
    } else if (anyReceived) {
      newStatus = RequisitionStatus.PARTIALLY_RECEIVED;
    } else {
      newStatus = RequisitionStatus.APPROVED;
    }

    const updated = await this.prisma.requisition.update({
      where: { id: requisitionId },
      data: { status: newStatus, ...(completedAt ? { completedAt } : {}) },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            receivingLogs: {
              orderBy: { receivedAt: 'desc' },
            },
          },
        },
        _count: { select: { items: true } },
      },
    });

    this.socket.emitToAllAdmins('requisition-updated', updated);
    if (requisition.employee) {
      this.socket.emitToEmployee(requisition.employee.id, 'requisition-updated', updated);
      if (allFullyReceived) {
        await this.notifications.createNotification({
          recipients: [{ id: requisition.employee.id, type: 'EMPLOYEE' }],
          title: 'Requisition Fully Received',
          message: 'All items in your requisition have been received.',
          link: `/requisitions`,
          senderId: receivedById,
          senderType: 'ADMIN',
        });
      }
    }

    this.activityLog.log({
      action: allFullyReceived ? 'REQUISITION_FULLY_RECEIVED' : 'REQUISITION_PARTIALLY_RECEIVED',
      entityType: 'Requisition',
      entityId: requisitionId,
      entityLabel: `REQ-${requisitionId.slice(-6).toUpperCase()}`,
      performedById: receivedById,
      performedByType: receivedByType,
      performedByName: receivedByName,
      metadata: { itemsReceived: items.length, newStatus },
    });

    return updated;
  }

  async getReceivingSummary(requisitionId: string) {
    const items = await this.prisma.requisitionItem.findMany({
      where: { requisitionId },
      include: {
        receivingLogs: {
          orderBy: { receivedAt: 'desc' },
        },
      },
    });

    return items.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      quantity: item.quantity,
      receivedQty: item.receivedQty,
      remainingQty: item.quantity - item.receivedQty,
      unit: item.unit,
      receivingStatus: item.receivingStatus,
      costPrice: item.costPrice,
      receivingLogs: item.receivingLogs,
    }));
  }

  async remove(id: string, callerId: string, callerRole: 'ADMIN' | 'EMPLOYEE') {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id },
      select: { id: true, status: true, employeeId: true },
    });

    if (!requisition) throw new NotFoundException('Requisition not found');

    if (callerRole === 'EMPLOYEE') {
      if (requisition.employeeId !== callerId) throw new ForbiddenException('Access denied');
      if (requisition.status !== 'PENDING') {
        throw new BadRequestException('Only pending requisitions can be deleted');
      }
    }

    await this.prisma.requisition.delete({ where: { id } });
    this.socket.emitToAllAdmins('requisition-deleted', { id });

    this.activityLog.log({
      action: 'REQUISITION_DELETED',
      entityType: 'Requisition',
      entityId: id,
      entityLabel: `REQ-${id.slice(-6).toUpperCase()}`,
      performedById: callerId,
      performedByType: callerRole,
    });

    return { message: 'Requisition deleted' };
  }

  private async getAllAdminRecipients(): Promise<{ id: string; type: 'ADMIN' | 'EMPLOYEE' }[]> {
    const admins = await this.prisma.admin.findMany({
      where: { isLocked: false },
      select: { id: true },
    });
    return admins.map((a) => ({ id: a.id, type: 'ADMIN' as const }));
  }
}
