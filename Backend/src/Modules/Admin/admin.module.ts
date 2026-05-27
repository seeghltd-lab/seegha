import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { RolesGuard } from '../../Guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { CloudinaryModule } from '../../Global/cloudinary/cloudinary.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    CloudinaryModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard, RolesGuard, Reflector],
  exports: [AdminService, AdminAuthGuard, RolesGuard, JwtModule],
})
export class AdminModule {}
