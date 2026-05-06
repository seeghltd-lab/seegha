import { Module } from '@nestjs/common';
import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';
import { PrismaModule } from '../../Prisma/prisma.module';
import { DualAuthGuard } from '../../Guards/dual-auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [UnitController],
  providers: [UnitService, DualAuthGuard],
})
export class UnitModule {}
