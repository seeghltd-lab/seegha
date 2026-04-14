import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../Prisma/prisma.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';

mkdirSync('./uploads/site', { recursive: true });

export const siteLogoStorage = diskStorage({
  destination: './uploads/site',
  filename: (_, file, cb) => {
    cb(null, `logo${extname(file.originalname)}`);
  },
});

const DEFAULT_SETTINGS: Record<string, string> = {
  site_name: 'AMZA Ledger',
  site_tagline: 'The next generation of asset management and real-time ledger accuracy.',
  site_logo: '',
  contact_email: '',
  contact_phone: '',
  contact_address: '',
  currency_name: 'Rwandan Franc',
  currency_symbol: 'RWF',
  low_stock_threshold: '5',
};

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.siteSetting.findMany();
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      result[row.key] = row.value ?? '';
    }
    return result;
  }

  async updateMany(settings: Record<string, string>) {
    const ops = Object.entries(settings).map(([key, value]) =>
      this.prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    );
    await Promise.all(ops);
    return this.getAll();
  }

  async updateLogo(path: string) {
    await this.prisma.siteSetting.upsert({
      where: { key: 'site_logo' },
      update: { value: path },
      create: { key: 'site_logo', value: path },
    });
    return this.getAll();
  }
}
