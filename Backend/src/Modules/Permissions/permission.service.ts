import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { ActivityLogService } from '../ActivityLog/activity-log.service';
import { AppSocketGateway } from '../../Global/socket/socket.gateway';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: AppSocketGateway,
    private readonly activityLog: ActivityLogService,
  ) {}

  async createPermission(
    data: { name: string; description?: string },
    callerId?: string,
    callerName?: string,
  ) {
    try {
      const permission = await this.prisma.permission.create({ data });
      this.activityLog.log({
        action: 'PERMISSION_CREATED',
        entityType: 'Permission',
        entityId: permission.id,
        entityLabel: permission.name,
        performedById: callerId ?? 'system',
        performedByType: 'ADMIN',
        performedByName: callerName,
        metadata: { name: permission.name, description: permission.description },
      });
      return permission;
    } catch {
      throw new BadRequestException('Permission already exists or invalid data');
    }
  }

  async findAll() {
    return this.prisma.permission.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async updatePermission(
    id: string,
    data: { name?: string; description?: string },
    callerId?: string,
    callerName?: string,
  ) {
    await this.findOne(id);
    try {
      const updated = await this.prisma.permission.update({ where: { id }, data });
      this.activityLog.log({
        action: 'PERMISSION_UPDATED',
        entityType: 'Permission',
        entityId: id,
        entityLabel: updated.name,
        performedById: callerId ?? 'system',
        performedByType: 'ADMIN',
        performedByName: callerName,
        metadata: { changes: data },
      });
      return updated;
    } catch {
      throw new BadRequestException('Failed to update permission');
    }
  }

  async deletePermission(id: string, callerId?: string, callerName?: string) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) throw new NotFoundException('Permission not found');

    await this.prisma.employeePermission.deleteMany({ where: { permissionId: id } });
    await this.prisma.permission.delete({ where: { id } });
    this.activityLog.log({
      action: 'PERMISSION_DELETED',
      entityType: 'Permission',
      entityId: id,
      entityLabel: permission.name,
      performedById: callerId ?? 'system',
      performedByType: 'ADMIN',
      performedByName: callerName,
    });
    return { message: 'Permission deleted' };
  }

  async assignPermission(
    employeeId: string,
    permissionId: string,
    callerId?: string,
    callerName?: string,
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) throw new NotFoundException('Permission not found');

    try {
      const result = await this.prisma.employeePermission.create({
        data: { employeeId, permissionId },
        include: { permission: true, employee: true },
      });

      this.socket.emitToEmployee(employeeId, 'permissionAssigned', {
        permission: result.permission,
      });
      this.activityLog.log({
        action: 'PERMISSION_ASSIGNED',
        entityType: 'Employee',
        entityId: employeeId,
        entityLabel: `${employee.firstName} ${employee.lastName}`,
        performedById: callerId ?? 'system',
        performedByType: 'ADMIN',
        performedByName: callerName,
        metadata: { permissionName: permission.name, permissionId },
      });

      return result;
    } catch {
      throw new BadRequestException('Permission already assigned to employee');
    }
  }

  async removePermission(
    employeeId: string,
    permissionId: string,
    callerId?: string,
    callerName?: string,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { firstName: true, lastName: true },
    });
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });

    try {
      const result = await this.prisma.employeePermission.delete({
        where: { employeeId_permissionId: { employeeId, permissionId } },
      });

      this.socket.emitToEmployee(employeeId, 'permissionRemoved', { permissionId });
      this.activityLog.log({
        action: 'PERMISSION_REMOVED',
        entityType: 'Employee',
        entityId: employeeId,
        entityLabel: employee ? `${employee.firstName} ${employee.lastName}` : employeeId,
        performedById: callerId ?? 'system',
        performedByType: 'ADMIN',
        performedByName: callerName,
        metadata: { permissionName: permission?.name, permissionId },
      });

      return result;
    } catch {
      throw new NotFoundException('Permission assignment not found');
    }
  }

  async getPermissionsByEmployee(employeeId: string) {
    return this.prisma.employeePermission.findMany({
      where: { employeeId },
      include: { permission: true },
    });
  }

  async getEmployeesByPermission(permissionId: string) {
    return this.prisma.employeePermission.findMany({
      where: { permissionId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
          },
        },
      },
    });
  }
}
