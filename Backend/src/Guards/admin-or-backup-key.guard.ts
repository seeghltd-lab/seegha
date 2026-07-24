import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

/**
 * Allows a request through if EITHER:
 *  - the existing interactive admin cookie-JWT check passes (identical logic
 *    to AdminAuthGuard, reused byte-for-byte), OR
 *  - the request carries a valid `x-backup-api-key` header matching
 *    process.env.BACKUP_SERVICE_API_KEY (constant-time comparison).
 *
 * This guard is intentionally scoped to machine-to-machine access for the
 * external Backup-auto service and grants nothing beyond what AdminAuthGuard
 * already grants ("any authenticated admin") — it must not be broadened.
 */
@Injectable()
export class AdminOrBackupKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 1. Interactive admin path — identical to AdminAuthGuard.
    const token = request.cookies?.['AccessAdminToken'];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        request.admin = decoded;
        return true;
      } catch {
        // Fall through to the backup-key check before failing.
      }
    }

    // 2. Machine-to-machine path — static API key for the Backup-auto service.
    const providedKey = request.headers?.['x-backup-api-key'];
    const expectedKey = process.env.BACKUP_SERVICE_API_KEY;

    if (typeof providedKey === 'string' && expectedKey) {
      const providedBuf = Buffer.from(providedKey);
      const expectedBuf = Buffer.from(expectedKey);

      if (
        providedBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(providedBuf, expectedBuf)
      ) {
        request.isBackupServiceCall = true;
        return true;
      }
    }

    if (!token) {
      throw new UnauthorizedException('Admin access token missing');
    }
    throw new UnauthorizedException('Invalid or expired admin token');
  }
}
