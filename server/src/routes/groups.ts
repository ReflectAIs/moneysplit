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
    await trx('group_members').insert({ group_id: group.id, user_id: req.user!.id, role: 'admin' });
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
    .select('users.id', 'users.name', 'users.email', 'group_members.joined_at', 'group_members.role');

  res.json({
    id: group.id,
    name: group.name,
    description: group.description,
    createdBy: group.created_by,
    createdAt: group.created_at,
    myRole: membership.role,
    members: members.map((m) => ({
      id: m.id,
      groupId: group.id,
      userId: m.id,
      name: m.name,
      email: m.email,
      joinedAt: m.joined_at,
      role: m.role
    }))
  });
});

// Update group (name / description). Admin only.
router.put('/:id', [
  param('id').isUUID().withMessage('Invalid group id'),
  body('name').optional().trim().isLength({ min: 1, max: 80 }).withMessage('Group name is required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long')
], async (req: AuthRequest, res: Response) => {
  const invalid = validate(req, res);
  if (invalid) return invalid;
  const group = await db('groups').where({ id: req.params.id }).first();
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const admin = await requireGroupAdmin(req, res, group.id);
  if (!admin) return;

  const { name, description } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const [updated] = await db('groups').where({ id: group.id }).update(updates).returning('*');
  res.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    createdBy: updated.created_by,
    createdAt: updated.created_at
  });
});

// Delete group. Admin only.
router.delete('/:id', [param('id').isUUID().withMessage('Invalid group id')], async (req: AuthRequest, res: Response) => {
  const invalid = validate(req, res);
  if (invalid) return invalid;
  const group = await db('groups').where({ id: req.params.id }).first();
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const admin = await requireGroupAdmin(req, res, group.id);
  if (!admin) return;

  const trx = await db.transaction();
  try {
    const expenseIds = await trx('expenses').where({ group_id: group.id }).pluck('id');
    if (expenseIds.length > 0) {
      await trx('expense_splits').whereIn('expense_id', expenseIds).del();
    }
    await trx('expenses').where({ group_id: group.id }).del();
    await trx('settlements').where({ group_id: group.id }).del();
    await trx('invite_tokens').where({ group_id: group.id }).del();
    await trx('group_members').where({ group_id: group.id }).del();
    await trx('groups').where({ id: group.id }).del();
    await trx.commit();
  } catch (e) {
    await trx.rollback();
    throw e;
  }
  res.json({ message: 'Group deleted' });
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

// Join via invite token. `history` controls whether the new member is included in
// past equal-split expenses ('include') or only participates going forward ('new').
router.post(
  '/join',
  [
    body('inviteToken').isUUID().withMessage('Invalid invite token'),
    body('history').optional().isIn(['include', 'new']).withMessage('history must be "include" or "new"')
  ],
  async (req: AuthRequest, res: Response) => {
    const invalid = validate(req, res);
    if (invalid) return invalid;
    const { inviteToken, history } = req.body;
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

    const trx = await db.transaction();
    try {
      if (!existing) {
        await trx('group_members').insert({ group_id: invite.group_id, user_id: req.user!.id });

        // Include the new member in past equal-split expenses by re-splitting them.
        if (history === 'include') {
          const expenses = await trx('expenses').where({ group_id: invite.group_id });
          for (const exp of expenses) {
            const splits = await trx('expense_splits').where({ expense_id: exp.id });
            const equalSplits = splits.filter((s) => s.share_type === 'equal');
            if (equalSplits.length === 0) continue;

            // Only re-split if the new member is not already part of this expense.
            const alreadyIncluded = splits.some((s) => s.user_id === req.user!.id);
            if (alreadyIncluded) continue;

            const newCount = equalSplits.length + 1;
            const newShare = Math.round((Number(exp.amount) / newCount) * 100) / 100;
            // Recompute each existing equal share.
            for (const s of equalSplits) {
              await trx('expense_splits').where({ id: s.id }).update({ share_amount: newShare });
            }
            await trx('expense_splits').insert({
              expense_id: exp.id,
              user_id: req.user!.id,
              share_amount: newShare,
              share_type: 'equal'
            });
          }
        }
      }
      await trx('invite_tokens').where({ id: invite.id }).update({ used: true });
      await trx.commit();
    } catch (e) {
      await trx.rollback();
      throw e;
    }

    const group = await db('groups').where({ id: invite.group_id }).first();
    res.json({ id: group.id, name: group.name });
  }
);

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

// Helper: ensure the requesting user is an admin of the group.
async function requireGroupAdmin(req: AuthRequest, res: Response, groupId: string) {
  const membership = await db('group_members')
    .where({ group_id: groupId, user_id: req.user!.id })
    .first();
  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this group' });
    return null;
  }
  if (membership.role !== 'admin') {
    res.status(403).json({ error: 'Only group admins can manage members' });
    return null;
  }
  return membership;
}

// Remove a member from the group (admin only).
router.delete(
  '/:id/members/:userId',
  [param('id').isUUID().withMessage('Invalid group id'), param('userId').isUUID().withMessage('Invalid user id')],
  async (req: AuthRequest, res: Response) => {
    const invalid = validate(req, res);
    if (invalid) return invalid;
    const group = await db('groups').where({ id: req.params.id }).first();
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const admin = await requireGroupAdmin(req, res, group.id);
    if (!admin) return;

    if (req.params.userId === req.user!.id) {
      return res.status(400).json({ error: 'You cannot remove yourself' });
    }
    const target = await db('group_members')
      .where({ group_id: group.id, user_id: req.params.userId })
      .first();
    if (!target) return res.status(404).json({ error: 'Member not found' });

    await db('group_members').where({ id: target.id }).del();
    res.json({ message: 'Member removed' });
  }
);

// Promote a member to admin (admin only).
router.post(
  '/:id/members/:userId/promote',
  [param('id').isUUID().withMessage('Invalid group id'), param('userId').isUUID().withMessage('Invalid user id')],
  async (req: AuthRequest, res: Response) => {
    const invalid = validate(req, res);
    if (invalid) return invalid;
    const group = await db('groups').where({ id: req.params.id }).first();
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const admin = await requireGroupAdmin(req, res, group.id);
    if (!admin) return;

    const target = await db('group_members')
      .where({ group_id: group.id, user_id: req.params.userId })
      .first();
    if (!target) return res.status(404).json({ error: 'Member not found' });

    await db('group_members').where({ id: target.id }).update({ role: 'admin' });
    res.json({ message: 'Member promoted to admin' });
  }
);

// Demote an admin to member (admin only; cannot demote the last admin).
router.post(
  '/:id/members/:userId/demote',
  [param('id').isUUID().withMessage('Invalid group id'), param('userId').isUUID().withMessage('Invalid user id')],
  async (req: AuthRequest, res: Response) => {
    const invalid = validate(req, res);
    if (invalid) return invalid;
    const group = await db('groups').where({ id: req.params.id }).first();
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const admin = await requireGroupAdmin(req, res, group.id);
    if (!admin) return;

    const target = await db('group_members')
      .where({ group_id: group.id, user_id: req.params.userId })
      .first();
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (target.role !== 'admin') {
      return res.status(400).json({ error: 'Member is not an admin' });
    }

    const adminCount = await db('group_members')
      .where({ group_id: group.id, role: 'admin' })
      .count<{ count: string }>('*')
      .first();
    if (Number(adminCount?.count || 0) <= 1) {
      return res.status(400).json({ error: 'Cannot demote the last admin' });
    }

    await db('group_members').where({ id: target.id }).update({ role: 'member' });
    res.json({ message: 'Admin demoted to member' });
  }
);

export default router;
