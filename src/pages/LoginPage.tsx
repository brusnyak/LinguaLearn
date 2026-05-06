import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, getAllUsers, loginWithGoogle } from '../services/auth';
import { isSupabaseConfigured } from '../services/supabase';
import { LogIn, UserPlus } from 'lucide-react';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [existingUsers, setExistingUsers] = useState<string[]>([]);
    const [isCloudEnabled, setIsCloudEnabled] = useState(false);

    useEffect(() => {
        loadExistingUsers();
        // Remember last username
        const lastUsername = localStorage.getItem('lastUsername');
        if (lastUsername) {
            setUsername(lastUsername);
        }
        // Check if Supabase is configured
        setIsCloudEnabled(isSupabaseConfigured());
    }, []);

    const loadExistingUsers = async () => {
        try {
            const users = await getAllUsers();
            setExistingUsers(users.map(u => u.username));
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password) {
            setError('Please enter username and password');
            return;
        }

        setLoading(true);

        try {
            const user = await loginUser(username, password);

            if (user) {
                // Remember username
                localStorage.setItem('lastUsername', username);
                // Navigate to home
                window.location.href = '/';
            } else {
                setError('Invalid username or password');
            }
        } catch (err) {
            setError('Login failed. Please try again.');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google login failed');
            setLoading(false);
        }
    };

    const handleCreateAccount = () => {
        navigate('/onboarding');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] p-4">
            <div className="max-w-md w-full bg-[var(--color-bg-card)] rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent mb-2">
                        LinguaLearn
                    </h1>
                    <p className="text-[var(--color-text-muted)]">Welcome back! Sign in to continue learning.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {/* Username or Email */}
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-[var(--color-text)] mb-2">
                            Username or Email
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                            placeholder="Enter username or email"
                            autoComplete="username"
                            disabled={loading}
                        />
                        {existingUsers.length > 0 && (
                            <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                                Local users: {existingUsers.join(', ')}
                            </div>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text)] mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                            placeholder="Enter password"
                            autoComplete="current-password"
                            disabled={loading}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <LogIn size={20} />
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {/* Google Login Button */}
                {isCloudEnabled && (
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full mt-4 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 shadow-sm"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        Sign in with Google
                    </button>
                )}

                {/* Divider */}
                <div className="relative flex items-center mt-6 mb-4">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                </div>

                {/* Create Account Button */}
                <button
                    type="button"
                    onClick={handleCreateAccount}
                    className="w-full px-6 py-3 border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg font-bold hover:bg-[var(--color-primary)] hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                    <UserPlus size={20} />
                    Create New Account
                </button>

                {isCloudEnabled && (
                    <p className="text-center text-xs text-[var(--color-text-muted)] mt-4">
                        ✓ Supabase cloud sync active
                    </p>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
