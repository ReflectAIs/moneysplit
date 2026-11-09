import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('email').notNullable().unique();
    t.string('name').notNullable();
    t.string('password_hash').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('groups', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name').notNullable();
    t.text('description');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('group_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('joined_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['group_id', 'user_id']);
  });

  await knex.schema.createTable('expenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
    t.uuid('paid_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.decimal('amount', 12, 2).notNullable();
    t.string('description').notNullable();
    t.string('category').notNullable().defaultTo('Other');
    t.date('date').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('expense_splits', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('expense_id').notNullable().references('id').inTable('expenses').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.decimal('share_amount', 12, 2).notNullable();
    t.enu('share_type', ['equal', 'custom', 'percent']).notNullable().defaultTo('equal');
  });

  await knex.schema.createTable('settlements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
    t.uuid('from_user').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('to_user').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.decimal('amount', 12, 2).notNullable();
    t.text('note');
    t.timestamp('settled_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('invite_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token').notNullable().unique();
    t.timestamp('expires_at').notNullable();
    t.boolean('used').notNullable().defaultTo(false);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invite_tokens');
  await knex.schema.dropTableIfExists('settlements');
  await knex.schema.dropTableIfExists('expense_splits');
  await knex.schema.dropTableIfExists('expenses');
  await knex.schema.dropTableIfExists('group_members');
  await knex.schema.dropTableIfExists('groups');
  await knex.schema.dropTableIfExists('users');
}
