import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from './Avatar';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/80 backdrop-blur dark:border-ink-700 dark:bg-ink-900/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-olive-500 text-sm font-black text-white">
              m$
            </span>
            <span className="text-lg font-bold tracking-tight text-ink-900 dark:text-ink-50">
              moneysplit
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && user.role === 'superadmin' && (
              <Link to="/admin" className="btn-ghost">
                Admin
              </Link>
            )}
            {user && (
              <div className="flex items-center gap-2">
                <Link to="/profile" title="Profile" className="transition hover:opacity-80">
                  <Avatar name={user.name} />
                </Link>
                <button onClick={handleLogout} className="btn-ghost hidden sm:inline-flex">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
