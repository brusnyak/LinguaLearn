import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import type { Word, UserProgress } from '../types';
import { ArrowLeft, TrendingUp, BookOpen, Target, Calendar, Award, BarChart3 } from 'lucide-react';

const StatisticsPage: React.FC = () => {
    const navigate = useNavigate();
    const [words, setWords] = useState<Word[]>([]);
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [allWords, userProgress] = await Promise.all([
                db.getWords(),
                db.getProgress()
            ]);
            setWords(allWords);
            setProgress(userProgress || null);
        } catch (error) {
            console.error('Failed to load statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 pb-20 pt-6">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold">Statistics</h1>
                </div>
                <div className="text-center py-10 text-[var(--color-text-muted)]">Loading statistics...</div>
            </div>
        );
    }

    const masteredWords = words.filter(w => w.isMastered);
    const inProgressWords = words.filter(w => !w.isMastered && w.masteryLevel > 0);

    // Category breakdown
    const categoryCount = words.reduce((acc, word) => {
        acc[word.category] = (acc[word.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Mastery level distribution
    const masteryDist = [0, 0, 0, 0, 0, 0];
    words.forEach(w => {
        const level = Math.min(w.masteryLevel || 0, 5);
        masteryDist[level]++;
    });

    // Words added over time (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
    });

    const wordsPerDay = last30Days.map(date => {
        return words.filter(w => {
            const wordDate = new Date(w.createdAt).toISOString().split('T')[0];
            return wordDate === date;
        }).length;
    });

    const maxWordsPerDay = Math.max(...wordsPerDay, 1);

    return (
        <div className="space-y-6 pb-20 pt-6">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 size={24} /> Statistics
                </h1>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen size={18} className="text-[var(--color-primary)]" />
                        <span className="text-xs text-[var(--color-text-muted)]">Total Words</span>
                    </div>
                    <div className="text-2xl font-bold">{words.length}</div>
                </div>

                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Award size={18} className="text-green-600" />
                        <span className="text-xs text-[var(--color-text-muted)]">Mastered</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{masteredWords.length}</div>
                </div>

                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-orange-600" />
                        <span className="text-xs text-[var(--color-text-muted)]">In Progress</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{inProgressWords.length}</div>
                </div>

                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Target size={18} className="text-blue-600" />
                        <span className="text-xs text-[var(--color-text-muted)]">XP</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{progress?.xp || 0}</div>
                </div>
            </div>

            {/* Streak Info */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Calendar size={20} /> Study Streak
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-3xl font-bold text-[var(--color-primary)]">{progress?.currentStreak || 0}</div>
                        <div className="text-sm text-[var(--color-text-muted)]">Current Streak</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-purple-600">{progress?.level || 1}</div>
                        <div className="text-sm text-[var(--color-text-muted)]">Level</div>
                    </div>
                </div>
            </div>

            {/* Mastery Distribution */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
                <h3 className="text-lg font-bold mb-4">Mastery Level Distribution</h3>
                <div className="space-y-3">
                    {masteryDist.map((count, level) => (
                        <div key={level} className="flex items-center gap-3">
                            <span className="text-sm font-medium w-24">
                                {level === 0 ? 'New' : `Level ${level}`}
                            </span>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        level === 0 ? 'bg-gray-400' :
                                        level === 1 ? 'bg-red-400' :
                                        level === 2 ? 'bg-orange-400' :
                                        level === 3 ? 'bg-yellow-400' :
                                        level === 4 ? 'bg-blue-400' :
                                        'bg-green-500'
                                    }`}
                                    style={{ width: `${words.length > 0 ? (count / words.length) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <span className="text-sm text-[var(--color-text-muted)] w-10 text-right">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Words Added Over Time */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
                <h3 className="text-lg font-bold mb-4">Words Added (Last 30 Days)</h3>
                <div className="flex items-end gap-1 h-32">
                    {wordsPerDay.map((count, index) => (
                        <div
                            key={index}
                            className="flex-1 bg-[var(--color-primary)]/80 rounded-t transition-all hover:bg-[var(--color-primary)]"
                            style={{ height: `${(count / maxWordsPerDay) * 100}%` }}
                            title={`${last30Days[index]}: ${count} words`}
                        ></div>
                    ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-[var(--color-text-muted)]">
                    <span>{last30Days[0]}</span>
                    <span>{last30Days[last30Days.length - 1]}</span>
                </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
                <h3 className="text-lg font-bold mb-4">Categories</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(categoryCount)
                        .sort((a, b) => b[1] - a[1])
                        .map(([category, count]) => (
                            <div key={category} className="flex justify-between items-center p-3 bg-[var(--color-bg)] rounded-lg">
                                <span className="font-medium">{category}</span>
                                <span className="text-[var(--color-text-muted)]">{count} words</span>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

export default StatisticsPage;
