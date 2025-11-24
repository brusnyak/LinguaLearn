import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Star, Calendar } from 'lucide-react';
import { db } from '../services/db';
import type { Word } from '../types';

type FilterType = 'today' | 'week' | 'all';

const MasteredWordsPage: React.FC = () => {
    const navigate = useNavigate();
    const [words, setWords] = useState<Word[]>([]);
    const [filter, setFilter] = useState<FilterType>('today');
    const [dailyGoal, setDailyGoal] = useState(20);

    useEffect(() => {
        loadWords();
        loadSettings();
    }, [filter]);

    const loadSettings = async () => {
        const settings = await db.getSettings();
        if (settings?.dailyGoal) {
            setDailyGoal(settings.dailyGoal);
        }
    };

    const loadWords = async () => {
        const allWords = await db.getWords();
        const mastered = allWords.filter(w => w.isMastered);

        const now = new Date();
        const filtered = mastered.filter(w => {
            const wordDate = new Date(w.lastReviewed);

            if (filter === 'today') {
                return wordDate.toISOString().split('T')[0] === now.toISOString().split('T')[0];
            } else if (filter === 'week') {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return wordDate >= weekAgo;
            }
            return true; // 'all'
        });

        setWords(filtered.sort((a, b) => b.lastReviewed - a.lastReviewed));
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const todayCount = words.filter(w => {
        const wordDate = new Date(w.lastReviewed);
        const today = new Date();
        return wordDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];
    }).length;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-[var(--color-bg-card)] rounded-lg transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Mastered Words</h1>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            {todayCount}/{dailyGoal} mastered today
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/settings')}
                    className="p-2 hover:bg-[var(--color-bg-card)] rounded-lg transition-colors"
                    aria-label="Settings"
                >
                    <Settings size={24} />
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-[var(--color-bg-card)] p-1 rounded-lg shadow-sm w-full">
                <button
                    onClick={() => setFilter('today')}
                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${filter === 'today'
                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                >
                    Today
                </button>
                <button
                    onClick={() => setFilter('week')}
                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${filter === 'week'
                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                >
                    This Week
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${filter === 'all'
                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                >
                    All Time
                </button>
            </div>

            {/* Word List */}
            {words.length === 0 ? (
                <div className="text-center py-20 text-[var(--color-text-muted)]">
                    <Star size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-bold mb-2">No mastered words yet</p>
                    <p className="text-sm">
                        {filter === 'today'
                            ? 'Master some words today to see them here!'
                            : 'Start reviewing to master more words'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {words.map(word => (
                        <div
                            key={word.id}
                            className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Star size={16} className="fill-yellow-400 text-yellow-400" />
                                        <h3 className="font-bold text-lg">{word.term}</h3>
                                    </div>
                                    <p className="text-[var(--color-text-muted)] mb-2">{word.translation}</p>
                                    {word.phonetic && (
                                        <p className="text-sm text-[var(--color-text-muted)] italic">
                                            {word.phonetic}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="inline-block text-xs px-2 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium mb-1">
                                        {word.category}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] justify-end">
                                        <Calendar size={12} />
                                        {formatDate(word.lastReviewed)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MasteredWordsPage;
