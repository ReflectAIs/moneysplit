import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/connection';
import { Role } from '@moneysplit/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'moneysplit-dev-secret';

// In production, refuse to run with the default dev secret
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'moneysplit-dev-secret') {
  throw new Error('JWT_SECRET must be set in production');
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    {
      expiresIn: '7d',
      issuer: 'moneysplit',
      audience: 'moneysplit-client'
    }
  );
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET, {
      issuer: 'moneysplit',
      audience: 'moneysplit-client'
    }) as { id: string; email: string; name: string; role: Role };
    const user = await db('users').where({ id: payload.id }).first();
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Require superadmin role (must be used after requireAuth)
export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden: superadmin access required' });
  }
  next();
}
