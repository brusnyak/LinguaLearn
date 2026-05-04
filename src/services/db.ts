import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Word, UserSettings, UserProgress } from '../types';
import { getCurrentUserId } from './auth';
import { isSupabaseConfigured, syncWordsToSupabase, syncWordsFromSupabase, syncSettingsToSupabase, syncSettingsFromSupabase, syncProgressToSupabase, syncProgressFromSupabase } from './supabase';

interface LinguaDB extends DBSchema {
    words: {
        key: string;
        value: Word;
        indexes: { 'by-term': string; 'by-category': string; 'by-userId': string };
    };
    settings: {
        key: string;
        value: UserSettings;
    };
    users: {
        key: string;
        value: any;
    };
    progress: {
        key: string;
        value: UserProgress;
    };
    translations: {
        key: string;
        value: {
            text: string;
            from: string;
            to: string;
            translation: string;
            timestamp: number;
        };
    };
}

const DB_NAME = 'lingua-learn-db';
const DB_VERSION = 5;

let dbPromise: Promise<IDBPDatabase<LinguaDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<LinguaDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('words')) {
                    const wordStore = db.createObjectStore('words', { keyPath: 'id' });
                    wordStore.createIndex('by-term', 'term');
                    wordStore.createIndex('by-category', 'category');
                    wordStore.createIndex('by-userId', 'userId');
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }

                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('progress')) {
                    db.createObjectStore('progress');
                }

                if (!db.objectStoreNames.contains('translations')) {
                    db.createObjectStore('translations');
                }
            },
        });
    }
    return dbPromise;
};

