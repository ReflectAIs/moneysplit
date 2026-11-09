import { useState, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { ThemeToggle } from '../components/ThemeToggle';
import { PasswordInput } from '../components/PasswordInput';

export function ResetPassword() {
    const { show } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialToken = searchParams.get('token') || '';

    const [token, setToken] = useState(initialToken);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!token.trim()) {
            setError('Reset token is required');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const res = await api.resetPassword(token.trim(), password);
            show(res.message);
            navigate('/login');
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
                        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Reset password</h1>
                        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Choose a new password.</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="label">Reset token</label>
                            <input
                                className="input"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Paste your reset token"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">New password</label>
                            <PasswordInput
                                value={password}
                                onChange={setPassword}
                                placeholder="At least 8 characters"
                                minLength={8}
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <label className="label">Confirm new password</label>
                            <PasswordInput
                                value={confirm}
                                onChange={setConfirm}
                                placeholder="Re-enter password"
                                minLength={8}
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <button type="submit" className="btn-primary w-full" disabled={loading}>
                            {loading ? 'Resetting…' : 'Reset password'}
                        </button>
                    </form>
                    <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
                        Remembered it?{' '}
                        <Link to="/login" className="font-semibold text-olive-600 hover:underline dark:text-olive-400">
                            Back to sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}