import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EmployeeAuthService } from './employee-auth.service';
import { EmployeeAuthController } from './employee-auth.controller';
import { EmployeeAuthGuard } from '../../../Guards/employee-auth.guard';
import { AdminAuthGuard } from '../../../Guards/admin-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [EmployeeAuthController],
  providers: [EmployeeAuthService, EmployeeAuthGuard, AdminAuthGuard],
  exports: [EmployeeAuthService, EmployeeAuthGuard],
})
export class EmployeeAuthModule {}
