import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import type { UserProgress } from '../types';

const DEFAULT_PROGRESS: UserProgress = {
    currentStreak: 0,
    lastStudyDate: '',
    studyHistory: [],
    xp: 0,
    level: 1,
    completedDungeonLevels: [],
};

export const useProgress = () => {
    const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
    const [loading, setLoading] = useState(true);

    const loadProgress = useCallback(async () => {
        try {
            const progressData = await db.getProgress();
            if (progressData) {
                setProgress(progressData);
            }
        } catch (error) {
            console.error('Failed to load progress:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProgress();
    }, [loadProgress]);

    const markActivity = useCallback(async () => {
        const today = new Date().toISOString().split('T')[0];
        const currentProgress = await db.getProgress() || DEFAULT_PROGRESS;
        const lastDate = currentProgress.lastStudyDate;

        // If already studied today, do nothing
        if (lastDate === today) {
            return;
        }

        let newStreak = currentProgress.currentStreak;

        if (lastDate) {
            const last = new Date(lastDate);
            const now = new Date(today);
            const diffTime = Math.abs(now.getTime() - last.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Consecutive day
                newStreak += 1;
            } else if (diffDays > 1) {
                // Broken streak
                newStreak = 1;
            }
        } else {
            // First day
            newStreak = 1;
        }

        const newProgress: UserProgress = {
            ...currentProgress,
            currentStreak: newStreak,
            lastStudyDate: today,
            studyHistory: [...currentProgress.studyHistory, today],
            xp: currentProgress.xp || 0,
            level: currentProgress.level || 1,
            completedDungeonLevels: currentProgress.completedDungeonLevels || [],
        };

        await db.saveProgress(newProgress);
        setProgress(newProgress);
    }, []);

    return { progress, loading, markActivity };
};
