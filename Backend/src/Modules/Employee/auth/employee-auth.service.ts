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
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
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
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
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
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
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
}
