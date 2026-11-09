import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('group_members', (t) => {
        t.enu('role', ['admin', 'member']).notNullable().defaultTo('member');
    });

    // Promote the creator of each group to admin.
    const groups = await knex('groups').select('id', 'created_by');
    for (const g of groups) {
        await knex('group_members')
            .where({ group_id: g.id, user_id: g.created_by })
            .update({ role: 'admin' });
    }
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('group_members', (t) => {
        t.dropColumn('role');
    });
}