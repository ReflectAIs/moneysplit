import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { body, param, validationResult } from 'express-validator';
import { SplitType } from '@moneysplit/shared';

const router = Router();
router.use(requireAuth);

const validate = (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  return null;
};

async function isMember(groupId: string, userId: string): Promise<boolean> {
  const m = await db('group_members').where({ group_id: groupId, user_id: userId }).first();
  return !!m;
}

// List expenses for a group
router.get('/:groupId', async (req: AuthRequest, res) => {
  const { groupId } = req.params;
  if (!(await isMember(groupId, req.user!.id))) {
    return res.status(403).json({ error: 'Not a member' });
  }
  const expenses = await db('expenses')
    .where({ group_id: groupId })
    .orderBy('date', 'desc')
    .orderBy('created_at', 'desc');

  const result = await Promise.all(
    expenses.map(async (e) => {
      const payer = await db('users').where({ id: e.paid_by }).first();
      const splits = await db('expense_splits')
        .join('users', 'users.id', 'expense_splits.user_id')
        .where('expense_splits.expense_id', e.id)
        .select('expense_splits.*', 'users.name');
      return {
        id: e.id,
        groupId: e.group_id,
        paidBy: e.paid_by,
        paidByName: payer?.name || 'Unknown',
        amount: Number(e.amount),
        description: e.description,
        category: e.category,
        date: e.date,
        createdAt: e.created_at,
        splits: splits.map((s) => ({
          id: s.id,
          expenseId: s.expense_id,
          userId: s.user_id,
          name: s.name,
          shareAmount: Number(s.share_amount),
          shareType: s.share_type as SplitType
        }))
      };
    })
  );
  res.json(result);
});

// Create expense with splits
router.post('/:groupId', [
  param('groupId').isUUID().withMessage('Invalid group id'),
  body('description').trim().isLength({ min: 1, max: 120 }).withMessage('Description is required'),
  body('amount').isFloat({ min: 0.01, max: 100000000 }).withMessage('Valid amount is required'),
  body('paidBy').isUUID().withMessage('Invalid payer'),
  body('splits').isArray({ min: 1 }).withMessage('At least one split is required')
], async (req: AuthRequest, res: Response) => {
  const invalid = validate(req, res);
  if (invalid) return invalid;
  const { groupId } = req.params;
  const { description, amount, paidBy, category, date, splitType, splits } = req.body;

  if (!(await isMember(groupId, req.user!.id))) {
    return res.status(403).json({ error: 'Not a member' });
  }
  if (!description || !amount || !paidBy || !splits || !splits.length) {
    return res.status(400).json({ error: 'Description, amount, payer and splits are required' });
  }

  const total = Number(amount);
  const trx = await db.transaction();
  try {
    const [expense] = await trx('expenses')
      .insert({
        group_id: groupId,
        paid_by: paidBy,
        amount: total,
        description,
        category: category || 'Other',
        date: date || new Date().toISOString().slice(0, 10)
      })
      .returning('*');

    const splitRows = splits.map((s: { userId: string; share: number }) => ({
      expense_id: expense.id,
      user_id: s.userId,
      share_amount: Number(s.share),
      share_type: splitType || 'equal'
    }));
    await trx('expense_splits').insert(splitRows);
    await trx.commit();
    res.status(201).json({ id: expense.id });
  } catch (e) {
    await trx.rollback();
    throw e;
  }
});

// Settle up: from_user pays to_user
router.post('/:groupId/settle', [
  param('groupId').isUUID().withMessage('Invalid group id'),
  body('fromUser').isUUID().withMessage('Invalid payer'),
  body('toUser').isUUID().withMessage('Invalid recipient'),
  body('amount').isFloat({ min: 0.01, max: 100000000 }).withMessage('Valid amount is required')
], async (req: AuthRequest, res: Response) => {
  const invalid = validate(req, res);
  if (invalid) return invalid;
  const { groupId } = req.params;
  const { fromUser, toUser, amount, note } = req.body;

  if (!(await isMember(groupId, req.user!.id))) {
    return res.status(403).json({ error: 'Not a member' });
  }
  if (!fromUser || !toUser || !amount) {
    return res.status(400).json({ error: 'fromUser, toUser and amount are required' });
  }

  const [settlement] = await db('settlements')
    .insert({
      group_id: groupId,
      from_user: fromUser,
      to_user: toUser,
      amount: Number(amount),
      note: note || null
    })
    .returning('*');

  res.status(201).json({
    id: settlement.id,
    groupId: settlement.group_id,
    fromUserId: settlement.from_user,
    toUserId: settlement.to_user,
    amount: Number(settlement.amount),
    note: settlement.note,
    settledAt: settlement.settled_at
  });
});

// List settlements for a group
router.get('/:groupId/settlements', async (req: AuthRequest, res) => {
  const { groupId } = req.params;
  if (!(await isMember(groupId, req.user!.id))) {
    return res.status(403).json({ error: 'Not a member' });
  }
  const rows = await db('settlements')
    .where({ group_id: groupId })
    .orderBy('settled_at', 'desc');

  const result = await Promise.all(
    rows.map(async (s) => {
      const from = await db('users').where({ id: s.from_user }).first();
      const to = await db('users').where({ id: s.to_user }).first();
      return {
        id: s.id,
        groupId: s.group_id,
        fromUserId: s.from_user,
        fromName: from?.name || 'Unknown',
        toUserId: s.to_user,
        toName: to?.name || 'Unknown',
        amount: Number(s.amount),
        note: s.note,
        settledAt: s.settled_at
      };
    })
  );
  res.json(result);
});

export default router;
