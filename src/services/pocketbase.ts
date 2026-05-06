// PocketBase sync service - Simple, self-hosted backend
import PocketBase from 'pocketbase';
import type { Word, UserSettings, UserProgress } from '../types';

const PB_URL = import.meta.env.VITE_PB_URL || 'http://localhost:8090';

let pb: PocketBase | null = null;

export function getPocketBase(): PocketBase {
    if (!pb) {
        pb = new PocketBase(PB_URL);
    }
    return pb;
}

export function isPBConfigured(): boolean {
    return !!(import.meta.env.VITE_PB_URL);
}

// Auth functions
export async function pbSignIn(email: string, password: string) {
    const client = getPocketBase();
    return await client.collection('users').authWithPassword(email, password);
}

export async function pbSignUp(email: string, password: string, name?: string) {
    const client = getPocketBase();
    return await client.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: name || email,
    });
}

export async function pbSignOut() {
    const client = getPocketBase();
    client.authStore.clear();
}

export async function pbGetCurrentUser() {
    const client = getPocketBase();
    return client.authStore.model;
}

export async function pbIsAuthenticated(): Promise<boolean> {
    const client = getPocketBase();
    return client.authStore.isValid;
}

// Helper to convert Word to PocketBase format
function wordToPB(word: Word, userId: string) {
    return {
        id: word.id,
        user_id: userId,
        term: word.term,
        translation: word.translation,
        phonetic: word.phonetic || '',
        category: word.category || 'Other',
        type: word.type || 'word',
        mastery_level: word.masteryLevel || 0,
        last_reviewed: word.lastReviewed || 0,
        times_correct: word.timesCorrect || 0,
        is_mastered: word.isMastered || false,
        association: word.association || '',
        created_at: word.createdAt || Date.now(),
    };
}

// Helper to convert PocketBase record to Word
function pbToWord(record: any): Word {
    return {
        id: record.id,
        userId: record.user_id,
        term: record.term,
        translation: record.translation,
        phonetic: record.phonetic || undefined,
        category: record.category || 'Other',
        type: record.type as 'word' | 'phrase' || 'word',
        masteryLevel: record.mastery_level || 0,
        lastReviewed: record.last_reviewed || 0,
        timesCorrect: record.times_correct || 0,
        isMastered: record.is_mastered || false,
        association: record.association || undefined,
        createdAt: record.created_at || record.created,
    };
}

// Sync words to PocketBase
export async function syncWordsToPB(words: Word[]): Promise<void> {
    const client = getPocketBase();
    if (!client.authStore.isValid) return;

    const userId = client.authStore.model?.id;
    if (!userId) return;

    for (const word of words) {
        try {
            const data = wordToPB(word, userId);
            // Try to get existing record first
            try {
                await client.collection('words').getOne(word.id);
                // Update if exists
                await client.collection('words').update(word.id, data);
            } catch (e) {
                // Create if not exists
                await client.collection('words').create(data);
            }
        } catch (error) {
            console.error('Failed to sync word:', error);
        }
    }
}

// Sync words from PocketBase
export async function syncWordsFromPB(): Promise<Word[]> {
    const client = getPocketBase();
    if (!client.authStore.isValid) return [];

    try {
        const userId = client.authStore.model?.id;
        const records = await client.collection('words').getFullList({
            filter: `user_id = "${userId}"`,
        });
        return records.map(pbToWord);
    } catch (error) {
        console.error('Failed to fetch words from PocketBase:', error);
        return [];
    }
}

// Helper to convert UserSettings to PocketBase format
function settingsToPB(settings: UserSettings, userId: string) {
    return {
        user_id: userId,
        profile: settings.profile || null,
        theme: settings.theme || 'system',
        notifications_enabled: settings.notificationsEnabled || false,
        notification_time: settings.notificationTime || '08:00',
        daily_goal: settings.dailyGoal || 5,
        auto_read_flashcards: settings.autoReadFlashcards || false,
    };
}

