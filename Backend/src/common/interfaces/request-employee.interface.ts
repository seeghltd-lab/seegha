import { Request } from 'express';

export interface RequestWithEmployee extends Request {
  employee?: {
    id: string;
    role: string;
  };
}
