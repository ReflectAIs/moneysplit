import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Group } from '@moneysplit/shared';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';

export function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const { show } = useToast();

  const load = async () => {
    try {
      const data = await api.listGroups();
      setGroups(data);
    } catch (err) {
      show((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const g = await api.createGroup(name, description || undefined);
      setGroups((prev) => [g, ...prev]);
      setShowCreate(false);
      setName('');
      setDescription('');
      show('Group created');
    } catch (err) {
      show((err as Error).message, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Your groups</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Track shared expenses with anyone.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">New group</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-olive-500 border-t-transparent" />
        </div>
      ) : groups.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-olive-100 text-3xl dark:bg-olive-900/40">
            👥
          </div>
          <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50">No groups yet</h2>
          <p className="mt-1 max-w-xs text-sm text-ink-500 dark:text-ink-400">
            Create a group to start splitting expenses with friends, family or roommates.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-5">
            Create your first group
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="card flex items-center gap-4 transition-colors hover:border-olive-400"
            >
              <Avatar name={g.name} className="h-11 w-11 text-sm" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-ink-900 dark:text-ink-50">{g.name}</h3>
                <p className="truncate text-sm text-ink-500 dark:text-ink-400">
                  {g.description || `${g.memberCount} member${g.memberCount > 1 ? 's' : ''}`}
                </p>
              </div>
              <svg className="h-5 w-5 shrink-0 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New group">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Group name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend Trip"
              required
            />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Beach house getaway"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={creating}>
            {creating ? 'Creating…' : 'Create group'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
