import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import StreakCounter from '../components/StreakCounter';
import CalendarView from '../components/CalendarView';
import CalendarModal from '../components/CalendarModal';
import WordOfTheDay from '../components/WordOfTheDay';

const HomePage: React.FC = () => {
    const { progress, markActivity } = useProgress();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    useEffect(() => {
        markActivity();
    }, [markActivity]);

    return (
        <div className="space-y-6">
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
                        <div className="mt-4 flex gap-3">
                            <Link to="/games" className="bg-white text-[var(--color-primary)] px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-50 transition-colors inline-block">
                                Start Review
                            </Link>
                            <Link to="/content" className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-bold hover:bg-white/30 transition-colors inline-block">
                                🎬 Watch & Learn
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

            <div>
                <h3 className="text-lg font-bold mb-3">Daily Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)]">
                        <div className="flex justify-between mb-2">
                            <span className="text-[var(--color-text-muted)] font-medium">Goal: 20 words</span>
                            <span className="font-bold text-[var(--color-primary)]">5/20</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div className="bg-[var(--color-primary)] h-2.5 rounded-full" style={{ width: '25%' }}></div>
                        </div>
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
