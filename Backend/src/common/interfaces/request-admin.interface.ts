import { Request } from 'express';

export interface RequestWithAdmin extends Request {
  admin?: {
    id: string;
    role: string;
    email: string;
    names: string;
  };
}
