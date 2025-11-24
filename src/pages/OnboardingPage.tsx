import React, { useState } from 'react';
import { db } from '../services/db';
import { ArrowRight, Check, Lock, User } from 'lucide-react';
import type { UserSettings } from '../types';
import { createUser, getAllUsers } from '../services/auth';

const OnboardingPage: React.FC = () => {
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [nativeLang, setNativeLang] = useState('Ukrainian');
    const [targetLang, setTargetLang] = useState('English');
    const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

    const handleNextFromUsername = async () => {
        setError('');

        // Validate username
        if (!username.trim()) {
            setError('Username is required');
            return;
        }
        if (username.length > 50) {
            setError('Username must be 50 characters or less');
            return;
        }

        // Validate password
        if (!password || password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Check for duplicate username
        try {
            const existingUsers = await getAllUsers();
            const duplicate = existingUsers.find(
                u => u.username.toLowerCase() === username.trim().toLowerCase()
            );
            if (duplicate) {
                setError('Username already exists. Please choose another one.');
                return;
            }
            setStep(2);
        } catch (err) {
            setError('Failed to check username. Please try again.');
        }
    };

    const handleComplete = async () => {
        try {
            // Create user account
            await createUser(username, password, {
                name,
                nativeLanguage: nativeLang,
                targetLanguage: targetLang,
                level
            });

            // Save settings (optional, for backward compatibility)
            const currentSettings = await db.getSettings();
            const newSettings: UserSettings = {
                ...(currentSettings || { theme: 'dark', dailyGoal: 5, progress: { currentStreak: 0, lastStudyDate: '', studyHistory: [] } }),
                profile: {
                    name,
                    nativeLanguage: nativeLang,
                    targetLanguage: targetLang,
                    level
                }
            } as UserSettings;

            await db.saveSettings(newSettings);

            // Force a full reload to check auth status
            window.location.href = '/';
        } catch (error: any) {
            setError(error.message || 'Failed to create account');
            console.error('Failed to save profile:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[var(--color-bg-card)] rounded-2xl shadow-xl p-8 border border-[var(--color-border)]">
                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[var(--color-primary)]' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h1 className="text-3xl font-bold text-center">Create Your Account 🔐</h1>
                        <p className="text-center text-[var(--color-text-muted)]">Choose a username and password to get started</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                                    <User className="inline mr-1" size={16} /> Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Choose a username"
                                    className="w-full p-4 rounded-xl bg-[var(--color-bg)] border-2 border-transparent focus:border-[var(--color-primary)] outline-none text-lg"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                                    <Lock className="inline mr-1" size={16} /> Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    className="w-full p-4 rounded-xl bg-[var(--color-bg)] border-2 border-transparent focus:border-[var(--color-primary)] outline-none text-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                                    <Lock className="inline mr-1" size={16} /> Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    className="w-full p-4 rounded-xl bg-[var(--color-bg)] border-2 border-transparent focus:border-[var(--color-primary)] outline-none text-lg"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleNextFromUsername}
                            disabled={!username.trim() || !password || !confirmPassword}
                            className="w-full py-4 rounded-xl bg-[var(--color-primary)] text-white font-bold text-lg shadow-lg hover:bg-[var(--color-primary-dark)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Next <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h1 className="text-3xl font-bold text-center">Welcome to LinguaLearn! 👋</h1>
                        <p className="text-center text-[var(--color-text-muted)]">Let's get to know you. What should we call you?</p>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Name"
                            className="w-full p-4 rounded-xl bg-[var(--color-bg)] border-2 border-transparent focus:border-[var(--color-primary)] outline-none text-lg text-center"
                            autoFocus
                        />
                        <button
                            onClick={() => setStep(2)}
                            disabled={!name.trim()}
                            className="w-full py-4 rounded-xl bg-[var(--color-primary)] text-white font-bold text-lg shadow-lg hover:bg-[var(--color-primary-dark)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Next <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h1 className="text-2xl font-bold text-center">Language Goals 🎯</h1>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">I speak...</label>
                                <select
                                    value={nativeLang}
                                    onChange={(e) => setNativeLang(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-[var(--color-bg)] border-none outline-none"
                                >
                                    <option value="Ukrainian">Ukrainian</option>
                                    <option value="Spanish">Spanish</option>
                                    <option value="French">French</option>
                                    <option value="German">German</option>
                                    <option value="English">English</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">I want to learn...</label>
                                <select
                                    value={targetLang}
                                    onChange={(e) => setTargetLang(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-[var(--color-bg)] border-none outline-none"
                                >
                                    <option value="English">English</option>
                                    <option value="Spanish">Spanish</option>
                                    <option value="French">French</option>
                                    <option value="German">German</option>
                                    <option value="Ukrainian">Ukrainian</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(4)}
                            className="w-full py-4 rounded-xl bg-[var(--color-primary)] text-white font-bold text-lg shadow-lg hover:bg-[var(--color-primary-dark)] transition-all flex items-center justify-center gap-2"
                        >
                            Next <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h1 className="text-2xl font-bold text-center">Current Level 📊</h1>
                        <p className="text-center text-[var(--color-text-muted)]">How would you describe your current skill?</p>

                        <div className="space-y-3">
                            {(['beginner', 'intermediate', 'advanced'] as const).map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setLevel(l)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${level === l
                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                        : 'border-transparent bg-[var(--color-bg)] hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <span className="capitalize font-bold">{l}</span>
                                    {level === l && <Check size={20} />}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleComplete}
                            className="w-full py-4 rounded-xl bg-[var(--color-primary)] text-white font-bold text-lg shadow-lg hover:bg-[var(--color-primary-dark)] transition-all flex items-center justify-center gap-2"
                        >
                            Get Started! <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnboardingPage;
