import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Word, UserSettings, User, UserProgress } from '../types';
import { getCurrentUserId } from './auth';

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
        value: User;
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
const DB_VERSION = 5; // Incremented to force clean migration (added association field)

let dbPromise: Promise<IDBPDatabase<LinguaDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<LinguaDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Words Store
                if (!db.objectStoreNames.contains('words')) {
                    const wordStore = db.createObjectStore('words', { keyPath: 'id' });
                    wordStore.createIndex('by-term', 'term');
                    wordStore.createIndex('by-category', 'category');
                    wordStore.createIndex('by-userId', 'userId');
                }

                // Settings Store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }

                // Users Store (new in v2)
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'id' });
                }

                // Progress Store (new in v2)
                if (!db.objectStoreNames.contains('progress')) {
                    db.createObjectStore('progress');
                }

                // Translations Store (new in v4)
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
        const db = await initDB();
        const userId = getCurrentUserId();
        const allWords = await db.getAll('words');
        // Filter by userId if logged in
        return userId ? allWords.filter(w => w.userId === userId) : allWords;
    },

    async addWord(word: Word): Promise<string> {
        const db = await initDB();
        const userId = getCurrentUserId();
        // Auto-add userId if logged in
        if (userId && !word.userId) {
            word.userId = userId;
        }
        await db.put('words', word);
        return word.id;
    },

    async deleteWord(id: string): Promise<void> {
        const db = await initDB();
        await db.delete('words', id);
    },

    async getSettings(): Promise<UserSettings | undefined> {
        const db = await initDB();
        return db.get('settings', 'user-settings');
    },

    async saveSettings(settings: UserSettings): Promise<void> {
        const db = await initDB();
        await db.put('settings', settings, 'user-settings');
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
    },

    async getCachedTranslation(text: string, from: string, to: string): Promise<string | null> {
        const db = await initDB();
        const key = `${text.toLowerCase().trim()}|${from}|${to}`;
        const cached = await db.get('translations', key);
        if (cached) {
            // Cache valid for 30 days
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
};
