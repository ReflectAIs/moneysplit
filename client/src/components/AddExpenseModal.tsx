import { useState, FormEvent, useEffect } from 'react';
import type { GroupMember, SplitType, Expense } from '@moneysplit/shared';
import { Modal } from './Modal';
import { api } from '../lib/api';
import { useToast } from './Toast';
import { formatMoney } from '../lib/utils';

const CATEGORIES = ['Food', 'Transport', 'Accommodation', 'Shopping', 'Entertainment', 'Utilities', 'Other'];

export function AddExpenseModal({
  open,
  onClose,
  groupId,
  members,
  currentUserId,
  onAdded,
  editing
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  members: GroupMember[];
  currentUserId: string;
  onAdded: () => void;
  editing?: Expense | null;
}) {
  const { show } = useToast();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [percentSplits, setPercentSplits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const total = parseFloat(amount) || 0;

  // Populate the form when editing an existing expense.
  useEffect(() => {
    if (open && editing) {
      setDescription(editing.description);
      setAmount(String(editing.amount));
      setPaidBy(editing.paidBy);
      setCategory(editing.category);
      setDate(editing.date ? String(editing.date).slice(0, 10) : new Date().toISOString().slice(0, 10));
      const st = editing.splits[0]?.shareType || 'equal';
      setSplitType(st);
      const custom: Record<string, string> = {};
      const percent: Record<string, string> = {};
      for (const s of editing.splits) {
        if (st === 'custom') custom[s.userId] = String(s.shareAmount);
        else if (st === 'percent') {
          percent[s.userId] = editing.amount > 0 ? String(Math.round((s.shareAmount / editing.amount) * 10000) / 100) : '0';
        }
      }
      setCustomSplits(custom);
      setPercentSplits(percent);
    } else if (open) {
      setDescription('');
      setAmount('');
      setPaidBy(currentUserId);
      setCategory('Food');
      setDate(new Date().toISOString().slice(0, 10));
      setSplitType('equal');
      setCustomSplits({});
      setPercentSplits({});
    }
  }, [open, editing, currentUserId]);

  const buildSplits = (): { userId: string; share: number }[] => {
    if (splitType === 'equal') {
      const share = Math.round((total / members.length) * 100) / 100;
      return members.map((m) => ({ userId: m.userId, share }));
    }
    if (splitType === 'custom') {
      return members.map((m) => ({ userId: m.userId, share: parseFloat(customSplits[m.userId] || '0') || 0 }));
    }
    // percent
    return members.map((m) => ({
      userId: m.userId,
      share: Math.round((total * (parseFloat(percentSplits[m.userId] || '0') || 0)) / 100 * 100) / 100
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim() || total <= 0) {
      show('Enter a description and amount', 'error');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        description: description.trim(),
        amount: total,
        paidBy,
        category,
        date,
        splitType,
        splits: buildSplits()
      };
      if (editing) {
        await api.updateExpense(groupId, editing.id, payload);
        show('Expense updated');
      } else {
        await api.createExpense(groupId, payload);
        show('Expense added');
      }
      onAdded();
      onClose();
      setDescription('');
      setAmount('');
    } catch (err) {
      show((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit expense' : 'Add expense'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Description</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Paid by</label>
          <select className="input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Split</label>
          <div className="grid grid-cols-3 gap-2">
            {(['equal', 'custom', 'percent'] as SplitType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSplitType(t)}
                className={`btn ${splitType === t ? 'btn-primary' : 'btn-secondary'}`}
              >
                {t === 'equal' ? 'Equal' : t === 'custom' ? 'Custom' : 'Percent'}
              </button>
            ))}
          </div>
        </div>

        {splitType !== 'equal' && (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-700 dark:text-ink-200">{m.name}</span>
                <div className="flex items-center gap-1">
                  {splitType === 'percent' && <span className="text-sm text-ink-400">%</span>}
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input !w-28 !py-1.5 text-right"
                    value={splitType === 'custom' ? customSplits[m.userId] || '' : percentSplits[m.userId] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (splitType === 'custom') setCustomSplits((s) => ({ ...s, [m.userId]: val }));
                      else setPercentSplits((s) => ({ ...s, [m.userId]: val }));
                    }}
                    placeholder={splitType === 'custom' ? 'Amount' : '0'}
                  />
                </div>
              </div>
            ))}
            <p className="text-right text-xs text-ink-400">
              {splitType === 'custom' ? `Total: ${formatMoney(total)}` : 'Percentages of total'}
            </p>
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}
        </button>
      </form>
    </Modal>
  );
}
