import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { formatDate } from '../lib/utils';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface AdminGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdByEmail: string;
}

export function AdminDashboard() {
  const { show } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [u, g] = await Promise.all([api.adminListUsers(), api.adminListGroups()]);
        setUsers(u);
        setGroups(g);
      } catch (err) {
        show((err as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-olive-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Admin</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">Registered users and groups.</p>
      </div>

      {/* Users */}
      <div className="card mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
          Users ({users.length})
        </h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 py-1">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={u.name} className="h-8 w-8 text-[10px]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900 dark:text-ink-50">{u.name}</p>
                  <p className="truncate text-xs text-ink-500 dark:text-ink-400">{u.email}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-ink-400">{formatDate(u.createdAt)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    u.role === 'superadmin'
                      ? 'bg-olive-100 text-olive-700 dark:bg-olive-900/40 dark:text-olive-300'
                      : 'bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-ink-300'
                  }`}
                >
                  {u.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Groups */}
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
          Groups ({groups.length})
        </h2>
        {groups.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-500 dark:text-ink-400">No groups yet.</p>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 py-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900 dark:text-ink-50">{g.name}</p>
                  <p className="truncate text-xs text-ink-500 dark:text-ink-400">
                    {g.description || 'No description'} · created by {g.createdByEmail}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-400">{formatDate(g.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        <Link to="/" className="font-semibold text-olive-600 hover:underline dark:text-olive-400">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
