import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['AccessAdminToken'];

    if (!token) {
      throw new UnauthorizedException('Admin access token missing');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      request.admin = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired admin token');
    }
  }
}
