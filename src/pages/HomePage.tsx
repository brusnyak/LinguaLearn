import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useProgress } from '../hooks/useProgress';
import { db } from '../services/db';
import StreakCounter from '../components/StreakCounter';
import CalendarView from '../components/CalendarView';
import CalendarModal from '../components/CalendarModal';
import WordOfTheDay from '../components/WordOfTheDay';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { progress, markActivity } = useProgress();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [masteredToday, setMasteredToday] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(20);

    useEffect(() => {
        markActivity();
        loadDailyProgress();
    }, [markActivity]);

    const loadDailyProgress = async () => {
        const settings = await db.getSettings();
        if (settings?.dailyGoal) {
            setDailyGoal(settings.dailyGoal);
        }

        // Get mastered words from today
        const words = await db.getWords();
        const today = new Date().toISOString().split('T')[0];
        const masteredTodayCount = words.filter(w => {
            if (!w.isMastered) return false;
            const wordDate = new Date(w.lastReviewed).toISOString().split('T')[0];
            return wordDate === today;
        }).length;
        setMasteredToday(masteredTodayCount);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Welcome & Streak */}
                <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
                                <p className="opacity-90">Ready to learn some new words today?</p>
                            </div>
                            <StreakCounter streak={progress.currentStreak} />
                        </div>
                        <div className="mt-4">
                            <Link to="/games" className="bg-white text-[var(--color-primary)] px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-gray-50 transition-colors inline-block">
                                Start Review
                            </Link>
                        </div>
                    </div>
                    {/* Decorative background pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
                </div>

                {/* Word of the Day */}
                <WordOfTheDay />
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
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            </Link>

            <div>
                <h3 className="text-lg font-bold mb-3">Daily Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                        onClick={() => navigate('/mastered')}
                        className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)] cursor-pointer hover:shadow-md hover:border-[var(--color-primary)] transition-all"
                    >
                        <div className="flex justify-between mb-2">
                            <span className="text-[var(--color-text-muted)] font-medium">Mastered Today</span>
                            <span className="font-bold text-[var(--color-primary)]">{masteredToday}/{dailyGoal}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div
                                className="bg-[var(--color-primary)] h-2.5 rounded-full transition-all"
                                style={{ width: `${Math.min((masteredToday / dailyGoal) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-2">Tap to view mastered words</p>
                    </div>
                    <div onClick={() => setIsCalendarOpen(true)} className="cursor-pointer">
                        <CalendarView history={progress.studyHistory} />
                    </div>
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
