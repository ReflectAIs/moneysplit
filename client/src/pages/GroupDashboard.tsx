import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Expense, Balance, FamilyDetail } from '@moneysplit/shared';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { formatMoney } from '../lib/utils';

interface PayerTotal {
    userId: string;
    name: string;
    total: number;
}

export function GroupDashboard() {
    const { id } = useParams<{ id: string }>();
    const { show } = useToast();
    const [groupName, setGroupName] = useState('');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [balances, setBalances] = useState<Balance[]>([]);
    const [families, setFamilies] = useState<FamilyDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const [group, exp, bal, fam] = await Promise.all([
                    api.getGroup(id),
                    api.listExpenses(id),
                    api.getBalances(id),
                    api.listFamilies(id)
                ]);
                setGroupName(group.name);
                setExpenses(exp);
                setBalances(bal.balances);
                setFamilies(fam);
            } catch (err) {
                show((err as Error).message, 'error');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-olive-500 border-t-transparent" />
            </div>
        );
    }

    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Who paid how much
    const payerMap = new Map<string, PayerTotal>();
    for (const e of expenses) {
        const cur = payerMap.get(e.paidBy) || { userId: e.paidBy, name: e.paidByName, total: 0 };
        cur.total += Number(e.amount);
        payerMap.set(e.paidBy, cur);
    }
    const payers = Array.from(payerMap.values()).sort((a, b) => b.total - a.total);

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const e of expenses) {
        catMap.set(e.category || 'Other', (catMap.get(e.category || 'Other') || 0) + Number(e.amount));
    }
    const categories = Array.from(catMap.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

    // Per-family totals (only when families exist)
    const familyTotals =
        families.length > 0
            ? families.map((f) => {
                const memberIds = new Set(f.members.map((m) => m.userId));
                const total = expenses
                    .filter((e) => memberIds.has(e.paidBy))
                    .reduce((sum, e) => sum + Number(e.amount), 0);
                return { name: f.name, total };
            })
            : [];

    // Recent expenses (newest first)
    const recent = [...expenses].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <Link to={`/groups/${id}`} className="text-sm text-olive-600 hover:underline dark:text-olive-400">
                        ← Back to group
                    </Link>
                    <h1 className="mt-1 text-2xl font-bold text-ink-900 dark:text-ink-50">{groupName} dashboard</h1>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Total spent</p>
                    <p className="mt-1 text-xl font-bold text-olive-600 dark:text-olive-400">{formatMoney(totalSpent)}</p>
                </div>
                <div className="card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Expenses</p>
                    <p className="mt-1 text-xl font-bold text-ink-900 dark:text-ink-50">{expenses.length}</p>
                </div>
                <div className="card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Members</p>
                    <p className="mt-1 text-xl font-bold text-ink-900 dark:text-ink-50">{balances.length}</p>
                </div>
            </div>

            {/* Who paid how much */}
            <section className="card">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-olive-600 dark:text-olive-400">
                    Who paid how much
                </h2>
                {payers.length === 0 ? (
                    <p className="text-sm text-white" style={{ color: 'inherit' }}>No expenses yet.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                        {payers.map((p) => (
                            <li
                                key={p.userId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    paddingTop: '6px',
                                    paddingBottom: '6px'
                                }}
                            >
                                <span style={{ fontSize: '14px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.name}
                                </span>
                                <span style={{ fontWeight: 'bold', color: '#808000' }}>{formatMoney(p.total)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Category breakdown */}
            {categories.length > 0 && (
                <section className="card">
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-olive-600 dark:text-olive-400">
                        By category
                    </h2>
                    <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                        {categories.map((c) => (
                            <li
                                key={c.name}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    paddingTop: '6px',
                                    paddingBottom: '6px'
                                }}
                            >
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>{c.name}</span>
                                <span style={{ fontWeight: 'bold', color: '#808000' }}>{formatMoney(c.total)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Per-family totals */}
            {familyTotals.length > 0 && (
                <section className="card">
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-olive-600 dark:text-olive-400">
                        Per family
                    </h2>
                    <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                        {familyTotals.map((f) => (
                            <li
                                key={f.name}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    paddingTop: '6px',
                                    paddingBottom: '6px'
                                }}
                            >
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>{f.name}</span>
                                <span style={{ fontWeight: 'bold', color: '#808000' }}>{formatMoney(f.total)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Recent expenses */}
            <section className="card">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-olive-600 dark:text-olive-400">
                    Recent expenses
                </h2>
                {recent.length === 0 ? (
                    <p className="text-sm text-white" style={{ color: 'inherit' }}>No expenses yet.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                        {recent.slice(0, 10).map((e) => (
                            <li
                                key={e.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    paddingTop: '8px',
                                    paddingBottom: '8px',
                                    borderBottom:
                                        recent.indexOf(e) === recent.slice(0, 10).length - 1 ? undefined : '#d1d1d1'
                                }}
                            >
                                <div style={{ minWidth: '40%', overflow: 'hidden' }}>
                                    <p style={{ margin: '0', fontSize: '14px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {e.description}
                                    </p>
                                    <p style={{ marginTop: '2px', marginBottom: '0', fontSize: '12px', color: '#888888' }}>
                                        Paid by {e.paidByName}
                                    </p>
                                </div>
                                <span style={{ fontWeight: 'bold', color: '#808000' }}>{formatMoney(e.amount)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}