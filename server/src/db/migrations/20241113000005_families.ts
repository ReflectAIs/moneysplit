import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Families are named subgroups scoped to a group.
    await knex.schema.createTable('families', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        t.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
        t.string('name').notNullable();
        t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
        t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });

    // Each group member may optionally belong to one family within the group.
    // Strictly additive: existing members keep their data, family_id is nullable.
    await knex.schema.alterTable('group_members', (t) => {
        t.uuid('family_id').references('id').inTable('families').onDelete('SET NULL');
    });

    // Family-to-family settlements are stored separately from user settlements.
    await knex.schema.createTable('family_settlements', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        t.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
        t.uuid('from_family').notNullable().references('id').inTable('families').onDelete('CASCADE');
        t.uuid('to_family').notNullable().references('id').inTable('families').onDelete('CASCADE');
        t.decimal('amount', 12, 2).notNullable();
        t.text('note');
        t.timestamp('settled_at').notNullable().defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('family_settlements');
    await knex.schema.alterTable('group_members', (t) => {
        t.dropColumn('family_id');
    });
    await knex.schema.dropTableIfExists('families');
}