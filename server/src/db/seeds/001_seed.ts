import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Only seed demo data on an empty database. Never wipe existing rows so that
  // re-running seeds (e.g. on every deploy) does not delete real users/groups.
  const existing = await knex('users').count<{ count?: string | number }>('id as count').first();
  if (existing && Number(existing.count) > 0) {
    return;
  }

  const hash = await bcrypt.hash('password123', 10);

  const [admin, alice, bob, carol] = await knex('users')
    .insert([
      { email: 'admin@reflectai.in', name: 'Super Admin', password_hash: hash, role: 'superadmin' },
      { email: 'alice@example.com', name: 'Alice', password_hash: hash },
      { email: 'bob@example.com', name: 'Bob', password_hash: hash },
      { email: 'carol@example.com', name: 'Carol', password_hash: hash }
    ])
    .returning('id');

  const [group] = await knex('groups')
    .insert({ name: 'Weekend Trip', description: 'Beach house getaway', created_by: alice.id })
    .returning('id');

  await knex('group_members').insert([
    { group_id: group.id, user_id: alice.id, role: 'admin' },
    { group_id: group.id, user_id: bob.id, role: 'member' },
    { group_id: group.id, user_id: carol.id, role: 'member' }
  ]);

  const [exp1] = await knex('expenses')
    .insert({
      group_id: group.id,
      paid_by: alice.id,
      amount: 3000,
      description: 'House booking',
      category: 'Accommodation',
      date: new Date()
    })
    .returning('id');

  await knex('expense_splits').insert([
    { expense_id: exp1.id, user_id: alice.id, share_amount: 1000, share_type: 'equal' },
    { expense_id: exp1.id, user_id: bob.id, share_amount: 1000, share_type: 'equal' },
    { expense_id: exp1.id, user_id: carol.id, share_amount: 1000, share_type: 'equal' }
  ]);

  const [exp2] = await knex('expenses')
    .insert({
      group_id: group.id,
      paid_by: bob.id,
      amount: 900,
      description: 'Groceries',
      category: 'Food',
      date: new Date()
    })
    .returning('id');

  await knex('expense_splits').insert([
    { expense_id: exp2.id, user_id: alice.id, share_amount: 300, share_type: 'equal' },
    { expense_id: exp2.id, user_id: bob.id, share_amount: 300, share_type: 'equal' },
    { expense_id: exp2.id, user_id: carol.id, share_amount: 300, share_type: 'equal' }
  ]);
}
