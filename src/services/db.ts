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
        try {
            const db = await initDB();
            const userId = getCurrentUserId();
            const allWords = await db.getAll('words');
            
            // Filter by userId if logged in and validate data
            const filteredWords = userId 
                ? allWords.filter(w => w.userId === userId)
                : allWords;
                
            // Validate word objects and filter out corrupted data
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
            // Validate word data
            if (!word || !word.term || !word.translation || word.term.trim().length === 0 || word.translation.trim().length === 0) {
                throw new Error('Invalid word data: term and translation are required');
            }
            
            const db = await initDB();
            const userId = getCurrentUserId();
            
            // Create a clean word object
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
            
            // Clear existing data
            await tx.objectStore('words').clear();
            await tx.objectStore('settings').clear();
            await tx.objectStore('progress').clear();
            
            // Restore data
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
