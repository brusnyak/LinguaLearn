export interface Word {
    id: string;
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
    currentStreak: number;
    lastStudyDate: string; // ISO Date string YYYY-MM-DD
    studyHistory: string[]; // Array of ISO Date strings
}

export interface UserSettings {
    theme: 'light' | 'dark';
    dailyGoal: number;
    progress: UserProgress;
    soundEnabled?: boolean;
    notificationsEnabled?: boolean;
    notificationTime?: string; // HH:mm format
    profile?: {
        name: string;
        nativeLanguage: string;
        targetLanguage: string;
        level: 'beginner' | 'intermediate' | 'advanced';
    };
}

export type GameType = 'flashcard' | 'dungeon' | 'match';
