import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { AppSocketGateway } from '../../Global/socket/socket.gateway';
import { NotificationService } from '../Notification/notification.service';
import { RequisitionStatus } from '@prisma/client';

interface CreateItemDto {
  stockId?: string;
  itemName: string;
  quantity: number;
  unit: string;
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

    // Validate any stockIds provided
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
      if (missing) {
        throw new NotFoundException(`Stock item not found: ${missing}`);
      }
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
          })),
        },
      },
      include: {
        employee: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { stock: { select: { sku: true, itemName: true } } } },
      },
    });

    // Notify all admins
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

    // Employees only see their own
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
                warehouseLocation: true,
              },
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

  async updateStatus(
    id: string,
    status: RequisitionStatus,
    adminId: string,
    notes?: string,
  ) {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            stock: { select: { id: true, quantity: true, itemName: true } },
          },
        },
      },
    });

    if (!requisition) throw new NotFoundException('Requisition not found');

    if (requisition.status === status) {
      throw new BadRequestException(`Requisition is already ${status}`);
    }

    // Only allow logical transitions
    const allowed: Record<RequisitionStatus, RequisitionStatus[]> = {
      PENDING: ['APPROVED', 'REJECTED'],
      APPROVED: ['COMPLETED'],
      REJECTED: [],
      COMPLETED: [],
    };
    if (!allowed[requisition.status].includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${requisition.status} to ${status}`,
      );
    }

    // Deduct stock when approving
    if (status === 'APPROVED') {
      for (const item of requisition.items) {
        if (!item.stockId || !item.stock) continue;
        const qtyNeeded = Math.ceil(item.quantity);
        if (item.stock.quantity < qtyNeeded) {
          throw new BadRequestException(
            `Insufficient stock for "${item.stock.itemName}": need ${qtyNeeded}, have ${item.stock.quantity}`,
          );
        }
        const qtyBefore = item.stock.quantity;
        const qtyAfter = qtyBefore - qtyNeeded;
        await this.prisma.stock.update({
          where: { id: item.stockId },
          data: {
            quantity: qtyAfter,
            totalValue: { decrement: item.quantity },
          },
        });
        await this.prisma.stockHistory.create({
          data: {
            stockId: item.stockId,
            movementType: 'OUT',
            qtyBefore,
            qtyChange: qtyNeeded,
            qtyAfter,
            notes: `Requisition #${id.slice(-6).toUpperCase()} approved`,
            createdByAdminId: adminId,
          },
        });
      }
    }

    const updated = await this.prisma.requisition.update({
      where: { id },
      data: {
        status,
        description: notes
          ? `${requisition.description ? requisition.description + '\n\n' : ''}[Admin note] ${notes}`
          : undefined,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    });

    // Notify the employee
    const statusLabels: Record<RequisitionStatus, string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      COMPLETED: 'Completed',
    };

    this.socket.emitToEmployee(requisition.employee.id, 'requisition-updated', updated);
    await this.notifications.createNotification({
      recipients: [{ id: requisition.employee.id, type: 'EMPLOYEE' }],
      title: `Requisition ${statusLabels[status]}`,
      message: `Your requisition has been ${status.toLowerCase()}${notes ? `: ${notes}` : '.'}`,
      link: `/requisitions`,
      senderId: adminId,
      senderType: 'ADMIN',
    });

    // Also update admin sockets
    this.socket.emitToAllAdmins('requisition-updated', updated);

    return updated;
  }

  async remove(id: string, callerId: string, callerRole: 'ADMIN' | 'EMPLOYEE') {
    const requisition = await this.prisma.requisition.findUnique({
      where: { id },
      select: { id: true, status: true, employeeId: true },
    });

    if (!requisition) throw new NotFoundException('Requisition not found');

    if (callerRole === 'EMPLOYEE') {
      if (requisition.employeeId !== callerId) {
        throw new ForbiddenException('Access denied');
      }
      if (requisition.status !== 'PENDING') {
        throw new BadRequestException('Only pending requisitions can be deleted');
      }
    }

    await this.prisma.requisition.delete({ where: { id } });
    this.socket.emitToAllAdmins('requisition-deleted', { id });
    return { message: 'Requisition deleted' };
  }

  // Get all admin ids for notifications
  private async getAllAdminRecipients(): Promise<{ id: string; type: 'ADMIN' | 'EMPLOYEE' }[]> {
    const admins = await this.prisma.admin.findMany({
      where: { isLocked: false },
      select: { id: true },
    });
    return admins.map((a) => ({ id: a.id, type: 'ADMIN' as const }));
  }
}
