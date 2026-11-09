import { useState, FormEvent } from 'react';
import type { Debt } from '@moneysplit/shared';
import { Modal } from './Modal';
import { api } from '../lib/api';
import { useToast } from './Toast';

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
  const [fromUser, setFromUser] = useState('');
  const [toUser, setToUser] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fromUser || !toUser || !amount) {
      show('Select payer, recipient and amount', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.settle(groupId, fromUser, toUser, parseFloat(amount), note || undefined);
      show('Settlement recorded');
      onSettled();
      onClose();
      setAmount('');
      setNote('');
    } catch (err) {
      show((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Settle up">
      <form onSubmit={handleSubmit} className="space-y-4">
        {debts.length > 0 && (
          <div className="rounded-xl bg-olive-50 p-3 text-sm text-olive-800 dark:bg-olive-900/30 dark:text-olive-200">
            <p className="mb-2 font-semibold">Suggested:</p>
            {debts.map((d, i) => (
              <button
                key={i}
                type="button"
                className="block w-full text-left hover:underline"
                onClick={() => {
                  setFromUser(d.fromUserId);
                  setToUser(d.toUserId);
                  setAmount(String(d.amount));
                }}
              >
                {d.fromName} owes {d.toName} — {d.amount.toFixed(2)}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Pays</label>
            <select className="input" value={fromUser} onChange={(e) => setFromUser(e.target.value)}>
              <option value="">Select</option>
              {debts.map((d, i) => (
                <option key={i} value={d.fromUserId}>
                  {d.fromName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Receives</label>
            <select className="input" value={toUser} onChange={(e) => setToUser(e.target.value)}>
              <option value="">Select</option>
              {debts.map((d, i) => (
                <option key={i} value={d.toUserId}>
                  {d.toName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="label">Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid in cash" />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Recording…' : 'Record settlement'}
        </button>
      </form>
    </Modal>
  );
}
