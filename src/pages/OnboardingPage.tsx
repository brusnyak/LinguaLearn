import React, { useState } from 'react';
import { db } from '../services/db';
import { ArrowRight, Check } from 'lucide-react';
import type { UserSettings } from '../types';

const OnboardingPage: React.FC = () => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [nativeLang, setNativeLang] = useState('Ukrainian');
    const [targetLang, setTargetLang] = useState('English');
    const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

    const handleComplete = async () => {
        try {
            const currentSettings = await db.getSettings();
            const newSettings: UserSettings = {
                ...(currentSettings || { theme: 'light', dailyGoal: 5, progress: { currentStreak: 0, lastStudyDate: '', studyHistory: [] } }),
                profile: {
                    name,
                    nativeLanguage: nativeLang,
                    targetLanguage: targetLang,
                    level
                }
            } as UserSettings;

            await db.saveSettings(newSettings);
            // Force a full reload to re-check onboarding status in App.tsx
            window.location.href = '/';
        } catch (error) {
            console.error('Failed to save profile:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[var(--color-bg-card)] rounded-2xl shadow-xl p-8 border border-[var(--color-border)]">
                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[var(--color-primary)]' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                </div>

                {step === 1 && (
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
                            onClick={() => setStep(3)}
                            className="w-full py-4 rounded-xl bg-[var(--color-primary)] text-white font-bold text-lg shadow-lg hover:bg-[var(--color-primary-dark)] transition-all flex items-center justify-center gap-2"
                        >
                            Next <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 3 && (
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
