import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { GroupMember, Expense, Balance, Debt } from '@moneysplit/shared';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { SettleUpModal } from '../components/SettleUpModal';
import { formatMoney, formatDate } from '../lib/utils';

export function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [group, setGroup] = useState<{ id: string; name: string; description: string | null; members: GroupMember[] } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  const { user } = useAuth();
  const currentUserId = user?.id || '';

  const load = async () => {
    if (!id) return;
    try {
      const [g, ex, bal] = await Promise.all([
        api.getGroup(id),
        api.listExpenses(id),
        api.getBalances(id)
      ]);
      setGroup(g);
      setExpenses(ex);
      setBalances(bal.balances);
      setDebts(bal.debts);
    } catch (err) {
      show((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleInvite = async () => {
    if (!id) return;
    try {
      const link = await api.createInvite(id);
      setInviteUrl(link.url);
      await navigator.clipboard.writeText(link.url);
      show('Invite link copied');
    } catch (err) {
      show((err as Error).message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-olive-500 border-t-transparent" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="card py-16 text-center">
        <p className="text-ink-500 dark:text-ink-400">Group not found.</p>
        <Link to="/" className="btn-primary mt-4">Back to groups</Link>
      </div>
    );
  }

  const myBalance = balances.find((b) => b.userId === currentUserId)?.net ?? 0;

  return (
    <div>
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-olive-600 dark:text-ink-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Groups
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">{group.name}</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {group.description || `${group.members.length} members`}
          </p>
        </div>
        <button onClick={handleInvite} className="btn-secondary shrink-0">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
          </svg>
          <span className="hidden sm:inline">Invite</span>
        </button>
      </div>

      {inviteUrl && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-olive-50 p-3 text-sm dark:bg-olive-900/30">
          <span className="flex-1 truncate text-olive-800 dark:text-olive-200">{inviteUrl}</span>
          <button
            onClick={() => navigator.clipboard.writeText(inviteUrl).then(() => show('Copied'))}
            className="btn-ghost !p-1"
          >
            Copy
          </button>
        </div>
      )}

      {/* My balance */}
      <div className="card mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-500 dark:text-ink-400">Your balance</p>
          <p className={`text-2xl font-bold ${myBalance >= 0 ? 'text-olive-600 dark:text-olive-400' : 'text-red-600 dark:text-red-400'}`}>
            {myBalance >= 0 ? '+' : ''}{formatMoney(myBalance)}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add expense</span>
          </button>
          <button onClick={() => setShowSettle(true)} className="btn-secondary">
            Settle up
          </button>
        </div>
      </div>

      {/* Balances */}
      {balances.length > 0 && (
        <div className="card mb-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Balances</h2>
          <div className="space-y-2">
            {balances.map((b) => (
              <div key={b.userId} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Avatar name={b.name} className="h-7 w-7 text-[10px]" />
                  {b.name}
                </span>
                <span className={b.net >= 0 ? 'font-semibold text-olive-600 dark:text-olive-400' : 'font-semibold text-red-600 dark:text-red-400'}>
                  {b.net >= 0 ? '+' : ''}{formatMoney(b.net)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debts */}
      {debts.length > 0 && (
        <div className="card mb-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Who owes whom</h2>
          <div className="space-y-2">
            {debts.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink-700 dark:text-ink-200">
                  <span className="font-semibold">{d.fromName}</span> owes{' '}
                  <span className="font-semibold">{d.toName}</span>
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400">{formatMoney(d.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Expenses</h2>
      </div>
      {expenses.length === 0 ? (
        <div className="card py-10 text-center text-sm text-ink-500 dark:text-ink-400">
          No expenses yet. Add the first one!
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((e) => (
            <div key={e.id} className="card">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900 dark:text-ink-50">{e.description}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    {e.paidByName} paid · {formatDate(e.date)} · {e.category}
                  </p>
                </div>
                <span className="shrink-0 font-bold text-ink-900 dark:text-ink-50">{formatMoney(e.amount)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {e.splits.map((s) => (
                  <span key={s.id} className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600 dark:bg-ink-700 dark:text-ink-300">
                    {s.name}: {formatMoney(s.shareAmount)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddExpenseModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        groupId={id!}
        members={group.members}
        currentUserId={currentUserId}
        onAdded={load}
      />
      <SettleUpModal
        open={showSettle}
        onClose={() => setShowSettle(false)}
        groupId={id!}
        debts={debts}
        currentUserId={currentUserId}
        onSettled={load}
      />
    </div>
  );
}
