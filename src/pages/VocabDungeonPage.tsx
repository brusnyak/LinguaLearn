import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Heart, Skull, ArrowLeft } from 'lucide-react';
import { db } from '../services/db';
import type { Word } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { awardXP, XP_REWARDS } from '../services/xp';
import { useToast } from '../context/ToastContext';

const VocabDungeonPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [words, setWords] = useState<Word[]>([]);
    const [currentWord, setCurrentWord] = useState<Word | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [playerHP, setPlayerHP] = useState(100);
    const [monsterHP, setMonsterHP] = useState(100);
    const [maxMonsterHP, setMaxMonsterHP] = useState(100);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [gameState, setGameState] = useState<'entrance' | 'playing' | 'won' | 'lost'>('entrance');
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
    const [hitEffect, setHitEffect] = useState<'none' | 'damage' | 'heal'>('none');

    useEffect(() => {
        loadProgress();
    }, []);

    useEffect(() => {
        if (hitEffect !== 'none') {
            const timer = setTimeout(() => setHitEffect('none'), 500);
            return () => clearTimeout(timer);
        }
    }, [hitEffect]);

    const loadProgress = async () => {
        const progress = await db.getProgress();
        const completedLevels = progress?.completedDungeonLevels || [];
        // Start at next uncompleted level
        const nextLevel = completedLevels.length + 1;
        setCurrentLevel(Math.min(nextLevel, 10)); // Max 10 levels
    };

    const startGame = async () => {
        try {
            const allWords = await db.getWords();
            if (allWords.length < 4) {
                showToast('You need at least 4 words in your dictionary!', 'error');
                navigate('/dictionary');
                return;
            }

            const bossHP = 100 + (currentLevel - 1) * 50;
            setMaxMonsterHP(bossHP);
            setMonsterHP(bossHP);
            setPlayerHP(100);

            //Filter words based on level difficulty
            let filteredWords = allWords;
            if (currentLevel <= 3) {
                filteredWords = allWords.filter(w => w.masteryLevel <= 2);
            } else if (currentLevel <= 6) {
                filteredWords = allWords.filter(w => w.masteryLevel >= 1 && w.masteryLevel <= 4);
            } else {
                filteredWords = allWords.filter(w => w.masteryLevel >= 3);
            }

            if (filteredWords.length < 4) {
                filteredWords = allWords;
            }

            setWords(filteredWords);
            setGameState('playing');
            nextTurn(filteredWords);
        } catch (error) {
            console.error('Failed to start game', error);
        }
    };

    const nextTurn = (currentWords: Word[]) => {
        const randomWord = currentWords[Math.floor(Math.random() * currentWords.length)];
        setCurrentWord(randomWord);

        const wrongOptions = currentWords
            .filter(w => w.id !== randomWord.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => w.translation);

        const allOptions = [...wrongOptions, randomWord.translation].sort(() => 0.5 - Math.random());
        setOptions(allOptions);
        setFeedback('none');
    };

    const handleAttack = async (selectedOption: string) => {
        if (!currentWord || feedback !== 'none') return;

        if (selectedOption === currentWord.translation) {
            // Correct
            setFeedback('correct');
            const damage = 25;
            setMonsterHP(prev => {
                const newHP = Math.max(0, prev - damage);
                if (newHP === 0) {
                    setTimeout(() => handleWin(), 800);
                } else {
                    setTimeout(() => nextTurn(words), 1000);
                }
                return newHP;
            });
        } else {
            // Wrong
            setFeedback('wrong');
            setHitEffect('damage');
            const damage = 20;
            setPlayerHP(prev => {
                const newHP = Math.max(0, prev - damage);
                if (newHP === 0) {
                    setTimeout(() => setGameState('lost'), 800);
                } else {
                    setTimeout(() => nextTurn(words), 1000);
                }
                return newHP;
            });
        }
    };

    const handleWin = async () => {
        setGameState('won');

        // Award XP
        await awardXP(XP_REWARDS.DUNGEON_BOSS_DEFEATED);

        // Save completed level
        const progress = await db.getProgress();
        if (progress) {
            const completedLevels = progress.completedDungeonLevels || [];
            if (!completedLevels.includes(currentLevel)) {
                completedLevels.push(currentLevel);
                await db.saveProgress({ ...progress, completedDungeonLevels: completedLevels });
            }
        }

        showToast(`+ ${XP_REWARDS.DUNGEON_BOSS_DEFEATED} XP!`, 'success');
    };

    const handleContinue = () => {
        setCurrentLevel(prev => prev + 1);
        setGameState('entrance');
    };

    // Entrance Screen
    if (gameState === 'entrance') {
        return (
            <div className="max-w-2xl mx-auto px-6 py-8 min-h-screen flex flex-col">
                <button onClick={() => navigate('/games')} className="p-2 rounded-full hover:bg-[var(--color-bg-card)] transition-colors self-start mb-6">
                    <ArrowLeft />
                </button>

                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                    {/* Dungeon Entrance Theme */}
                    <div className="relative">
                        <div className="text-8xl mb-4">🏰</div>
                        <div className="absolute -top-2 -right-2 bg-[var(--color-primary)] text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                            {currentLevel}
                        </div>
                    </div>

                    <div>
                        <h1 className="text-4xl font-bold mb-2">Vocabulary Dungeon</h1>
                        <p className="text-xl text-[var(--color-text-muted)] mb-1">Level {currentLevel}</p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Boss HP: {100 + (currentLevel - 1) * 50}
                        </p>
                    </div>

                    <div className="bg-[var(--color-bg-card)] rounded-xl p-6 max-w-md">
                        <h3 className="font-bold mb-3 flex items-center gap-2">
                            <Skull size={20} className="text-red-500" />
                            Challenge
                        </h3>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Defeat the Level {currentLevel} boss by correctly translating words. Each wrong answer damages you!
                        </p>
                    </div>

                    <button
                        onClick={startGame}
                        className="px-8 py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-lg"
                    >
                        Enter Dungeon →
                    </button>
                </div>
            </div>
        );
    }

    // Victory Screen
    if (gameState === 'won') {
        return (
            <div className="max-w-md mx-auto px-6 py-8 min-h-screen flex flex-col items-center justify-center text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-8xl mb-4"
                >
                    🏆
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">Victory!</h2>
                <p className="text-[var(--color-text-muted)] mb-6">
                    You defeated the Level {currentLevel} boss!
                </p>
                <div className="bg-[var(--color-bg-card)] rounded-xl p-6 mb-8 w-full">
                    <div className="flex items-center justify-between mb-2">
                        <span>XP Earned</span>
                        <span className="font-bold text-[var(--color-primary)]">+{XP_REWARDS.DUNGEON_BOSS_DEFEATED}</span>
                    </div>
                </div>
                <div className="flex gap-3 w-full">
                    <button
                        onClick={() => navigate('/games')}
                        className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg font-bold hover:bg-[var(--color-bg-card)] transition-colors"
                    >
                        Exit
                    </button>
                    {currentLevel < 10 && (
                        <button
                            onClick={handleContinue}
                            className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[var(--color-primary-dark)] transition-colors"
                        >
                            Next Level →
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Defeat Screen
    if (gameState === 'lost') {
        return (
            <div className="max-w-md mx-auto px-6 py-8 min-h-screen flex flex-col items-center justify-center text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-8xl mb-4"
                >
                    💀
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">Defeated!</h2>
                <p className="text-[var(--color-text-muted)] mb-8">
                    The Level {currentLevel} boss proved too strong. Try again!
                </p>
                <div className="flex gap-3 w-full">
                    <button
                        onClick={() => navigate('/games')}
                        className="flex-1 px-6 py-3 border border-[var(--color-border)] rounded-lg font-bold hover:bg-[var(--color-bg-card)] transition-colors"
                    >
                        Exit
                    </button>
                    <button
                        onClick={() => setGameState('entrance')}
                        className="flex-1 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[var(--color-primary-dark)] transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Battle Screen
    return (
        <div className="max-w-md mx-auto h-screen flex flex-col p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setGameState('entrance')} className="p-2 rounded-full hover:bg-[var(--color-bg-card)]">
                    <ArrowLeft />
                </button>
                <div className="font-bold text-lg">Level {currentLevel}</div>
                <div className="w-8"></div>
            </div>

            {/* Battle Scene - Scrollable */}
            <div className="flex-1 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl shadow-lg p-6 flex flex-col justify-between relative overflow-hidden border-2 border-gray-700 max-h-[calc(100vh-120px)]">

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                {/* Hit Effect Overlay */}
                <AnimatePresence>
                    {hitEffect === 'damage' && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-red-500 z-10 pointer-events-none"
                        />
                    )}
                </AnimatePresence>

                {/* Scrollable Content */}
                <div className="flex-1 flex flex-col overflow-y-auto">
                    {/* Monster HP Bar */}
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3">
                            <Shield className="text-red-500 flex-shrink-0" size={24} />
                            <div className="flex-1">
                                <div className="bg-gray-700 rounded-full h-4 overflow-hidden border border-gray-600">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-red-600 to-red-400"
                                        style={{ width: `${(monsterHP / maxMonsterHP) * 100}%` }}
                                        animate={{ width: `${(monsterHP / maxMonsterHP) * 100}%` }}
                                    />
                                </div>
                                <div className="text-xs text-gray-400 mt-1">Monster: {monsterHP}/{maxMonsterHP}</div>
                            </div>
                        </div>
                    </div>

                    {/* Monster */}
                    <div className="flex-1 flex items-center justify-center mb-6">
                        <motion.div
                            className="text-8xl"
                            animate={{ scale: monsterHP === 0 ? 0 : 1 }}
                        >
                            👹
                        </motion.div>
                    </div>

                    {/* Word Display */}
                    {currentWord && (
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6">
                            <div className="text-center text-3xl font-bold text-white mb-2">
                                {currentWord.term}
                            </div>
                            {currentWord.phonetic && (
                                <div className="text-center text-gray-400 text-sm italic">
                                    {currentWord.phonetic}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Options - Scrollable area */}
                    <div className="space-y-3 mb-6">
                        {options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAttack(option)}
                                disabled={feedback !== 'none'}
                                className={`w-full p-4 rounded-lg font-bold text-lg transition-all border-2 ${feedback === 'none'
                                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:scale-105'
                                    : feedback === 'correct' && option === currentWord?.translation
                                        ? 'bg-green-500 border-green-400 text-white'
                                        : feedback === 'wrong' && option !== currentWord?.translation
                                            ? 'bg-gray-700 border-gray-600 opacity-50'
                                            : 'bg-red-500 border-red-400 text-white'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>

                    {/* Player HP Bar */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Heart className="text-green-500 flex-shrink-0" size={24} />
                            <div className="flex-1">
                                <div className="bg-gray-700 rounded-full h-4 overflow-hidden border border-gray-600">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-green-600 to-green-400"
                                        animate={{ width: `${playerHP}%` }}
                                    />
                                </div>
                                <div className="text-xs text-gray-400 mt-1">Your HP: {playerHP}/100</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VocabDungeonPage;
