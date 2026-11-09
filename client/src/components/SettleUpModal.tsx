import { useState } from 'react';
import type { Debt } from '@moneysplit/shared';
import { Modal } from './Modal';
import { api } from '../lib/api';
import { useToast } from './Toast';
import { Avatar } from './Avatar';
import { formatMoney } from '../lib/utils';

export function SettleUpModal({
  open,
  onClose,
  groupId,
  debts,
  currentUserId,
  onSettled
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  debts: Debt[];
  currentUserId: string;
  onSettled: () => void;
}) {
  const { show } = useToast();
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const handleSettle = async (debt: Debt) => {
    setSettlingId(`${debt.fromUserId}-${debt.toUserId}`);
    try {
      await api.settle(groupId, debt.fromUserId, debt.toUserId, debt.amount);
      show(`${debt.fromName} → ${debt.toName} settled`);
      onSettled();
    } catch (err) {
      show((err as Error).message, 'error');
    } finally {
      setSettlingId(null);
    }
  };

  // Debts where the current user is the recipient (they receive money and confirm receipt)
  const myIncoming = debts.filter((d) => d.toUserId === currentUserId);
  // Debts where the current user is the payer (they owe money)
  const myOutgoing = debts.filter((d) => d.fromUserId === currentUserId);
  // Debts between other people (not involving the current user)
  const others = debts.filter(
    (d) => d.fromUserId !== currentUserId && d.toUserId !== currentUserId
  );

  const renderRow = (d: Debt, i: number) => {
    const isRecipient = d.toUserId === currentUserId;
    const isPayer = d.fromUserId === currentUserId;
    const loading = settlingId === `${d.fromUserId}-${d.toUserId}`;

    return (
      <div
        key={`${d.fromUserId}-${d.toUserId}-${i}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-3 dark:border-ink-700 dark:bg-ink-800"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={d.fromName} className="h-8 w-8 text-[11px]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
              {d.fromName}
              <span className="mx-1 font-normal text-ink-400">pays</span>
              {d.toName}
            </p>
            <p className="text-xs text-ink-500 dark:text-ink-400">
              {isRecipient ? 'You receive this' : isPayer ? 'You pay this' : 'Between others'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-bold text-olive-600 dark:text-olive-400">{formatMoney(d.amount)}</span>
          {isRecipient ? (
            <button
              onClick={() => handleSettle(d)}
              disabled={loading}
              className="btn-primary !px-3 !py-1.5 text-xs"
            >
              {loading ? 'Settling…' : 'Settle'}
            </button>
          ) : (
            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-500 dark:bg-ink-700 dark:text-ink-400">
              {isPayer ? 'Awaiting' : '—'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Settle up">
      <div className="space-y-4">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Below is who owes whom. As the recipient, click <span className="font-semibold text-olive-600 dark:text-olive-400">Settle</span> once you have received the money.
        </p>

        {debts.length === 0 ? (
          <div className="rounded-xl bg-olive-50 p-6 text-center text-sm text-olive-800 dark:bg-olive-900/30 dark:text-olive-200">
            🎉 All settled up! No outstanding balances.
          </div>
        ) : (
          <div className="space-y-2">
            {myIncoming.length > 0 && (
              <>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-olive-600 dark:text-olive-400">
                  You will receive
                </h3>
                {myIncoming.map((d, i) => renderRow(d, i))}
              </>
            )}

            {myOutgoing.length > 0 && (
              <>
                <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                  You owe
                </h3>
                {myOutgoing.map((d, i) => renderRow(d, i))}
              </>
            )}

            {others.length > 0 && (
              <>
                <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
                  Others
                </h3>
                {others.map((d, i) => renderRow(d, i))}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
