import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; description?: string }, adminId: string) {
    return this.prisma.category.create({
      data: { name: data.name, description: data.description, adminId },
    });
  }

  async findAll(adminId: string) {
    return this.prisma.category.findMany({
      where: { adminId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { stocks: true } } },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { stocks: true } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async update(id: string, data: { name?: string; description?: string }) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { stocks: true } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat._count.stocks > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${cat._count.stocks} linked stock item(s). Reassign or remove them first.`,
      );
    }
    return this.prisma.category.delete({ where: { id } });
  }
}
