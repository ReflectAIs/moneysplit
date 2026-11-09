import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { ThemeToggle } from '../components/ThemeToggle';

export function ForgotPassword() {
    const { show } = useToast();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetToken, setResetToken] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.forgotPassword(email);
            show(res.message);
            // Dev convenience: expose the reset token so the flow can be completed without an email service.
            if (res.resetToken) setResetToken(res.resetToken);
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
                        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Forgot password</h1>
                        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                            Enter your email to receive a reset link.
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="label">Email</label>
                            <input
                                type="email"
                                className="input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary w-full" disabled={loading}>
                            {loading ? 'Sending…' : 'Send reset link'}
                        </button>
                    </form>

                    {resetToken && (
                        <div className="mt-4 rounded-xl bg-olive-50 px-4 py-3 text-sm text-olive-800 dark:bg-olive-900/30 dark:text-olive-200">
                            <p className="mb-1 font-semibold">No email service is configured, so here is your reset token:</p>
                            <p className="break-all font-mono text-xs">{resetToken}</p>
                            <p className="mt-2">
                                Use it on the{' '}
                                <Link to={`/reset-password?token=${encodeURIComponent(resetToken)}`} className="font-semibold underline">
                                    reset password
                                </Link>{' '}
                                page.
                            </p>
                        </div>
                    )}

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