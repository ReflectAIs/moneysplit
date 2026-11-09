import { useState } from 'react';
import type { FamilyDebt } from '@moneysplit/shared';
import { Modal } from './Modal';
import { api } from '../lib/api';
import { useToast } from './Toast';
import { formatMoney } from '../lib/utils';

export function FamilySettleModal({
    open,
    onClose,
    groupId,
    debts,
    onSettled
}: {
    open: boolean;
    onClose: () => void;
    groupId: string;
    debts: FamilyDebt[];
    onSettled: () => void;
}) {
    const { show } = useToast();
    const [settlingId, setSettlingId] = useState<string | null>(null);

    const handleSettle = async (debt: FamilyDebt) => {
        setSettlingId(`${debt.fromFamilyId}-${debt.toFamilyId}`);
        try {
            await api.settleFamilies(groupId, debt.fromFamilyId, debt.toFamilyId, debt.amount);
            show(`${debt.fromName} → ${debt.toName} settled`);
            onSettled();
        } catch (err) {
            show((err as Error).message, 'error');
        } finally {
            setSettlingId(null);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Settle between families">
            <div className="space-y-4">
                <p className="text-sm text-ink-500 dark:text-ink-400">
                    Below is which family owes which. Click <span className="font-semibold text-olive-600 dark:text-olive-400">Settle</span> once the money has been transferred between families.
                </p>

                {debts.length === 0 ? (
                    <div className="rounded-xl bg-olive-50 p-6 text-center text-sm text-olive-800 dark:bg-olive-900/30 dark:text-olive-200">
                        🎉 All families settled up! No outstanding balances.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {debts.map((d) => {
                            const loading = settlingId === `${d.fromFamilyId}-${d.toFamilyId}`;
                            return (
                                <div
                                    key={`${d.fromFamilyId}-${d.toFamilyId}`}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-3 dark:border-ink-700 dark:bg-ink-800"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                                            {d.fromName}
                                            <span className="mx-1 font-normal text-ink-400">pays</span>
                                            {d.toName}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <span className="font-bold text-olive-600 dark:text-olive-400">{formatMoney(d.amount)}</span>
                                        <button
                                            onClick={() => handleSettle(d)}
                                            disabled={loading}
                                            className="btn-primary !px-3 !py-1.5 text-xs"
                                        >
                                            {loading ? 'Settling…' : 'Settle'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}