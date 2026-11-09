import db from '../db/connection';
import { FamilyBalance, FamilyDebt } from '@moneysplit/shared';
import { getBalances } from './balance';

/**
 * Aggregate per-member net balances into per-family net balances.
 * A family's net is the sum of its members' nets. Members without a family
 * are excluded (they are "unassigned").
 */
export async function getFamilyBalances(groupId: string): Promise<FamilyBalance[]> {
    const families = await db('families')
        .where({ group_id: groupId })
        .select('id', 'name');

    if (families.length === 0) return [];

    const memberships = await db('group_members')
        .where({ group_id: groupId })
        .whereNotNull('family_id')
        .select('user_id', 'family_id');

    const memberBalances = await getBalances(groupId);
    const netByUser = new Map(memberBalances.map((b) => [b.userId, b.net]));

    const familyNet = new Map<string, number>();
    families.forEach((f) => familyNet.set(f.id, 0));

    for (const m of memberships) {
        const net = netByUser.get(m.user_id) || 0;
        familyNet.set(m.family_id, (familyNet.get(m.family_id) || 0) + net);
    }

    return families.map((f) => ({
        familyId: f.id,
        name: f.name,
        net: Math.round((familyNet.get(f.id) || 0) * 100) / 100
    }));
}

/**
 * Simplify a set of family balances into the minimal set of family-to-family
 * debts using the same greedy algorithm used for user debts.
 */
export function simplifyFamilyDebts(balances: FamilyBalance[]): FamilyDebt[] {
    const creditors = balances
        .filter((b) => b.net > 0.005)
        .map((b) => ({ ...b, net: b.net }))
        .sort((a, b) => b.net - a.net);

    const debtors = balances
        .filter((b) => b.net < -0.005)
        .map((b) => ({ ...b, net: -b.net }))
        .sort((a, b) => b.net - a.net);

    const debts: FamilyDebt[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const amount = Math.min(debtors[i].net, creditors[j].net);
        if (amount > 0.005) {
            debts.push({
                fromFamilyId: debtors[i].familyId,
                fromName: debtors[i].name,
                toFamilyId: creditors[j].familyId,
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