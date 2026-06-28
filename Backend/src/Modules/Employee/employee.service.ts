import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { EmailService } from '../../Global/email/email.service';
import { ActivityLogService } from '../ActivityLog/activity-log.service';
import { CloudinaryService } from '../../Global/cloudinary/cloudinary.service';
import { generatePassword } from '../../common/utils/generate-password.util';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly activityLog: ActivityLogService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      position: string;
      status?: any;
      profilePicture?: string;
      idCardImage?: string;
      cvDocument?: string;
      supportingDocument?: string;
    },
    actorId?: string,
    actorName?: string,
  ) {
    // Block if an active (non-deleted) employee already has this email.
    const activeExisting = await this.prisma.employee.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (activeExisting) {
      throw new BadRequestException(
        'An employee with this email already exists',
      );
    }

    const rawPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // If there is a soft-deleted record with this email, restore it with the
    // new data instead of creating a duplicate (would violate the @unique constraint).
    const softDeleted = await this.prisma.employee.findFirst({
      where: { email: data.email, deletedAt: { not: null } },
    });

    let employee: any;
    if (softDeleted) {
      employee = await this.prisma.employee.update({
        where: { id: softDeleted.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          position: data.position,
          status: data.status || 'ACTIVE',
          password: hashedPassword,
          isLocked: false,
          deletedAt: null,
          profilePicture: data.profilePicture ?? null,
          idCardImage: data.idCardImage ?? null,
          cvDocument: data.cvDocument ?? null,
          supportingDocument: data.supportingDocument ?? null,
        },
      });
    } else {
      employee = await this.prisma.employee.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          position: data.position,
          status: data.status || 'ACTIVE',
          password: hashedPassword,
          profilePicture: data.profilePicture ?? null,
          idCardImage: data.idCardImage ?? null,
          cvDocument: data.cvDocument ?? null,
          supportingDocument: data.supportingDocument ?? null,
        },
      });
    }

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

    this.activityLog.log({
      action: 'EMPLOYEE_CREATED',
      entityType: 'Employee',
      entityId: employee.id,
      entityLabel: `${employee.firstName} ${employee.lastName}`,
      performedById: actorId ?? 'system',
      performedByType: 'ADMIN',
      performedByName: actorName,
      metadata: {
        email: employee.email,
        position: employee.position,
        status: employee.status,
        ...(softDeleted ? { restored: true } : {}),
      },
    });

    return employeeWithoutPassword;
  }

  async findAll() {
    return this.prisma.employee.findMany({
      where: { deletedAt: null },
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
        idCardImage: true,
        cvDocument: true,
        supportingDocument: true,
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
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
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
        idCardImage: true,
        cvDocument: true,
        supportingDocument: true,
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
        siteAccess: {
          include: {
            site: { select: { id: true, name: true, status: true, location: true } },
          },
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
      idCardImage: string;
      cvDocument: string;
      supportingDocument: string;
    }>,
    actorId?: string,
    actorName?: string,
  ) {
    const employee = await this.prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (!employee) throw new NotFoundException('Employee not found');

    // Delete replaced cloudinary assets (fire-and-forget, errors are swallowed in deleteByUrl)
    if (data.profilePicture && employee.profilePicture)
      this.cloudinary.deleteByUrl(employee.profilePicture, 'image');
    if (data.idCardImage && (employee as any).idCardImage)
      this.cloudinary.deleteByUrl((employee as any).idCardImage, 'image');
    if (data.cvDocument && (employee as any).cvDocument)
      this.cloudinary.deleteByUrl((employee as any).cvDocument, 'raw');
    if (data.supportingDocument && (employee as any).supportingDocument)
      this.cloudinary.deleteByUrl((employee as any).supportingDocument, 'raw');

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(data.firstName  && { firstName:  data.firstName }),
        ...(data.lastName   && { lastName:   data.lastName }),
        ...(data.phone      && { phone:      data.phone }),
        ...(data.position   && { position:   data.position }),
        ...(data.status     && { status:     data.status }),
        ...(data.profilePicture     && { profilePicture:     data.profilePicture }),
        ...(data.idCardImage        && { idCardImage:        data.idCardImage }),
        ...(data.cvDocument         && { cvDocument:         data.cvDocument }),
        ...(data.supportingDocument && { supportingDocument: data.supportingDocument }),
      },
    });

    const { password: _, ...employeeWithoutPassword } = updated;

    this.activityLog.log({
      action: 'EMPLOYEE_UPDATED',
      entityType: 'Employee',
      entityId: id,
      entityLabel: `${updated.firstName} ${updated.lastName}`,
      performedById: actorId ?? 'system',
      performedByType: 'ADMIN',
      performedByName: actorName,
      metadata: { changes: data },
    });

    return employeeWithoutPassword;
  }

  async remove(id: string, actorId?: string, actorName?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (!employee) throw new NotFoundException('Employee not found');

    // Soft-delete: mark as deleted so requisitions/stock relations are preserved
    await this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.activityLog.log({
      action: 'EMPLOYEE_DELETED',
      entityType: 'Employee',
      entityId: id,
      entityLabel: `${employee.firstName} ${employee.lastName}`,
      performedById: actorId ?? 'system',
      performedByType: 'ADMIN',
      performedByName: actorName,
    });

    return { message: 'Employee deleted successfully' };
  }
}
