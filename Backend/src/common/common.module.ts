import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../Prisma/prisma.module';
import { PrismaService } from '../Prisma/prisma.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class CommonModule {}
