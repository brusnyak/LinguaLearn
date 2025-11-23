import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Word, UserSettings } from '../types';

interface LinguaDB extends DBSchema {
    words: {
        key: string;
        value: Word;
        indexes: { 'by-term': string; 'by-category': string };
    };
    settings: {
        key: string;
        value: UserSettings;
    };
}

const DB_NAME = 'lingua-learn-db';
const DB_VERSION = 1;

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
                }

                // Settings Store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
            },
        });
    }
    return dbPromise;
};

export const db = {
    async getWords(): Promise<Word[]> {
        const db = await initDB();
        return db.getAll('words');
    },

    async addWord(word: Word): Promise<string> {
        const db = await initDB();
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
    }
};