// Helper to convert PocketBase record to UserSettings
function pbToSettings(record: any): UserSettings {
    return {
        userId: record.user_id,
        profile: record.profile || undefined,
        theme: record.theme as 'light' | 'dark' | 'system' || 'system',
        notificationsEnabled: record.notifications_enabled || false,
        notificationTime: record.notification_time || '08:00',
        dailyGoal: record.daily_goal || 5,
        autoReadFlashcards: record.auto_read_flashcards || false,
    };
}

// Sync settings to PocketBase
export async function syncSettingsToPB(settings: UserSettings): Promise<void> {
    const client = getPocketBase();
    if (!client.authStore.isValid) return;

    const userId = client.authStore.model?.id;
    if (!userId) return;

    try {
        const data = settingsToPB(settings, userId);
        // Try to get existing record first
        try {
            await client.collection('user_settings').getFirstListItem(`user_id = "${userId}"`);
            // Update if exists - need to find the record ID first
            const records = await client.collection('user_settings').getFullList({
                filter: `user_id = "${userId}"`,
            });
            if (records.length > 0) {
                await client.collection('user_settings').update(records[0].id, data);
            }
        } catch (e) {
            // Create if not exists
            await client.collection('user_settings').create(data);
        }
    } catch (error) {
        console.error('Failed to sync settings:', error);
    }
}

// Sync settings from PocketBase
export async function syncSettingsFromPB(): Promise<UserSettings | null> {
    const client = getPocketBase();
    if (!client.authStore.isValid) return null;

    try {
        const userId = client.authStore.model?.id;
        const records = await client.collection('user_settings').getFullList({
            filter: `user_id = "${userId}"`,
        });
        return records.length > 0 ? pbToSettings(records[0]) : null;
    } catch (error) {
        console.error('Failed to fetch settings from PocketBase:', error);
        return null;
    }
}

// Helper to convert UserProgress to PocketBase format
function progressToPB(progress: UserProgress, userId: string) {
    return {
        user_id: userId,
        current_streak: progress.currentStreak || 0,
        last_study_date: progress.lastStudyDate || '',
        study_history: progress.studyHistory || [],
        xp: progress.xp || 0,
        level: progress.level || 1,
        completed_dungeon_levels: progress.completedDungeonLevels || [],
    };
}

// Helper to convert PocketBase record to UserProgress
function pbToProgress(record: any): UserProgress {
    return {
        userId: record.user_id,
        currentStreak: record.current_streak || 0,
        lastStudyDate: record.last_study_date || '',
        studyHistory: record.study_history || [],
        xp: record.xp || 0,
        level: record.level || 1,
        completedDungeonLevels: record.completed_dungeon_levels || [],
    };
}

// Sync progress to PocketBase
export async function syncProgressToPB(progress: UserProgress): Promise<void> {
    const client = getPocketBase();
    if (!client.authStore.isValid) return;

    const userId = client.authStore.model?.id;
    if (!userId) return;

    try {
        const data = progressToPB(progress, userId);
        // Try to get existing record first
        try {
            const records = await client.collection('user_progress').getFullList({
                filter: `user_id = "${userId}"`,
            });
            if (records.length > 0) {
                await client.collection('user_progress').update(records[0].id, data);
            } else {
                await client.collection('user_progress').create(data);
            }
        } catch (e) {
            // Create if not exists
            await client.collection('user_progress').create(data);
        }
    } catch (error) {
        console.error('Failed to sync progress:', error);
    }
}

// Sync progress from PocketBase
export async function syncProgressFromPB(): Promise<UserProgress | null> {
    const client = getPocketBase();
    if (!client.authStore.isValid) return null;

    try {
        const userId = client.authStore.model?.id;
        const records = await client.collection('user_progress').getFullList({
            filter: `user_id = "${userId}"`,
        });
        return records.length > 0 ? pbToProgress(records[0]) : null;
    } catch (error) {
        console.error('Failed to fetch progress from PocketBase:', error);
        return null;
    }
}

// Get current session (compatible with Supabase interface)
export async function getCurrentSession() {
    const client = getPocketBase();
    if (!client.authStore.isValid) return null;
    return { user: client.authStore.model };
}
