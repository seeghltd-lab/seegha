import { Request } from 'express';

export interface RequestWithAdmin extends Request {
  admin?: {
    id: string;
    role: string;
    email: string;
    names: string;
  };
  /** Set by AdminOrBackupKeyGuard when the request was authenticated via x-backup-api-key instead of an admin session. */
  isBackupServiceCall?: boolean;
}
