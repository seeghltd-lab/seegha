import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { EmployeeAuthModule } from './auth/employee-auth.module';
import { AdminAuthGuard } from '../../Guards/admin-auth.guard';
import { ActivityLogModule } from '../ActivityLog/activity-log.module';

@Module({
  imports: [
    EmployeeAuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    ActivityLogModule,
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService, AdminAuthGuard],
  exports: [EmployeeService],
})
export class EmployeeModule {}
