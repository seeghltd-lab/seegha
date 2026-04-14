import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { SupplierStatus } from '@prisma/client';

interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  paymentTerms?: string;
  rating?: number;
  status?: SupplierStatus;
  notes?: string;
}

interface SupplierFilters {
  search?: string;
  status?: SupplierStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  private generateCode(): string {
    const chars = '0123456789ABCDEF';
    let code = 'SUP-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private async uniqueCode(): Promise<string> {
    let code = this.generateCode();
    while (await this.prisma.supplier.findUnique({ where: { code } })) {
      code = this.generateCode();
    }
    return code;
  }

  async create(data: CreateSupplierDto, adminId: string) {
    if (data.email) {
      const existing = await this.prisma.supplier.findFirst({
        where: { email: data.email, adminId },
      });
      if (existing) {
        throw new ConflictException(
          'A supplier with this email already exists',
        );
      }
    }

    const code = await this.uniqueCode();

    return this.prisma.supplier.create({
      data: {
        code,
        adminId,
        name: data.name,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country ?? 'Rwanda',
        paymentTerms: data.paymentTerms,
        rating: data.rating ?? 0,
        status: data.status ?? 'ACTIVE',
        notes: data.notes,
      },
    });
  }

  async findAll(adminId: string, filters: SupplierFilters = {}) {
    const { search, status, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { adminId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { code: { contains: search } },
        { contactPerson: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { stocks: true } } },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      suppliers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        stocks: {
          select: { id: true, sku: true, itemName: true, quantity: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { stocks: true } },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async findForSelect(adminId: string) {
    return this.prisma.supplier.findMany({
      where: { adminId, status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, data: Partial<CreateSupplierDto>) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async remove(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { stocks: true } } },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (supplier._count.stocks > 0) {
      throw new BadRequestException(
        `Cannot delete supplier with ${supplier._count.stocks} linked stock item(s). Reassign or remove them first.`,
      );
    }
    return this.prisma.supplier.delete({ where: { id } });
  }
}
