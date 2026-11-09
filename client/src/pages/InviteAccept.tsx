import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import { ThemeToggle } from '../components/ThemeToggle';
import { PasswordInput } from '../components/PasswordInput';

export function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const { user, login, register } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>(user ? 'login' : 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [history, setHistory] = useState<'include' | 'new'>('new');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    setError('');
    try {
      if (!user) {
        if (mode === 'signup') {
          await register(name, email, password);
        } else {
          await login(email, password);
        }
      }
      const group = await api.joinGroup(token!, history);
      show(`Joined ${group.name}`);
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-olive-500 text-2xl font-black text-white">
              m$
            </div>
            <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">You're invited!</h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              {user ? 'Join the group to start splitting expenses.' : 'Create an account or sign in to join.'}
            </p>
          </div>

          {!user && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('signup')}
                className={`btn ${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Sign up
              </button>
              <button
                onClick={() => setMode('login')}
                className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Sign in
              </button>
            </div>
          )}

          <div className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}
            {!user && mode === 'signup' && (
              <div>
                <label className="label">Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
            )}
            {!user && (
              <>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                    minLength={mode === 'signup' ? 8 : undefined}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                </div>
              </>
            )}

            <div>
              <label className="label">How do you want to join?</label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setHistory('new')}
                  className={`w-full rounded-xl border p-3 text-left transition ${history === 'new'
                      ? 'border-olive-500 bg-olive-50 dark:bg-olive-900/30'
                      : 'border-ink-200 dark:border-ink-700'
                    }`}
                >
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">Start fresh (new history)</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    Only participate in expenses added after you join.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setHistory('include')}
                  className={`w-full rounded-xl border p-3 text-left transition ${history === 'include'
                      ? 'border-olive-500 bg-olive-50 dark:bg-olive-900/30'
                      : 'border-ink-200 dark:border-ink-700'
                    }`}
                >
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">Include in previous history</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    Share the cost of past expenses too (equal splits only).
                  </p>
                </button>
              </div>
            </div>

            <button onClick={handleJoin} className="btn-primary w-full" disabled={loading}>
              {loading ? 'Joining…' : user ? 'Join group' : mode === 'signup' ? 'Create account & join' : 'Sign in & join'}
            </button>
            <p className="text-center text-sm text-ink-500 dark:text-ink-400">
              <Link to="/" className="font-semibold text-olive-600 hover:underline dark:text-olive-400">
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
