import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { AppSocketGateway } from '../../Global/socket/socket.gateway';
import { NotificationService } from '../Notification/notification.service';
import { RequisitionStatus, ReceivingStatus } from '@prisma/client';

interface CreateItemDto {
  stockId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  note?: string;
}

interface CreateRequisitionDto {
  description?: string;
  items: CreateItemDto[];
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
  ) {}

  async create(data: CreateRequisitionDto, employeeId: string) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

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
        employeeId,
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

    this.socket.emitToAllAdmins('requisition-created', requisition);
    await this.notifications.createNotification({
      recipients: await this.getAllAdminRecipients(),
      title: 'New Requisition',
      message: `${requisition.employee.firstName} ${requisition.employee.lastName} submitted a new requisition (${requisition.items.length} item${requisition.items.length !== 1 ? 's' : ''}).`,
      link: `/admin/requisition-management`,
      senderId: employeeId,
      senderType: 'EMPLOYEE',
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
    body: { items?: any[]; notes?: string },
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
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        items: true,
        _count: { select: { items: true } },
      },
    });

    this.socket.emitToEmployee(requisition.employee.id, 'requisition-updated', updated);
    this.socket.emitToAllAdmins('requisition-updated', updated);

    await this.notifications.createNotification({
      recipients: [{ id: requisition.employee.id, type: 'EMPLOYEE' }],
      title: 'Requisition Approved',
      message: `Your requisition has been approved${body.notes ? `: ${body.notes}` : '.'}`,
      link: `/requisitions`,
      senderId: approverId,
      senderType: approverType,
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

    this.socket.emitToEmployee(requisition.employee.id, 'requisition-updated', updated);
    this.socket.emitToAllAdmins('requisition-updated', updated);

    await this.notifications.createNotification({
      recipients: [{ id: requisition.employee.id, type: 'EMPLOYEE' }],
      title: 'Requisition Rejected',
      message: `Your requisition was rejected: ${reason}`,
      link: `/requisitions`,
      senderId: approverId,
      senderType: approverType,
    });

    return updated;
  }

  async receiveItems(
    requisitionId: string,
    receivedById: string,
    receivedByType: 'ADMIN' | 'EMPLOYEE',
    receivedByName: string,
    items: { itemId: string; receivedQty: number; note?: string }[],
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

      // Deduct stock if linked
      if (item.stockId && item.stock) {
        const qtyBefore = item.stock.quantity;
        const qtyAfter = Math.max(0, qtyBefore - receiveData.receivedQty);
        const unitCost = item.costPrice ?? Number(item.stock.unitCost);

        await this.prisma.stock.update({
          where: { id: item.stockId },
          data: {
            quantity: qtyAfter,
            totalValue: qtyAfter * unitCost,
          },
        });

        await this.prisma.stockHistory.create({
          data: {
            stockId: item.stockId,
            movementType: 'OUT',
            qtyBefore,
            qtyChange: receiveData.receivedQty,
            qtyAfter,
            notes: `Received via requisition #${requisitionId.slice(-6).toUpperCase()}`,
            createdByAdminId: receivedById,
          },
        });
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

    this.socket.emitToEmployee(requisition.employee.id, 'requisition-updated', updated);
    this.socket.emitToAllAdmins('requisition-updated', updated);

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
