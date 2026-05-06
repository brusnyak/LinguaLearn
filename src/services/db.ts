import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Word, UserSettings, UserProgress } from '../types';
import { getCurrentUserId, isUsingCloudAuth } from './auth';
import * as supabaseService from './supabase';

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

            // Filter words: if userId exists, show only that user's words
            const filteredWords = userId
                ? allWords.filter(w => {
                    if (!w.userId) return true;
                    return w.userId === userId;
                })
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
            if (await isUsingCloudAuth()) {
                await supabaseService.syncWordsToSupabase([cleanWord]);
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
            if (await isUsingCloudAuth()) {
                const client = supabaseService.getSupabase();
                if (client) {
                    await client.from('words').delete().eq('id', id);
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
            if (await isUsingCloudAuth()) {
                await supabaseService.syncWordsToSupabase([updatedWord]);
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
            if (await isUsingCloudAuth() && backup.words) {
                await supabaseService.syncWordsToSupabase(backup.words);
                if (backup.settings) await supabaseService.syncSettingsToSupabase(backup.settings);
                if (backup.progress) await supabaseService.syncProgressToSupabase(backup.progress);
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
        if (await isUsingCloudAuth()) {
            await supabaseService.syncSettingsToSupabase(settings);
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
        if (await isUsingCloudAuth()) {
            await supabaseService.syncProgressToSupabase(progress);
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

    // Sync all local data to Supabase and update local user ID
    async syncToCloud(): Promise<void> {
        console.log('[DB Sync] Starting syncToCloud...');
        if (!(await isUsingCloudAuth())) {
            console.warn('[DB Sync] Not logged in to cloud, skipping syncToCloud');
            throw new Error('Not logged in to cloud. Please login first.');
        }

        const session = await supabaseService.getCurrentSession();
        if (!session?.user) {
            console.error('[DB Sync] No Supabase user found in session');
            throw new Error('No Supabase user found');
        }
        
        const cloudUserId = session.user.id;
        const localUserId = getCurrentUserId();
        console.log('[DB Sync] User IDs:', { localUserId, cloudUserId });

        // Get all local data
        console.log('[DB Sync] Fetching local data...');
        const words = await this.getWords();
        const settings = await this.getSettings();
        const progress = await this.getProgress();
        console.log('[DB Sync] Data to sync:', { wordsCount: words.length, hasSettings: !!settings, hasProgress: !!progress });

        // Sync to Supabase
        try {
            if (words.length > 0) {
                console.log('[DB Sync] Syncing words...');
                await supabaseService.syncWordsToSupabase(words);
            }
            if (settings) {
                console.log('[DB Sync] Syncing settings...');
                await supabaseService.syncSettingsToSupabase(settings);
            }
            if (progress) {
                console.log('[DB Sync] Syncing progress...');
                await supabaseService.syncProgressToSupabase(progress);
            }
        } catch (err: any) {
            console.error('[DB Sync] Supabase sync error:', err);
            throw err;
        }

        // Update local user ID to match Supabase user ID if they differ
        if (localUserId && localUserId !== cloudUserId) {
            console.log('[DB Sync] Migrating local data from', localUserId, 'to', cloudUserId);
            const dbInstance = await initDB();

            // Update words in IndexedDB
            const tx = dbInstance.transaction('words', 'readwrite');
            const allWords = await tx.store.getAll();
            let updatedCount = 0;
            for (const word of allWords) {
                if (!word.userId || word.userId === localUserId) {
                    word.userId = cloudUserId;
                    await tx.store.put(word);
                    updatedCount++;
                }
            }
            await tx.done;
            console.log('[DB Sync] Updated', updatedCount, 'words in IndexedDB');

            // Update progress key
            if (progress) {
                console.log('[DB Sync] Updating progress key');
                await dbInstance.delete('progress', `progress-${localUserId}`);
                await dbInstance.put('progress', progress, `progress-${cloudUserId}`);
            }

            // Update currentUserId in localStorage
            localStorage.setItem('currentUserId', cloudUserId);

            // Update user in users store
            const userTx = dbInstance.transaction('users', 'readwrite');
            const userStore = userTx.objectStore('users');
            const localUser = await userStore.get(localUserId);
            if (localUser) {
                console.log('[DB Sync] Updating user record in IndexedDB');
                await userStore.delete(localUserId);
                localUser.id = cloudUserId;
                await userStore.put(localUser);
            }
            await userTx.done;
            console.log('[DB Sync] Migration complete');
        }
    },

    // Pull data from Supabase to local
    async syncFromCloud(): Promise<void> {
        console.log('[DB Sync] Starting syncFromCloud...');
        if (!(await isUsingCloudAuth())) return;

        try {
            console.log('[DB Sync] Fetching remote data...');
            const remoteWords = await supabaseService.syncWordsFromSupabase();
            const remoteSettings = await supabaseService.syncSettingsFromSupabase();
            const remoteProgress = await supabaseService.syncProgressFromSupabase();
            console.log('[DB Sync] Remote data received:', { wordsCount: remoteWords.length, hasSettings: !!remoteSettings, hasProgress: !!remoteProgress });

            const db = await initDB();

            if (remoteWords.length > 0) {
                const tx = db.transaction('words', 'readwrite');
                for (const word of remoteWords) {
                    await tx.store.put(word);
                }
                await tx.done;
                console.log('[DB Sync] Updated local words store');
            }

            if (remoteSettings) {
                await db.put('settings', remoteSettings, 'user-settings');
                console.log('[DB Sync] Updated local settings store');
            }

            if (remoteProgress) {
                const userId = getCurrentUserId();
                const key = userId ? `progress-${userId}` : 'progress';
                await db.put('progress', remoteProgress, key);
                console.log('[DB Sync] Updated local progress store');
            }
        } catch (err: any) {
            console.error('[DB Sync] syncFromCloud error:', err);
            throw err;
        }
    }
};
