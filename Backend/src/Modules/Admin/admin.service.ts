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
    data: { names?: string; email?: string },
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
}
