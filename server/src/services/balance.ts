import db from '../db/connection';
import { Balance, Debt } from '@moneysplit/shared';

export async function getBalances(groupId: string): Promise<Balance[]> {
  const members = await db('group_members')
    .join('users', 'users.id', 'group_members.user_id')
    .where('group_members.group_id', groupId)
    .select('users.id', 'users.name');

  const expenses = await db('expenses').where({ group_id: groupId });
  const splits = await db('expense_splits')
    .join('expenses', 'expenses.id', 'expense_splits.expense_id')
    .where('expenses.group_id', groupId)
    .select('expense_splits.*');

  const settlements = await db('settlements').where({ group_id: groupId });

  const net = new Map<string, number>();
  members.forEach((m) => net.set(m.id, 0));

  // Each expense: payer is owed the amount, each split member owes their share.
  for (const exp of expenses) {
    net.set(exp.paid_by, (net.get(exp.paid_by) || 0) + Number(exp.amount));
  }
  for (const s of splits) {
    net.set(s.user_id, (net.get(s.user_id) || 0) - Number(s.share_amount));
  }
  // Settlements: from_user pays to_user.
  // A settlement REDUCES the payer's debt and REDUCES the recipient's credit.
  // (net is positive = owed money, negative = owes money.)
  for (const st of settlements) {
    net.set(st.from_user, (net.get(st.from_user) || 0) + Number(st.amount));
    net.set(st.to_user, (net.get(st.to_user) || 0) - Number(st.amount));
  }

  return members.map((m) => ({
    userId: m.id,
    name: m.name,
    net: Math.round((net.get(m.id) || 0) * 100) / 100
  }));
}

export function simplifyDebts(balances: Balance[]): Debt[] {
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ ...b, net: b.net }))
    .sort((a, b) => b.net - a.net);
  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ ...b, net: -b.net }))
    .sort((a, b) => b.net - a.net);

  const debts: Debt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].net, creditors[j].net);
    if (amount > 0.005) {
      debts.push({
        fromUserId: debtors[i].userId,
        fromName: debtors[i].name,
        toUserId: creditors[j].userId,
        toName: creditors[j].name,
        amount: Math.round(amount * 100) / 100
      });
    }
    debtors[i].net -= amount;
    creditors[j].net -= amount;
    if (debtors[i].net < 0.005) i++;
    if (creditors[j].net < 0.005) j++;
  }
  return debts;
}
