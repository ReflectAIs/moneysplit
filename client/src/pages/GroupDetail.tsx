import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { GroupMember, Expense, Balance, Debt, GroupMemberRole } from '@moneysplit/shared';
import type { FamilyDetail, FamilyDebt } from '@moneysplit/shared';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { SettleUpModal } from '../components/SettleUpModal';
import { FamilySettleModal } from '../components/FamilySettleModal';
import { formatMoney, formatDate } from '../lib/utils';

export function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const navigate = useNavigate();
  const [group, setGroup] = useState<{ id: string; name: string; description: string | null; members: GroupMember[]; myRole: GroupMemberRole } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showSettle, setShowSettle] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [families, setFamilies] = useState<FamilyDetail[]>([]);
  const [familyDebts, setFamilyDebts] = useState<FamilyDebt[]>([]);
  const [showFamilySettle, setShowFamilySettle] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');

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

      const fam = await api.listFamilies(id).catch(() => []);
      setFamilies(fam);

      const famBal = await api.getFamilyBalances(id).catch(() => ({ balances: [], debts: [] }));
      setFamilyDebts(famBal.debts);
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

  const isAdmin = group?.myRole === 'admin';

  const handleDeleteExpense = async (expense: Expense) => {
    if (!id) return;
    if (!window.confirm(`Delete "${expense.description}"? This cannot be undone.`)) return;
    try {
      await api.deleteExpense(id, expense.id);
      show('Expense deleted');
      load();
    } catch (err) {
      show((err as Error).message, 'error');
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowAdd(true);
  };

  const handleRemoveMember = async (member: GroupMember) => {
    if (!id) return;
    if (!window.confirm(`Remove ${member.name} from this group?`)) return;
    try {
      await api.removeMember(id, member.userId);
      show(`${member.name} removed`);
      load();
    } catch (err) {
      show((err as Error).message, 'error');
    }
  };

  const handlePromote = async (member: GroupMember) => {
    if (!id) return;
    try {
      await api.promoteMember(id, member.userId);
      show(`${member.name} is now an admin`);
      load();
    } catch (err) {
      show((err as Error).message, 'error');
    }
  };

  const handleDemote = async (member: GroupMember) => {
    if (!id) return;
    try {
      await api.demoteMember(id, member.userId);
      show(`${member.name} is now a member`);
      load();
    } catch (err) {
      show((err as Error).message, 'error');
    }
  };

  const openEditGroup = () => {
    if (!group) return;
    setGroupName(group.name);
    setGroupDesc(group.description || '');
    setShowEditGroup(true);
  };

  const handleSaveGroup = async () => {
    if (!id || !groupName.trim()) return;
    try {
      await api.updateGroup(id, { name: groupName.trim(), description: groupDesc });
      show('Group updated');
      setShowEditGroup(false);
      load();
    } catch (err) {
      show((err as Error).message, 'error');
    }
  };

  const handleDeleteGroup = async () => {
    if (!id) return;
    if (!window.confirm(`Delete group "${group?.name}"? All expenses and balances will be removed.`)) return;
    try {
      await api.deleteGroup(id);
      show('Group deleted');
      navigate('/');
    } catch (err) {
      show((err as Error).message, 'error');
    }
  };

  const handleCreateFamily = async () => {
    if (!id || !newFamilyName.trim()) return;
    try {
      await api.createFamily(id, newFamilyName.trim());
      setNewFamilyName('');
      show('Family created');
      load();
    } catch (err) {
      show((err as Error).message, 'error');
    }
  };

  const handleAssignMember = async (familyId: string, userId: string) => {
    if (!id) return;
    try {
      await api.assignMemberToFamily(id, familyId, userId);
      show('Member assigned to family');
      load();
    } catch (err) {
      show((err as Error).message, 'error');
    }
  };

  const handleRemoveFromFamily = async (familyId: string, userId: string) => {
    if (!id) return;
    try {
      await api.removeMemberFromFamily(id, familyId, userId);
      show('Member removed from family');
      load();
    } catch (err) {
      show((err as Error).message, 'error');
    }
  };

  const handleDeleteFamily = async (familyId: string) => {
    if (!id) return;
    if (!window.confirm('Delete this family?')) return;
    try {
      await api.deleteFamily(id, familyId);
      show('Family deleted');
      load();
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
        <div className="flex shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap">
          <Link to={`/groups/${id}/dashboard`} className="btn-secondary" title="Dashboard">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          {isAdmin && (
            <>
              <button onClick={openEditGroup} className="btn-secondary" title="Edit group">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button onClick={handleDeleteGroup} className="btn-danger" title="Delete group">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">Delete</span>
              </button>
            </>
          )}
          <button onClick={handleInvite} className="btn-secondary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
            </svg>
            <span className="hidden sm:inline">Invite</span>
          </button>
        </div>
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

      {/* Members */}
      <div className="card mb-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
          Members ({group.members.length})
        </h2>
        <div className="space-y-2">
          {group.members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={m.name} className="h-7 w-7 text-[10px]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900 dark:text-ink-50">
                    {m.name}
                    {m.userId === currentUserId && <span className="text-ink-400"> (you)</span>}
                  </p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    {m.role === 'admin' ? 'Admin' : 'Member'}
                  </p>
                </div>
              </div>
              {isAdmin && m.userId !== currentUserId && (
                <div className="flex shrink-0 items-center gap-1">
                  {m.role === 'admin' ? (
                    <button onClick={() => handleDemote(m)} className="btn-ghost !px-2 !py-1 text-xs" title="Demote to member">
                      Demote
                    </button>
                  ) : (
                    <button onClick={() => handlePromote(m)} className="btn-ghost !px-2 !py-1 text-xs" title="Make admin">
                      Make admin
                    </button>
                  )}
                  <button onClick={() => handleRemoveMember(m)} className="btn-ghost !px-2 !py-1 text-xs text-red-500 hover:text-red-600" title="Remove member">
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Families */}
      <div className="card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white" style={{ color: '#888888' }}>
            Families ({families.length})
          </h2>
          {familyDebts.length > 0 && (
            <button onClick={() => setShowFamilySettle(true)} className="btn-secondary !px-3 !py-1.5 text-xs">
              Settle families
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="mb-3 flex gap-2">
            <input
              className="input"
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              placeholder="New family name"
            />
            <button onClick={handleCreateFamily} className="btn-primary shrink-0">Add</button>
          </div>
        )}

        {families.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#888888' }}>No families yet.</p>
        ) : (
          <div className="space-y-3">
            {families.map((f) => {
              const assignedIds = new Set(families.flatMap((x) => x.members.map((m) => m.userId)));
              const unassigned = group.members.filter((m) => !assignedIds.has(m.userId));
              return (
                <div key={f.id} className="rounded-xl border border-white p-3" style={{ borderColor: '#d1d1d1' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p style={{ fontWeight: '600', fontSize: '14px', color: '#0a0a0a' }}>{f.name}</p>
                    {isAdmin && (
                      <button onClick={() => handleDeleteFamily(f.id)} className="btn-danger !px-2 !py-1 text-xs">
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.members.map((m) => (
                      <span key={m.userId} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs" style={{ backgroundColor: '#ececd0', color: '#555500' }}>
                        {m.name}
                        {isAdmin && (
                          <button onClick={() => handleRemoveFromFamily(f.id, m.userId)} title="Remove from family" style={{ color: '#808000' }}>×</button>
                        )}
                      </span>
                    ))}
                    {f.members.length === 0 && (
                      <span style={{ fontSize: '12px', color: '#888888' }}>No members</span>
                    )}
                  </div>
                  {isAdmin && unassigned.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => e.target.value && handleAssignMember(f.id, e.target.value)}
                      className="input mt-2 !py-1 text-xs"
                    >
                      <option value="">Assign member…</option>
                      {unassigned.map((m) => (
                        <option key={m.userId} value={m.userId}>{m.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expenses */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white" style={{ color: '#888888' }}>Expenses</h2>
      </div>
      {expenses.length === 0 ? (
        <div className="card py-10 text-center text-sm text-ink-500 dark:text-ink-400">
          No expenses yet. Add the first one!
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((e) => {
            const canManage = isAdmin || e.paidBy === currentUserId;
            return (
              <div key={e.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900 dark:text-ink-50">{e.description}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {e.paidByName} paid · {formatDate(e.date)} · {e.category}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-bold text-ink-900 dark:text-ink-50">{formatMoney(e.amount)}</span>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditExpense(e)} className="btn-ghost !p-1.5" title="Edit expense">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteExpense(e)} className="btn-ghost !p-1.5 text-red-500 hover:text-red-600" title="Delete expense">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {e.splits.map((s) => (
                    <span key={s.id} className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600 dark:bg-ink-700 dark:text-ink-300">
                      {s.name}: {formatMoney(s.shareAmount)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddExpenseModal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setEditingExpense(null);
        }}
        groupId={id!}
        members={group.members}
        currentUserId={currentUserId}
        onAdded={load}
        editing={editingExpense}
      />
      <SettleUpModal
        open={showSettle}
        onClose={() => setShowSettle(false)}
        groupId={id!}
        debts={debts}
        currentUserId={currentUserId}
        onSettled={load}
      />
      <FamilySettleModal
        open={showFamilySettle}
        onClose={() => setShowFamilySettle(false)}
        groupId={id!}
        debts={familyDebts}
        onSettled={load}
      />

      {/* Edit group modal */}
      {showEditGroup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditGroup(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl dark:bg-ink-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink-900 dark:text-ink-50">Edit group</h2>
              <button onClick={() => setShowEditGroup(false)} className="btn-ghost !p-1" aria-label="Close">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Group name</label>
                <input className="input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="Optional description" rows={3} />
              </div>
              <button onClick={handleSaveGroup} className="btn-primary w-full">
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
