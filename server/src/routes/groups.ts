import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { body, param, validationResult } from 'express-validator';
import { getBalances, simplifyDebts } from '../services/balance';

const router = Router();
router.use(requireAuth);

const validate = (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  return null;
};

// List my groups
router.get('/', async (req: AuthRequest, res) => {
  const groups = await db('groups')
    .join('group_members', 'group_members.group_id', 'groups.id')
    .where('group_members.user_id', req.user!.id)
    .select('groups.*')
    .orderBy('groups.created_at', 'desc');

  const withCount = await Promise.all(
    groups.map(async (g) => {
      const countRow = await db('group_members')
        .where({ group_id: g.id })
        .count<{ count: string }>('*')
        .first();
      const count = countRow ? Number(countRow.count) : 0;
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        createdBy: g.created_by,
        createdAt: g.created_at,
        memberCount: count
      };
    })
  );
  res.json(withCount);
});

// Create group
router.post('/', [body('name').trim().isLength({ min: 1, max: 80 }).withMessage('Group name is required')], async (req: AuthRequest, res: Response) => {
  const invalid = validate(req, res);
  if (invalid) return invalid;
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  const trx = await db.transaction();
  try {
    const [group] = await trx('groups')
      .insert({ name: name.trim(), description: description || null, created_by: req.user!.id })
      .returning('*');
    await trx('group_members').insert({ group_id: group.id, user_id: req.user!.id });
    await trx.commit();
    res.status(201).json({
      id: group.id,
      name: group.name,
      description: group.description,
      createdBy: group.created_by,
      createdAt: group.created_at,
      memberCount: 1
    });
  } catch (e) {
    await trx.rollback();
    throw e;
  }
});

// Get group detail with members
router.get('/:id', async (req: AuthRequest, res) => {
  const group = await db('groups').where({ id: req.params.id }).first();
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const membership = await db('group_members')
    .where({ group_id: group.id, user_id: req.user!.id })
    .first();
  if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

  const members = await db('group_members')
    .join('users', 'users.id', 'group_members.user_id')
    .where('group_members.group_id', group.id)
    .select('users.id', 'users.name', 'users.email', 'group_members.joined_at');

  res.json({
    id: group.id,
    name: group.name,
    description: group.description,
    createdBy: group.created_by,
    createdAt: group.created_at,
    members: members.map((m) => ({
      id: m.id,
      groupId: group.id,
      userId: m.id,
      name: m.name,
      email: m.email,
      joinedAt: m.joined_at
    }))
  });
});

// Generate invite link
router.post('/:id/invite', [param('id').isUUID().withMessage('Invalid group id')], async (req: AuthRequest, res: Response) => {
  const invalid = validate(req, res);
  if (invalid) return invalid;
  const group = await db('groups').where({ id: req.params.id }).first();
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const membership = await db('group_members')
    .where({ group_id: group.id, user_id: req.user!.id })
    .first();
  if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db('invite_tokens').insert({
    group_id: group.id,
    created_by: req.user!.id,
    token,
    expires_at: expiresAt
  });

  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  res.json({ token, url: `${base}/invite/${token}`, expiresAt: expiresAt.toISOString() });
});

// Join via invite token
router.post('/join', [body('inviteToken').isUUID().withMessage('Invalid invite token')], async (req: AuthRequest, res: Response) => {
  const invalid = validate(req, res);
  if (invalid) return invalid;
  const { inviteToken } = req.body;
  if (!inviteToken) return res.status(400).json({ error: 'Invite token is required' });

  const invite = await db('invite_tokens').where({ token: inviteToken }).first();
  if (!invite) return res.status(404).json({ error: 'Invite link is invalid' });
  if (invite.used) return res.status(400).json({ error: 'Invite link has already been used' });
  if (new Date(invite.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Invite link has expired' });
  }

  const existing = await db('group_members')
    .where({ group_id: invite.group_id, user_id: req.user!.id })
    .first();
  if (!existing) {
    await db('group_members').insert({ group_id: invite.group_id, user_id: req.user!.id });
  }
  await db('invite_tokens').where({ id: invite.id }).update({ used: true });

  const group = await db('groups').where({ id: invite.group_id }).first();
  res.json({ id: group.id, name: group.name });
});

// Balances for a group
router.get('/:id/balances', async (req: AuthRequest, res) => {
  const group = await db('groups').where({ id: req.params.id }).first();
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const membership = await db('group_members')
    .where({ group_id: group.id, user_id: req.user!.id })
    .first();
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  const balances = await getBalances(group.id);
  const debts = simplifyDebts(balances);
  res.json({ balances, debts });
});

export default router;
