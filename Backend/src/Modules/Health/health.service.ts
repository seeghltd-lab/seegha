import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const database = await this.checkDatabase();
    const status = database.status === 'up' ? 'ok' : 'error';

    return {
      status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database,
      },
    };
  }

  private async checkDatabase() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', responseTimeMs: Date.now() - start };
    } catch (error) {
      return {
        status: 'down',
        responseTimeMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }
}
