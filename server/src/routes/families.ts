import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { body, param, validationResult } from 'express-validator';
import { getFamilyBalances, simplifyFamilyDebts } from '../services/families';

// Mounted at /api/groups/:groupId/families
const router = Router();
router.use(requireAuth);

const validate = (req: Request, res: Response): Response | null => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  return null;
};

// Ensure the requesting user is an admin of the group.
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

// Ensure the requesting user is a member of the group.
async function requireMember(req: AuthRequest, res: Response, groupId: string) {
  const membership = await db('group_members')
    .where({ group_id: groupId, user_id: req.user!.id })
    .first();
  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this group' });
    return null;
  }
  return membership;
}

// List families with their members (any member).
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = req.params.groupId;
  const membership = await requireMember(req, res, groupId);
  if (!membership) return;

  const families = await db('families').where({ group_id: groupId }).orderBy('created_at', 'asc');
  const memberships = await db('group_members')
    .join('users', 'users.id', 'group_members.user_id')
    .where('group_members.group_id', groupId)
    .whereNotNull('group_members.family_id')
    .select('group_members.family_id', 'users.id as user_id', 'users.name');

  const byFamily = new Map<string, { userId: string; name: string }[]>();
  for (const m of memberships) {
    if (!byFamily.has(m.family_id)) byFamily.set(m.family_id, []);
    byFamily.get(m.family_id)!.push({ userId: m.user_id, name: m.name });
  }

  res.json(
    families.map((f) => ({
      id: f.id,
      groupId,
      name: f.name,
      createdBy: f.created_by,
      createdAt: f.created_at,
      members: byFamily.get(f.id) || []
    }))
  );
});

// Create a family (any member).
router.post(
  '/',
  [body('name').trim().isLength({ min: 1, max: 80 }).withMessage('Family name is required')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const invalid = validate(req, res);
    if (invalid) return;
    const groupId = req.params.groupId;
    const membership = await requireMember(req, res, groupId);
    if (!membership) return;

    const [family] = await db('families')
      .insert({ group_id: groupId, name: req.body.name.trim(), created_by: req.user!.id })
      .returning('*');
    res.status(201).json({
      id: family.id,
      groupId,
      name: family.name,
      createdBy: family.created_by,
      createdAt: family.created_at,
      members: []
    });
  }
);

// Family balances + simplified family debts (any member).
router.get('/balances', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = req.params.groupId;
  const membership = await requireMember(req, res, groupId);
  if (!membership) return;

  const balances = await getFamilyBalances(groupId);
  const debts = simplifyFamilyDebts(balances);
  res.json({ balances, debts });
});

// Settle between two families (any member).
router.post(
  '/settle',
  [
    body('fromFamilyId').isUUID().withMessage('Invalid from family'),
    body('toFamilyId').isUUID().withMessage('Invalid to family'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
    body('note').optional().isLength({ max: 500 }).withMessage('Note too long')
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const invalid = validate(req, res);
    if (invalid) return;
    const groupId = req.params.groupId;
    const membership = await requireMember(req, res, groupId);
    if (!membership) return;

    const { fromFamilyId, toFamilyId } = req.body;
    const amount = Number(req.body.amount);
    const note = req.body.note;
    if (fromFamilyId === toFamilyId) {
      res.status(400).json({ error: 'Cannot settle within the same family' });
      return;
    }
    const fromFam = await db('families').where({ id: fromFamilyId, group_id: groupId }).first();
    const toFam = await db('families').where({ id: toFamilyId, group_id: groupId }).first();
    if (!fromFam || !toFam) {
      res.status(404).json({ error: 'Family not found in this group' });
      return;
    }

    await db('family_settlements').insert({
      group_id: groupId,
      from_family: fromFamilyId,
      to_family: toFamilyId,
      amount,
      note: note || null
    });
    res.json({ message: 'Settlement recorded' });
  }
);

// Assign a member to a family (admin only).
router.post(
  '/' + ':fid/members',
  [
    param(':fid').isUUID().withMessage('Invalid family id'),
    body('userId').isUUID().withMessage('Invalid user id')
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const invalid = validate(req, res);
    if (invalid) return;
    const groupId = req.params.groupId;
    const admin = await requireGroupAdmin(req, res, groupId);
    if (!admin) return;

    const family = await db('families').where({ id: req.params.fid, group_id: groupId }).first();
    if (!family) {
      res.status(404).json({ error: 'Family not found in this group' });
      return;
    }

    const target = await db('group_members')
      .where({ group_id: groupId, user_id: req.body.userId })
      .first();
    if (!target) {
      res.status(404).json({ error: 'Member not found in this group' });
      return;
    }

    await db('group_members').where({ id: target.id }).update({ family_id: family.id });
    res.json({ message: 'Member assigned to family' });
  }
);

// Remove a member from a family (admin only).
router.delete(
  '/' + ':fid/members/' + ':userId',
  [
    param(':fid').isUUID().withMessage('Invalid family id'),
    param(':userId').isUUID().withMessage('Invalid user id')
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const invalid = validate(req, res);
    if (invalid) return;
    const groupId = req.params.groupId;
    const admin = await requireGroupAdmin(req, res, groupId);
    if (!admin) return;

    const target = await db('group_members')
      .where({ group_id: groupId, user_id: req.params.userId })
      .first();
    if (!target) {
      res.status(404).json({ error: 'Member not found in this group' });
      return;
    }

    await db('group_members').where({ id: target.id }).update({ family_id: null });
    res.json({ message: 'Member removed from family' });
  }
);

// Delete a family (admin only).
router.delete(
  '/' + ':fid',
  [param(':fid').isUUID().withMessage('Invalid family id')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const invalid = validate(req, res);
    if (invalid) return;
    const groupId = req.params.groupId;
    const admin = await requireGroupAdmin(req, res, groupId);
    if (!admin) return;

    const family = await db('families').where({ id: req.params.fid, group_id: groupId }).first();
    if (!family) {
      res.status(404).json({ error: 'Family not found in this group' });
      return;
    }

    // Unassign all members first so their data is preserved.
    await db('group_members').where({ family_id: family.id }).update({ family_id: null });
    // Family settlements referencing this family are cascade-deleted.
    await db('families').where({ id: family.id }).del();
    res.json({ message: 'Family deleted' });
  }
);

export default router;
