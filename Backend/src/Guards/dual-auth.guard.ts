import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class DualAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminToken = request.cookies?.['AccessAdminToken'];
    const employeeToken = request.cookies?.['AccessEmployeeToken'];

    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, process.env.JWT_SECRET as string);
        request.admin = decoded;
        return true;
      } catch {
        // fall through to try employee token
      }
    }

    if (employeeToken) {
      try {
        const decoded = jwt.verify(
          employeeToken,
          process.env.JWT_SECRET as string,
        );
        request.employee = decoded;
        return true;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    throw new UnauthorizedException('Authentication required');
  }
}
