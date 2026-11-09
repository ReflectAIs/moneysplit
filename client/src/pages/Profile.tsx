import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { PasswordInput } from '../components/PasswordInput';

export function Profile() {
    const { user, updateUser } = useAuth();
    const { show } = useToast();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [profileError, setProfileError] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwError, setPwError] = useState('');
    const [pwLoading, setPwLoading] = useState(false);

    const handleProfile = async (e: FormEvent) => {
        e.preventDefault();
        setProfileError('');
        setProfileLoading(true);
        try {
            const res = await api.updateProfile({ name, email });
            updateUser(res.user);
            show('Profile updated');
        } catch (err) {
            setProfileError((err as Error).message);
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePassword = async (e: FormEvent) => {
        e.preventDefault();
        setPwError('');
        if (newPassword.length < 8) {
            setPwError('New password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwError('New passwords do not match');
            return;
        }
        setPwLoading(true);
        try {
            const res = await api.changePassword({ currentPassword, newPassword });
            show(res.message);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPwError((err as Error).message);
        } finally {
            setPwLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Avatar name={user?.name || ''} className="h-14 w-14 text-lg" />
                <div>
                    <h1 className="text-xl font-bold text-ink-900 dark:text-ink-50">{user?.name}</h1>
                    <p className="text-sm text-ink-500 dark:text-ink-400">{user?.email}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-5 dark:border-ink-700 dark:bg-ink-800">
                <h2 className="mb-4 text-lg font-bold text-ink-900 dark:text-ink-50">Profile</h2>
                <form onSubmit={handleProfile} className="space-y-4">
                    {profileError && (
                        <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            {profileError}
                        </div>
                    )}
                    <div>
                        <label className="label">Name</label>
                        <input
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            required
                        />
                    </div>
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
                    <button type="submit" className="btn-primary" disabled={profileLoading}>
                        {profileLoading ? 'Saving…' : 'Save changes'}
                    </button>
                </form>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-5 dark:border-ink-700 dark:bg-ink-800">
                <h2 className="mb-4 text-lg font-bold text-ink-900 dark:text-ink-50">Change password</h2>
                <form onSubmit={handlePassword} className="space-y-4">
                    {pwError && (
                        <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            {pwError}
                        </div>
                    )}
                    <div>
                        <label className="label">Current password</label>
                        <PasswordInput
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            placeholder="Enter current password"
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    <div>
                        <label className="label">New password</label>
                        <PasswordInput
                            value={newPassword}
                            onChange={setNewPassword}
                            placeholder="At least 8 characters"
                            minLength={8}
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <div>
                        <label className="label">Confirm new password</label>
                        <PasswordInput
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            placeholder="Re-enter new password"
                            minLength={8}
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={pwLoading}>
                        {pwLoading ? 'Updating…' : 'Update password'}
                    </button>
                </form>
            </div>
        </div>
    );
}