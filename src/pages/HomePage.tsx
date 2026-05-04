import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Book, Target, TrendingUp, Calendar, Download } from 'lucide-react';
import { useProgress } from '../hooks/useProgress';
import { db } from '../services/db';
import { isSupabaseConfigured } from '../services/supabase';
import StreakCounter from '../components/StreakCounter';
import CalendarView from '../components/CalendarView';
import CalendarModal from '../components/CalendarModal';
import WordOfTheDay from '../components/WordOfTheDay';
import { useToast } from '../context/ToastContext';

const HomePage: React.FC = () => {
    const { progress, markActivity } = useProgress();
    const { showToast } = useToast();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [masteredToday, setMasteredToday] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(20);
    const [totalWords, setTotalWords] = useState(0);
    const [masteredWords, setMasteredWords] = useState(0);
    const [weeklyData, setWeeklyData] = useState<number[]>([]);
    const [syncing, setSyncing] = useState(false);
    const supabaseReady = isSupabaseConfigured();

    useEffect(() => {
        markActivity();
        loadDashboardData();
    }, [markActivity]);

    const loadDashboardData = async () => {
        try {
            const settings = await db.getSettings();
            if (settings?.dailyGoal) {
                setDailyGoal(settings.dailyGoal);
            }

            const words = await db.getWords();
            setTotalWords(words.length);
            setMasteredWords(words.filter(w => w.isMastered).length);

            // Get mastered words from today
            const today = new Date().toISOString().split('T')[0];
            const masteredTodayCount = words.filter(w => {
                if (!w.isMastered) return false;
                const wordDate = new Date(w.lastReviewed).toISOString().split('T')[0];
                return wordDate === today;
            }).length;
            setMasteredToday(masteredTodayCount);

            // Calculate weekly progress (last 7 days)
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });

            const weeklyProgress = last7Days.map(date => {
                return words.filter(w => {
                    if (!w.isMastered) return false;
                    const wordDate = new Date(w.lastReviewed).toISOString().split('T')[0];
                    return wordDate === date;
                }).length;
            });
            setWeeklyData(weeklyProgress);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    };

    const xpProgress = progress.xp ? Math.min(progress.xp % 100, 100) : 0;

    const handleSyncFromCloud = async () => {
        if (!supabaseReady) return;
        setSyncing(true);
        try {
            await db.syncFromSupabase();
            showToast('Data synced from cloud! Reloading...', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            showToast('Sync failed. Check Supabase config.', 'error');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="space-y-6 pb-20 pt-6">
            {/* Welcome Banner with Streak */}
            <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
                            <p className="opacity-90">Ready to learn some new words today?</p>
                        </div>
                        <StreakCounter streak={progress.currentStreak} />
                    </div>

                    {/* XP Bar */}
                    <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-yellow-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${xpProgress}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-xs opacity-80">
                        <span>Level {progress.level || 1}</span>
                        <span>{progress.xp || 0} XP</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link to="/games" className="bg-white text-[var(--color-primary)] px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-gray-50 transition-colors inline-block">
                            Start Review
                        </Link>
                        <Link to="/statistics" className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-bold hover:bg-white/30 transition-colors inline-block flex items-center gap-2">
                            <TrendingUp size={18} /> Stats
                        </Link>
                        {supabaseReady && (
                            <button
                                onClick={handleSyncFromCloud}
                                disabled={syncing}
                                className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-bold hover:bg-white/30 transition-colors inline-block flex items-center gap-2 disabled:opacity-50"
                            >
                                <Download size={18} /> {syncing ? 'Syncing...' : 'Sync from Cloud'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Word of the Day */}
                <WordOfTheDay />

                {/* Daily Goal Card */}
                <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="text-[var(--color-primary)]" size={24} />
                        <h3 className="text-lg font-bold">Daily Goal</h3>
                    </div>
                    <div className="text-center mb-4">
                        <div className="text-4xl font-bold text-[var(--color-primary)]">{masteredToday}/{dailyGoal}</div>
                        <p className="text-sm text-[var(--color-text-muted)] mt-1">words mastered today</p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] h-3 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((masteredToday / dailyGoal) * 100, 100)}%` }}
                        ></div>
                    </div>
                    {masteredToday >= dailyGoal && (
                        <div className="mt-3 text-center text-green-600 dark:text-green-400 font-bold text-sm">
                            🎉 Daily goal completed!
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)] text-center">
                    <div className="text-2xl font-bold text-[var(--color-primary)]">{totalWords}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">Total Words</div>
                </div>
                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)] text-center">
                    <div className="text-2xl font-bold text-green-600">{masteredWords}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">Mastered</div>
                </div>
                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)] text-center">
                    <div className="text-2xl font-bold text-orange-600">{progress.currentStreak || 0}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">Day Streak</div>
                </div>
                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)] text-center">
                    <div className="text-2xl font-bold text-purple-600">{progress.xp || 0}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">Total XP</div>
                </div>
            </div>

            {/* Content Suggestions Card */}
            <Link
                to="/content"
                className="block bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
            >
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <Sparkles size={28} className="group-hover:rotate-12 transition-transform" />
                        <h3 className="text-xl font-bold">Content Suggestions</h3>
                    </div>
                    <p className="opacity-90 mb-4">Watch movies & shows in your target language to improve listening skills</p>
                    <span className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg font-bold hover:bg-white/30 transition-colors">
                        Explore Content →
                    </span>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            </Link>

            {/* AI Reading Practice */}
            <Link
                to="/reading"
                className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-4 relative overflow-hidden"
            >
                <div className="p-3 bg-white/20 rounded-lg">
                    <Book size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-1">AI Reading Practice</h3>
                    <p className="text-sm opacity-90">Interactive stories with AI</p>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            </Link>

            {/* Weekly Progress Chart */}
            <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Calendar size={20} /> Weekly Progress
                    </h3>
                </div>
                <div className="flex items-end justify-between h-32 gap-2">
                    {weeklyData.map((count, index) => {
                        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                        const maxHeight = 100;
                        const height = count > 0 ? Math.max((count / Math.max(...weeklyData, 1)) * maxHeight, 8) : 4;
                        return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-[var(--color-primary)]/80 rounded-t-lg transition-all duration-300"
                                    style={{ height: `${height}px` }}
                                ></div>
                                <span className="text-xs text-[var(--color-text-muted)]">{days[index]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Study History Calendar */}
            <div>
                <h3 className="text-lg font-bold mb-3">Study History</h3>
                <div onClick={() => setIsCalendarOpen(true)} className="cursor-pointer">
                    <CalendarView history={progress.studyHistory} />
                </div>
            </div>

            <CalendarModal
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                history={progress.studyHistory}
                currentStreak={progress.currentStreak}
            />
        </div>
    );
};

export default HomePage;
