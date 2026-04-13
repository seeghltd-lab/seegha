import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { AppSocketGateway } from '../../Global/socket/socket.gateway';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: AppSocketGateway,
  ) {}

  async createPermission(data: { name: string; description?: string }) {
    try {
      return await this.prisma.permission.create({ data });
    } catch {
      throw new BadRequestException(
        'Permission already exists or invalid data',
      );
    }
  }

  async findAll() {
    return this.prisma.permission.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async updatePermission(
    id: string,
    data: { name?: string; description?: string },
  ) {
    await this.findOne(id);
    try {
      return await this.prisma.permission.update({ where: { id }, data });
    } catch {
      throw new BadRequestException('Failed to update permission');
    }
  }

  async deletePermission(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) throw new NotFoundException('Permission not found');

    await this.prisma.employeePermission.deleteMany({
      where: { permissionId: id },
    });

    return this.prisma.permission.delete({ where: { id } });
  }

  async assignPermission(employeeId: string, permissionId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) throw new NotFoundException('Permission not found');

    try {
      const result = await this.prisma.employeePermission.create({
        data: { employeeId, permissionId },
        include: { permission: true, employee: true },
      });

      // Notify employee in real-time
      this.socket.emitToEmployee(employeeId, 'permissionAssigned', {
        permission: result.permission,
      });

      return result;
    } catch {
      throw new BadRequestException('Permission already assigned to employee');
    }
  }

  async removePermission(employeeId: string, permissionId: string) {
    try {
      const result = await this.prisma.employeePermission.delete({
        where: {
          employeeId_permissionId: { employeeId, permissionId },
        },
      });

      // Notify employee in real-time
      this.socket.emitToEmployee(employeeId, 'permissionRemoved', {
        permissionId,
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
