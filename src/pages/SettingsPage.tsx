import React, { useEffect, useState } from 'react';
import { Trash2, Info, User, Save, Bell, LogOut, Download, Upload, Database, Chrome } from 'lucide-react';
import AppearanceSettings from '../components/AppearanceSettings';
import { db, initDB } from '../services/db';
import type { UserSettings } from '../types';
import { useToast } from '../context/ToastContext';
import { getCurrentUser, logoutUser, loginWithGoogle, isUsingSupabaseAuth } from '../services/auth';
import { isSupabaseConfigured } from '../services/supabase';

const SettingsPage: React.FC = () => {
    const { showToast } = useToast();
    const [currentUsername, setCurrentUsername] = useState('');
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [name, setName] = useState('');
    const [nativeLang, setNativeLang] = useState('');
    const [targetLang, setTargetLang] = useState('');
    const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [notificationTime, setNotificationTime] = useState('19:00');
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [autoReadFlashcards, setAutoReadFlashcards] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isUsingSupabase, setIsUsingSupabase] = useState(false);

    useEffect(() => {
        loadSettings();
        loadCurrentUser();
        checkSupabaseAuth();
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    const checkSupabaseAuth = async () => {
        const isAuth = await isUsingSupabaseAuth();
        setIsUsingSupabase(isAuth);
    };

    const loadCurrentUser = async () => {
        const user = await getCurrentUser();
        if (user) {
            setCurrentUsername(user.username);
        }
    };

    const loadSettings = async () => {
        const s = await db.getSettings();
        if (s) {
            setSettings(s);
            if (s.profile) {
                setName(s.profile.name);
                setNativeLang(s.profile.nativeLanguage);
                setTargetLang(s.profile.targetLanguage);
                setLevel(s.profile.level);
            }
            if (s.notificationsEnabled !== undefined) {
                setNotificationsEnabled(s.notificationsEnabled);
            }
            if (s.notificationTime) {
                setNotificationTime(s.notificationTime);
            }
            if (s.autoReadFlashcards !== undefined) {
                setAutoReadFlashcards(s.autoReadFlashcards);
            }
        }
    };

    const handleSaveProfile = async () => {
        if (!settings) return;
        const newSettings: UserSettings = {
            ...settings,
            profile: {
                name,
                nativeLanguage: nativeLang,
                targetLanguage: targetLang,
                level
            }
        };
        await db.saveSettings(newSettings);
        setSettings(newSettings);
        showToast('Profile updated!', 'success');
    };

    const handleRequestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            showToast('Notifications not supported', 'error');
            return;
        }

        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission === 'granted') {
            showToast('Notifications enabled!', 'success');
        } else {
            showToast('Notifications denied', 'error');
        }
    };

    const handleSaveNotifications = async () => {
        if (!settings) return;
        const newSettings: UserSettings = {
            ...settings,
            notificationsEnabled,
            notificationTime
        };
        await db.saveSettings(newSettings);
        setSettings(newSettings);
        showToast('Notification settings saved!', 'success');
    };

    const handleSaveGameSettings = async () => {
        if (!settings) return;
        const newSettings: UserSettings = {
            ...settings,
            autoReadFlashcards
        };
        await db.saveSettings(newSettings);
        setSettings(newSettings);
        showToast('Game settings saved!', 'success');
    };

    const handleExportData = async () => {
        setIsExporting(true);
        try {
            const backup = await db.backupData();
            const blob = new Blob([backup], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lingualearn-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Backup exported successfully!', 'success');
        } catch (error) {
            showToast('Failed to export data', 'error');
            console.error(error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            setIsImporting(true);
            try {
                const text = await file.text();
                await db.restoreData(text);
                showToast('Backup restored successfully! Reloading...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                showToast('Failed to import data. Check file format.', 'error');
                console.error(error);
            } finally {
                setIsImporting(false);
            }
        };
        input.click();
    };

    const handleSyncToSupabase = async () => {
        setIsSyncing(true);
        try {
            await db.syncToSupabase();
            showToast('Data synced to cloud! Your local data is now linked to your cloud account.', 'success');
            // Refresh auth status
            await checkSupabaseAuth();
        } catch (error: any) {
            showToast(error.message || 'Sync failed. Check Supabase config.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncFromSupabase = async () => {
        setIsSyncing(true);
        try {
            await db.syncFromSupabase();
            showToast('Data synced from cloud! Reloading...', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) {
            showToast(error.message || 'Sync failed. Check Supabase config.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleResetData = async () => {
        if (confirm("Are you sure? This will delete all your progress and words, and reset to the initial set.")) {
            try {
                const dbInstance = await initDB();
                const tx = dbInstance.transaction(['words', 'settings', 'progress'], 'readwrite');
                await tx.objectStore('words').clear();
                await tx.objectStore('settings').clear();
                await tx.objectStore('progress').clear();
                await tx.done;
                showToast('Data reset! Reloading...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                console.error("Reset failed", error);
                showToast('Reset failed', 'error');
            }
        }
    };

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            logoutUser();
            window.location.href = '/login';
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (error: any) {
            showToast(error.message || 'Google login failed', 'error');
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <h1 className="text-3xl font-bold">Settings</h1>

            {/* Account Section */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <User size={24} /> Account
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                            Username
                        </label>
                        <div className="text-lg font-medium">{currentUsername || 'Not logged in'}</div>
                    </div>

            {isSupabaseConfigured() && !isUsingSupabase && (
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full md:w-auto px-6 py-3 bg-white text-gray-900 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Chrome size={20} />
                            Login with Google
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        className="w-full md:w-auto px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </div>

            {/* Profile Settings */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[var(--color-primary)]">
                    <User />
                    <h3 className="text-lg font-bold">Profile</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--color-text-muted)]">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 rounded-lg bg-[var(--color-bg)] border-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--color-text-muted)]">Level</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value as any)}
                            className="w-full p-3 rounded-lg bg-[var(--color-bg)] border-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--color-text-muted)]">Native Language</label>
                        <select
                            value={nativeLang}
                            onChange={(e) => setNativeLang(e.target.value)}
                            className="w-full p-3 rounded-lg bg-[var(--color-bg)] border-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                            <option value="Ukrainian">Ukrainian</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                            <option value="German">German</option>
                            <option value="English">English</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--color-text-muted)]">Target Language</label>
                        <select
                            value={targetLang}
                            onChange={(e) => setTargetLang(e.target.value)}
                            className="w-full p-3 rounded-lg bg-[var(--color-bg)] border-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
                    onClick={handleSaveProfile}
                    className="w-full md:w-auto px-6 py-2 rounded-lg bg-[var(--color-primary)] text-white font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                    <Save size={18} /> Save Profile
                </button>
            </div>

            {/* Notification Settings */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[var(--color-primary)]">
                    <Bell />
                    <h3 className="text-lg font-bold">Daily Reminders</h3>
                </div>

                {notificationPermission === 'default' && (
                    <button
                        onClick={handleRequestNotificationPermission}
                        className="w-full p-3 rounded-lg bg-purple-100 text-[var(--color-primary)] hover:bg-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 transition-colors font-bold"
                    >
                        Enable Notifications
                    </button>
                )}

                {notificationPermission === 'denied' && (
                    <div className="p-3 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm">
                        Notifications are blocked. Please enable them in your browser settings.
                    </div>
                )}

                {notificationPermission === 'granted' && (
                    <>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Enable daily reminders</label>
                            <button
                                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationsEnabled
                                    ? 'bg-[var(--color-primary)]'
                                    : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {notificationsEnabled && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--color-text-muted)]">Reminder Time</label>
                                <input
                                    type="time"
                                    value={notificationTime}
                                    onChange={(e) => setNotificationTime(e.target.value)}
                                    className="w-full p-3 rounded-lg bg-[var(--color-bg)] border-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleSaveNotifications}
                            className="w-full md:w-auto px-6 py-2 rounded-lg bg-[var(--color-primary)] text-white font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-primary-dark)] transition-colors"
                        >
                            <Save size={18} /> Save Notifications
                        </button>
                    </>
                )}
            </div>

            {/* Game Settings */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[var(--color-primary)]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-bold">Game Settings</h3>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-sm font-medium">Auto-read flashcards</label>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">Automatically speak words when cards appear</p>
                    </div>
                    <button
                        onClick={() => setAutoReadFlashcards(!autoReadFlashcards)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            autoReadFlashcards
                                ? 'bg-[var(--color-primary)]'
                                : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                autoReadFlashcards ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>

                <button
                    onClick={handleSaveGameSettings}
                    className="w-full md:w-auto px-6 py-2 rounded-lg bg-[var(--color-primary)] text-white font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                    <Save size={18} /> Save Game Settings
                </button>
            </div>

            <AppearanceSettings />

            {/* Cloud Sync Section */}
            {isSupabaseConfigured() && (
                <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-[var(--color-primary)]">
                        <Database size={24} />
                        <h3 className="text-lg font-bold">Cloud Sync</h3>
                    </div>

                    {isUsingSupabase ? (
                        <>
                            <p className="text-sm text-green-600 dark:text-green-400">
                                ✓ Connected to cloud
                            </p>
                            <p className="text-sm text-[var(--color-text-muted)]">
                                Sync your data across devices. Your local data will be linked to your cloud account.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleSyncToSupabase}
                                    disabled={isSyncing}
                                    className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[var(--color-primary-dark)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Upload size={18} /> {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
                                </button>
                                <button
                                    onClick={handleSyncFromSupabase}
                                    disabled={isSyncing}
                                    className="flex-1 px-6 py-3 bg-[var(--color-bg)] text-[var(--color-text)] border-2 border-[var(--color-primary)] rounded-lg font-bold hover:bg-[var(--color-primary)] hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Download size={18} /> {isSyncing ? 'Syncing...' : 'Sync from Cloud'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-[var(--color-text-muted)]">
                                Login with Google to enable cloud sync across devices.
                            </p>
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full md:w-auto px-6 py-3 bg-white text-gray-900 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Chrome size={20} />
                                Login with Google
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Backup & Restore */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[var(--color-primary)]">
                    <Download size={24} />
                    <h3 className="text-lg font-bold">Backup & Restore</h3>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                    Export your data as a JSON file or restore from a previous backup.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleExportData}
                        disabled={isExporting}
                        className="flex-1 px-6 py-3 bg-[var(--color-bg)] text-[var(--color-text)] border-2 border-[var(--color-primary)] rounded-lg font-bold hover:bg-[var(--color-primary)] hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Download size={18} /> {isExporting ? 'Exporting...' : 'Export Backup'}
                    </button>
                    <button
                        onClick={handleImportData}
                        disabled={isImporting}
                        className="flex-1 px-6 py-3 bg-[var(--color-bg)] text-[var(--color-text)] border-2 border-[var(--color-secondary)] rounded-lg font-bold hover:bg-[var(--color-secondary)] hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Upload size={18} /> {isImporting ? 'Importing...' : 'Import Backup'}
                    </button>
                </div>
            </div>

            {/* About Section */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[var(--color-primary)]">
                    <Info />
                    <h3 className="text-lg font-bold">About LinguaLearn</h3>
                </div>
                <p className="text-[var(--color-text-muted)]">
                    LinguaLearn is an offline-first Progressive Web App (PWA) designed to help you master new languages through gamification.
                </p>
                <div className="space-y-2">
                    <h4 className="font-bold">Features:</h4>
                    <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1">
                        <li>Dictionary with Magic Translate</li>
                        <li>Vocab Dungeon RPG Game</li>
                        <li>Spaced Repetition Flashcards</li>
                        <li>Offline Support</li>
                        <li>Dark/Light Theme (Purple & Orange)</li>
                        {isSupabaseConfigured() && <li>Cloud Sync with Supabase</li>}
                    </ul>
                </div>
            </div>

            {/* Data Management */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold">Data Management</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                    Permanently delete all your local data and reset the app.
                </p>
                <button
                    onClick={handleResetData}
                    className="w-full p-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                >
                    <Trash2 size={18} /> Reset All Data
                </button>
            </div>

            {/* Branding Footer */}
            <div className="text-center text-[var(--color-text-muted)] text-sm space-y-1 pb-4">
                <p className="font-bold">LinguaLearn v2.0</p>
                <p>Made with ❤️ for language learners</p>
            </div>
        </div>
    );
};

export default SettingsPage;
