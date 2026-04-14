import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { SiteStatus } from '@prisma/client';

export interface CreateSiteDto {
  name: string;
  location: string;
  managerName?: string;
  status?: SiteStatus;
  description?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  image?: string;
}

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSiteDto, adminId: string) {
    return this.prisma.site.create({
      data: {
        ...data,
        budget: data.budget ? Number(data.budget) : 0,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        adminId,
      },
    });
  }

  async findAll(adminId: string, filters: any = {}) {
    const { search, status, location } = filters;
    const where: any = { adminId };

    if (status) where.status = status;
    if (location) where.location = location;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { managerName: { contains: search } },
        { location: { contains: search } },
      ];
    }

    return this.prisma.site.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { stocks: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        _count: {
          select: { stocks: true },
        },
      },
    });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async update(id: string, data: Partial<CreateSiteDto>) {
    return this.prisma.site.update({
      where: { id },
      data: {
        ...data,
        budget: data.budget !== undefined ? Number(data.budget) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.site.delete({ where: { id } });
  }

  async getStats(adminId: string) {
    const sites = await this.prisma.site.findMany({ where: { adminId } });
    
    // Aggregates
    const totalSites = sites.length;
    const activeSites = sites.filter(s => s.status === SiteStatus.ACTIVE).length;
    const pausedSites = sites.filter(s => s.status === SiteStatus.PAUSED).length;
    const totalBudget = sites.reduce((sum, s) => sum + Number(s.budget), 0);

    // Mock workers for now as we don't have a Worker/Employee relation to Site yet
    // In a real app, we'd link Employees to Sites
    const totalWorkers = sites.length * 12; // Just a mock multiplier for the UI aesthetic

    return {
      totalSites,
      activeSites,
      pausedSites,
      totalBudget,
      totalWorkers,
    };
  }
}
