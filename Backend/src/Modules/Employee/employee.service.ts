import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { EmailService } from '../../Global/email/email.service';
import { generatePassword } from '../../common/utils/generate-password.util';
import { deleteFile } from '../../common/utils/file-upload.util';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    status?: any;
  }) {
    const existing = await this.prisma.employee.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new BadRequestException(
        'An employee with this email already exists',
      );
    }

    const rawPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const employee = await this.prisma.employee.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        position: data.position,
        status: data.status || 'ACTIVE',
        password: hashedPassword,
      },
    });

    // Send welcome email with credentials
    try {
      await this.emailService.sendStaffWelcomeEmail({
        email: employee.email,
        name: `${employee.firstName} ${employee.lastName}`,
        tempPassword: rawPassword,
      });
    } catch (err) {
      console.error('Failed to send welcome email:', err?.message);
    }

    const { password: _, ...employeeWithoutPassword } = employee;
    return employeeWithoutPassword;
  }

  async findAll() {
    return this.prisma.employee.findMany({
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
          include: {
            permission: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
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
          include: {
            permission: true,
          },
        },
        requisitions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      position: string;
      status: any;
      profilePicture: string;
    }>,
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');

    if (data.profilePicture && employee.profilePicture) {
      deleteFile(employee.profilePicture);
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.phone && { phone: data.phone }),
        ...(data.position && { position: data.position }),
        ...(data.status && { status: data.status }),
        ...(data.profilePicture && { profilePicture: data.profilePicture }),
      },
    });

    const { password: _, ...employeeWithoutPassword } = updated;
    return employeeWithoutPassword;
  }

  async remove(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');

    if (employee.profilePicture) {
      deleteFile(employee.profilePicture);
    }

    await this.prisma.employee.delete({ where: { id } });
    return { message: 'Employee deleted successfully' };
  }
}