export const db = {
    async getWords(): Promise<Word[]> {
        try {
            const db = await initDB();
            const userId = getCurrentUserId();
            const allWords = await db.getAll('words');

            const filteredWords = userId
                ? allWords.filter(w => w.userId === userId)
                : allWords;

            return filteredWords.filter(word =>
                word &&
                typeof word.id === 'string' &&
                typeof word.term === 'string' &&
                typeof word.translation === 'string' &&
                word.term.trim().length > 0 &&
                word.translation.trim().length > 0
            );
        } catch (error) {
            console.error('Failed to get words:', error);
            return [];
        }
    },

    async addWord(word: Word): Promise<string> {
        try {
            if (!word || !word.term || !word.translation || word.term.trim().length === 0 || word.translation.trim().length === 0) {
                throw new Error('Invalid word data: term and translation are required');
            }

            const db = await initDB();
            const userId = getCurrentUserId();

            const cleanWord: Word = {
                id: word.id || `word-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                term: word.term.trim(),
                translation: word.translation.trim(),
                category: word.category || 'Other',
                type: word.type || 'word',
                masteryLevel: Math.max(0, Math.min(5, word.masteryLevel || 0)),
                lastReviewed: word.lastReviewed || 0,
                timesCorrect: Math.max(0, word.timesCorrect || 0),
                isMastered: Boolean(word.isMastered),
                association: word.association || '',
                createdAt: word.createdAt || Date.now(),
                userId: userId || word.userId
            };

            await db.put('words', cleanWord);

            // Sync to Supabase if configured
            if (isSupabaseConfigured()) {
                await syncWordsToSupabase([cleanWord]);
            }

            return cleanWord.id;
        } catch (error) {
            console.error('Failed to add word:', error);
            throw error;
        }
    },

    async deleteWord(id: string): Promise<void> {
        try {
            const db = await initDB();
            await db.delete('words', id);

            // Sync deletion to Supabase if configured
            if (isSupabaseConfigured()) {
                const supabase = await import('./supabase').then(m => m.getSupabase());
                if (supabase) {
                    await supabase.from('words').delete().eq('id', id);
                }
            }
        } catch (error) {
            console.error('Failed to delete word:', error);
            throw error;
        }
    },

    async updateWord(id: string, updates: Partial<Word>): Promise<void> {
        try {
            const db = await initDB();
            const existingWord = await db.get('words', id);
            if (!existingWord) {
                throw new Error('Word not found');
            }

            const updatedWord = { ...existingWord, ...updates };
            await db.put('words', updatedWord);

            // Sync to Supabase if configured
            if (isSupabaseConfigured()) {
                await syncWordsToSupabase([updatedWord]);
            }
        } catch (error) {
            console.error('Failed to update word:', error);
            throw error;
        }
    },

    async backupData(): Promise<string> {
        try {
            const db = await initDB();
            const words = await db.getAll('words');
            const settings = await db.get('settings', 'user-settings');
            const progress = await db.get('progress', 'progress');

            const backup = {
                version: DB_VERSION,
                timestamp: Date.now(),
                words,
                settings,
                progress
            };

            return JSON.stringify(backup);
        } catch (error) {
            console.error('Failed to backup data:', error);
            throw error;
        }
    },

    async restoreData(backupData: string): Promise<void> {
        try {
            const backup = JSON.parse(backupData);
            const db = await initDB();

            const tx = db.transaction(['words', 'settings', 'progress'], 'readwrite');

            await tx.objectStore('words').clear();
            await tx.objectStore('settings').clear();
            await tx.objectStore('progress').clear();

            if (backup.words && Array.isArray(backup.words)) {
                for (const word of backup.words) {
                    await tx.objectStore('words').put(word);
                }
            }

            if (backup.settings) {
                await tx.objectStore('settings').put(backup.settings, 'user-settings');
            }

            if (backup.progress) {
                await tx.objectStore('progress').put(backup.progress, 'progress');
            }

            await tx.done;

            // Sync to Supabase if configured
            if (isSupabaseConfigured() && backup.words) {
                await syncWordsToSupabase(backup.words);
                if (backup.settings) await syncSettingsToSupabase(backup.settings);
                if (backup.progress) await syncProgressToSupabase(backup.progress);
            }
        } catch (error) {
            console.error('Failed to restore data:', error);
            throw error;
        }
    },

    async getSettings(): Promise<UserSettings | undefined> {
        const db = await initDB();
        return db.get('settings', 'user-settings');
    },

    async saveSettings(settings: UserSettings): Promise<void> {
        const db = await initDB();
        await db.put('settings', settings, 'user-settings');

        // Sync to Supabase if configured
        if (isSupabaseConfigured()) {
            await syncSettingsToSupabase(settings);
        }
    },

    async seedInitialData(words: Word[]) {
        const db = await initDB();
        const tx = db.transaction('words', 'readwrite');
        const store = tx.objectStore('words');
        const count = await store.count();
        if (count === 0) {
            for (const word of words) {
                await store.put(word);
            }
        }
        await tx.done;
    },

    async getProgress(): Promise<UserProgress | undefined> {
        const db = await initDB();
        const userId = getCurrentUserId();
        const key = userId ? `progress-${userId}` : 'progress';
        return db.get('progress', key);
    },

    async saveProgress(progress: UserProgress): Promise<void> {
        const db = await initDB();
        const userId = getCurrentUserId();
        const key = userId ? `progress-${userId}` : 'progress';
        await db.put('progress', progress, key);

        // Sync to Supabase if configured
        if (isSupabaseConfigured()) {
            await syncProgressToSupabase(progress);
        }
    },

    async getCachedTranslation(text: string, from: string, to: string): Promise<string | null> {
        const db = await initDB();
        const key = `${text.toLowerCase().trim()}|${from}|${to}`;
        const cached = await db.get('translations', key);
        if (cached) {
            if (Date.now() - cached.timestamp < 30 * 24 * 60 * 60 * 1000) {
                return cached.translation;
            } else {
                await db.delete('translations', key);
            }
        }
        return null;
    },

    async cacheTranslation(text: string, from: string, to: string, translation: string): Promise<void> {
        const db = await initDB();
        const key = `${text.toLowerCase().trim()}|${from}|${to}`;
        await db.put('translations', {
            text,
            from,
            to,
            translation,
            timestamp: Date.now(),
        }, key);
    },

    // New: Sync all local data to Supabase
    async syncToSupabase(): Promise<void> {
        if (!isSupabaseConfigured()) return;

        const words = await this.getWords();
        const settings = await this.getSettings();
        const progress = await this.getProgress();

        if (words.length > 0) await syncWordsToSupabase(words);
        if (settings) await syncSettingsToSupabase(settings);
        if (progress) await syncProgressToSupabase(progress);
    },

    // New: Pull data from Supabase to local
    async syncFromSupabase(): Promise<void> {
        if (!isSupabaseConfigured()) return;

        const remoteWords = await syncWordsFromSupabase();
        const remoteSettings = await syncSettingsFromSupabase();
        const remoteProgress = await syncProgressFromSupabase();

        const db = await initDB();

        if (remoteWords.length > 0) {
            const tx = db.transaction('words', 'readwrite');
            for (const word of remoteWords) {
                await tx.store.put(word);
            }
            await tx.done;
        }

        if (remoteSettings) {
            await db.put('settings', remoteSettings, 'user-settings');
        }

        if (remoteProgress) {
            const userId = getCurrentUserId();
            const key = userId ? `progress-${userId}` : 'progress';
            await db.put('progress', remoteProgress, key);
        }
    }
};
