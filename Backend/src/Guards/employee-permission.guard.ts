import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../Prisma/prisma.service';

@Injectable()
export class EmployeePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );

    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();

    // Admin always has access
    if (request.admin) return true;

    const employee = request.employee;
    if (!employee) {
      throw new ForbiddenException('Authentication required');
    }

    const permission = await this.prisma.employeePermission.findFirst({
      where: {
        employeeId: employee.id,
        permission: { name: requiredPermission },
      },
    });

    if (!permission) {
      throw new ForbiddenException(
        `Permission "${requiredPermission}" is required for this action`,
      );
    }

    return true;
  }
}
