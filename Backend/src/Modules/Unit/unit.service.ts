import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';

@Injectable()
export class UnitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, ownerId: string) {
    const trimmed = name.trim();
    // Try to create; if it already exists for this owner, return the existing one
    const existing = await this.prisma.unit.findFirst({
      where: { name: { equals: trimmed }, adminId: ownerId },
    });
    if (existing) return existing;

    return this.prisma.unit.create({
      data: { name: trimmed, adminId: ownerId },
    });
  }

  async findAll(adminId: string | null, employeeId: string | null, search?: string) {
    // Build OR conditions: return units owned by the admin OR by the employee
    const ownerConditions: any[] = [];
    if (adminId) ownerConditions.push({ adminId });
    if (employeeId) ownerConditions.push({ adminId: employeeId });

    const where: any = ownerConditions.length > 0
      ? { OR: ownerConditions }
      : {}; // no filter — return all (shouldn't happen in practice)

    if (search) where.name = { contains: search };

    const units = await this.prisma.unit.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Deduplicate by name (case-insensitive) — admin and employee may have same unit name
    const seen = new Set<string>();
    return units.filter(u => {
      const key = u.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async remove(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException('Unit not found');
    return this.prisma.unit.delete({ where: { id } });
  }
}
