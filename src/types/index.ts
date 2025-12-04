// User profile
export interface UserProfile {
    name: string;
    nativeLanguage: string;
    targetLanguage: string;
    level: 'beginner' | 'intermediate' | 'advanced';
}

// User authentication
export interface User {
    id: string;
    username: string;
    passwordHash: string;
    profile: UserProfile;
    createdAt: number;
    lastLogin: number;
}

export interface Word {
    id: string;
    userId?: string; // Owner of this word
    term: string; // The word in the target language (e.g., English/German) or Native? User said "native ukrainian -> target english". So term is likely the one being learned.
    // Actually, usually "term" is the foreign word, "definition" is native.
    // Let's assume Term = Target Language (English/German), Definition = Native (Ukrainian).
    // Or vice versa. The user said "native language be ukrainian and target -> english".
    // So they want to learn English.
    // Term: English Word. Definition: Ukrainian translation.
    translation: string;
    phonetic?: string;
    category: string;
    type?: 'word' | 'phrase'; // Optional for backward compatibility
    masteryLevel: number; // 0-5
    lastReviewed: number; // timestamp
    timesCorrect: number; // consecutive correct answers
    isMastered: boolean; // 2x correct = mastered
    createdAt: number;
}

export interface Category {
    id: string;
    name: string;
    color: string;
}

export interface UserProgress {
    userId?: string;
    currentStreak: number;
    lastStudyDate: string; // ISO Date string YYYY-MM-DD
    studyHistory: string[]; // Array of ISO Date strings
    xp: number;                    // NEW: Total XP earned
    level: number;                 // NEW: Current level (calculated from XP)
    completedDungeonLevels: number[]; // NEW: Array of completed dungeon level IDs
}

export interface UserSettings {
    userId?: string;
    profile?: UserProfile;
    theme: 'light' | 'dark' | 'system';
    notificationsEnabled: boolean;
    notificationTime: string;
    dailyGoal: number;  // NEW: Daily mastered words goal
    autoReadFlashcards: boolean; // NEW: Auto-read flashcards with TTS
}

export type GameType = 'flashcard' | 'dungeon' | 'match';
