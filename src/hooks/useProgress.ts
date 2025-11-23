import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import type { UserSettings, UserProgress } from '../types';

const DEFAULT_PROGRESS: UserProgress = {
    currentStreak: 0,
    lastStudyDate: '',
    studyHistory: []
};

export const useProgress = () => {
    const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
    const [loading, setLoading] = useState(true);

    const loadProgress = useCallback(async () => {
        try {
            const settings = await db.getSettings();
            if (settings?.progress) {
                setProgress(settings.progress);
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
        const settings = await db.getSettings();

        let currentProgress = settings?.progress || DEFAULT_PROGRESS;
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
            currentStreak: newStreak,
            lastStudyDate: today,
            studyHistory: [...currentProgress.studyHistory, today]
        };

        const newSettings: UserSettings = {
            ...(settings || { theme: 'light', dailyGoal: 5 }), // Defaults if missing
            progress: newProgress
        } as UserSettings;

        await db.saveSettings(newSettings);
        setProgress(newProgress);
    }, []);

    return { progress, loading, markActivity };
};
