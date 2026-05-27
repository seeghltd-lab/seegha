import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../Prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeeAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async employeeLogin(credentials: { identifier: string; password: string }) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email: credentials.identifier },
          { phone: credentials.identifier },
        ],
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!employee) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (employee.isLocked) {
      throw new UnauthorizedException(
        'Your account is locked. Please contact an admin.',
      );
    }

    const passwordValid = await bcrypt.compare(
      credentials.password,
      employee.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { id: employee.id, role: 'employee' };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '7d',
    });

    const { password: _, ...employeeWithoutPassword } = employee;
    return { employee: employeeWithoutPassword, token };
  }

  async getProfile(employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        position: true,
        status: true,
        isLocked: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async changePassword(
    employeeId: string,
    data: { currentPassword: string; newPassword: string },
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const valid = await bcrypt.compare(data.currentPassword, employee.password);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (data.newPassword.length < 6) {
      throw new BadRequestException(
        'New password must be at least 6 characters',
      );
    }

    const hashed = await bcrypt.hash(data.newPassword, 10);
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { password: hashed },
    });

    return { message: 'Password changed successfully' };
  }

  async lockEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { isLocked: true },
    });

    return { message: 'Account locked' };
  }

  async unlockEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { isLocked: false },
    });

    return { message: 'Account unlocked' };
  }

  async updateProfile(
    employeeId: string,
    data: Partial<{
      phone: string;
      position: string;
      profilePicture: string;
    }>,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(data.phone && { phone: data.phone }),
        ...(data.position && { position: data.position }),
        ...(data.profilePicture && { profilePicture: data.profilePicture }),
      },
    });

    const { password: _, ...employeeWithoutPassword } = updated;
    return employeeWithoutPassword;
  }

  async getEmployeeDashboard(employeeId: string) {
    const [total, pending, approved, partiallyReceived, fullyReceived, rejected] =
      await Promise.all([
        this.prisma.requisition.count({ where: { employeeId } }),
        this.prisma.requisition.count({ where: { employeeId, status: 'PENDING' } }),
        this.prisma.requisition.count({ where: { employeeId, status: 'APPROVED' } }),
        this.prisma.requisition.count({ where: { employeeId, status: 'PARTIALLY_RECEIVED' } }),
        this.prisma.requisition.count({ where: { employeeId, status: 'FULLY_RECEIVED' } }),
        this.prisma.requisition.count({ where: { employeeId, status: 'REJECTED' } }),
      ]);

    const recentRequisitions = await this.prisma.requisition.findMany({
      where: { employeeId },
      include: {
        _count: { select: { items: true } },
        supplier: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentActivity = await this.prisma.activityLog.findMany({
      where: { performedById: employeeId, performedByType: 'EMPLOYEE' },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return {
      kpi: {
        total,
        pending,
        approved,
        inProgress: partiallyReceived + fullyReceived,
        rejected,
      },
      recentRequisitions: recentRequisitions.map((r) => ({
        id: r.id,
        status: r.status,
        itemCount: r._count.items,
        supplier: r.supplier,
        createdAt: r.createdAt,
      })),
      recentActivity,
    };
  }
}
