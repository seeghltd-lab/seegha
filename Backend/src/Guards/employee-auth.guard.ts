import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class EmployeeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['AccessEmployeeToken'];

    if (!token) {
      throw new UnauthorizedException('Employee access token missing');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      request.employee = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired employee token');
    }
  }
}
