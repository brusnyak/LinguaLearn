import { db } from './db';
import type { UserProgress } from '../types';

// XP required for each level (exponential growth)
const XP_PER_LEVEL = [
    0,      // Level 1
    100,    // Level 2
    250,    // Level 3
    450,    // Level 4
    700,    // Level 5
    1000,   // Level 6
    1400,   // Level 7
    1900,   // Level 8
    2500,   // Level 9
    3200,   // Level 10
    4000,   // Level 11
    5000,   // Level 12
    6200,   // Level 13
    7600,   // Level 14
    9200,   // Level 15
    11000,  // Level 16
    13000,  // Level 17
    15200,  // Level 18
    17600,  // Level 19
    20200,  // Level 20
    23000,  // Level 21
    26000,  // Level 22
    29200,  // Level 23
    32600,  // Level 24
    36200,  // Level 25
    40000,  // Level 26
    44000,  // Level 27
    48200,  // Level 28
    52600,  // Level 29
    57200,  // Level 30
    62000,  // Level 31
    67000,  // Level 32
    72200,  // Level 33
    77600,  // Level 34
    83200,  // Level 35
    89000,  // Level 36
    95000,  // Level 37
    101200, // Level 38
    107600, // Level 39
    114200, // Level 40
    121000, // Level 41
    128000, // Level 42
    135200, // Level 43
    142600, // Level 44
    150200, // Level 45
    158000, // Level 46
    166000, // Level 47
    174200, // Level 48
    182600, // Level 49
    191200, // Level 50
];

// Level title names
const LEVEL_TITLES: { [key: string]: string } = {
    '1-5': 'Amateur',
    '6-10': 'Apprentice',
    '11-20': 'Word Explorer',
    '21-35': 'Word Wizard',
    '36-50': 'Vocabulary Master',
    '51+': 'Language Legend',
};

/**
 * Calculate level from total XP
 */
export function calculateLevel(xp: number): number {
    for (let i = XP_PER_LEVEL.length - 1; i >= 0; i--) {
        if (xp >= XP_PER_LEVEL[i]) {
            return i + 1;
        }
    }
    return 1;
}

/**
 * Get XP required for a specific level
 */
export function getXPForLevel(level: number): number {
    if (level < 1) return 0;
    if (level > XP_PER_LEVEL.length) {
        // Extrapolate for levels beyond our table
        const lastXP = XP_PER_LEVEL[XP_PER_LEVEL.length - 1];
        const increment = 8000; // XP increment per level after 50
        return lastXP + (level - XP_PER_LEVEL.length) * increment;
    }
    return XP_PER_LEVEL[level - 1];
}

/**
 * Get progress to next level (percentage 0-100)
 */
export function getProgressToNextLevel(xp: number): { percentage: number; current: number; needed: number } {
    const currentLevel = calculateLevel(xp);
    const currentLevelXP = getXPForLevel(currentLevel);
    const nextLevelXP = getXPForLevel(currentLevel + 1);
    const xpInCurrentLevel = xp - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;

    return {
        percentage: Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100),
        current: xpInCurrentLevel,
        needed: xpNeededForNextLevel,
    };
}

/**
 * Get level title based on level number
 */
export function getLevelTitle(level: number): string {
    if (level <= 5) return LEVEL_TITLES['1-5'];
    if (level <= 10) return LEVEL_TITLES['6-10'];
    if (level <= 20) return LEVEL_TITLES['11-20'];
    if (level <= 35) return LEVEL_TITLES['21-35'];
    if (level <= 50) return LEVEL_TITLES['36-50'];
    return LEVEL_TITLES['51+'];
}

/**
 * Award XP to the current user and update their level
 */
export async function awardXP(amount: number): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
    const progress = await db.getProgress();
    if (!progress) {
        throw new Error('No progress found');
    }

    const oldLevel = progress.level || 1;
    const newXP = (progress.xp || 0) + amount;
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > oldLevel;

    const updatedProgress: UserProgress = {
        ...progress,
        xp: newXP,
        level: newLevel,
    };

    await db.saveProgress(updatedProgress);

    return {
        newXP,
        newLevel,
        leveledUp,
    };
}

/**
 * Get current user's XP and level info
 */
export async function getXPInfo(): Promise<{
    xp: number;
    level: number;
    title: string;
    progress: { percentage: number; current: number; needed: number };
}> {
    const progressData = await db.getProgress();
    const xp = progressData?.xp || 0;
    const level = progressData?.level || 1;

    return {
        xp,
        level,
        title: getLevelTitle(level),
        progress: getProgressToNextLevel(xp),
    };
}

// XP Rewards for different activities
export const XP_REWARDS = {
    FLASHCARD_CORRECT: 10,
    WORD_MASTERED: 25,
    WORD_MATCH_COMPLETE: 30,
    DUNGEON_BOSS_DEFEATED: 50,
    DAILY_STREAK: 20,
    WORD_ADDED: 5,
};
