import { Router } from 'express';
import db from '../db/connection';
import { requireAuth, requireSuperAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireSuperAdmin);

// List all users (superadmin only)
router.get('/users', async (_req: AuthRequest, res) => {
  const users = await db('users')
    .select('id', 'email', 'name', 'role', 'created_at')
    .orderBy('created_at', 'desc');
  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.created_at
    }))
  );
});

// List all groups (superadmin only)
router.get('/groups', async (_req: AuthRequest, res) => {
  const groups = await db('groups')
    .join('users', 'users.id', 'groups.created_by')
    .select('groups.id', 'groups.name', 'groups.description', 'groups.created_at', 'users.email as created_by_email')
    .orderBy('groups.created_at', 'desc');
  res.json(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      createdAt: g.created_at,
      createdByEmail: g.created_by_email
    }))
  );
});

export default router;
