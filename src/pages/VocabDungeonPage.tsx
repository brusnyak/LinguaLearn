import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Shield } from 'lucide-react';
import { db } from '../services/db';
import type { Word } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const VocabDungeonPage: React.FC = () => {
    const navigate = useNavigate();
    const [words, setWords] = useState<Word[]>([]);
    const [currentWord, setCurrentWord] = useState<Word | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [playerHP, setPlayerHP] = useState(100);
    const [monsterHP, setMonsterHP] = useState(100);
    const [maxMonsterHP, setMaxMonsterHP] = useState(100);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [unlockedLevel, setUnlockedLevel] = useState(1); // Track highest unlocked level
    const [gameState, setGameState] = useState<'menu' | 'loading' | 'playing' | 'won' | 'lost'>('menu');
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');

    useEffect(() => {
        loadProgress();
    }, []);

    const loadProgress = async () => {
        // Load unlocked level from settings
        // For now, we'll just allow all levels. Can add level unlock logic later.
        setUnlockedLevel(5);
    };

    const startGame = async (level: number) => {
        try {
            const allWords = await db.getWords();
            if (allWords.length < 4) {
                alert("You need at least 4 words in your dictionary to play!");
                navigate('/dictionary');
                return;
            }

            setCurrentLevel(level);
            const bossHP = 100 + (level - 1) * 50; // Level 1: 100, Level 5: 300
            setMaxMonsterHP(bossHP);
            setMonsterHP(bossHP);
            setPlayerHP(100);

            // Filter words based on level
            let filteredWords = allWords;
            if (level <= 2) {
                filteredWords = allWords.filter(w => w.masteryLevel <= 2);
            } else if (level <= 4) {
                filteredWords = allWords.filter(w => w.masteryLevel <= 4 && w.masteryLevel >= 1);
            } else {
                // Level 5: prioritize harder words
                filteredWords = allWords.filter(w => w.masteryLevel >= 3);
            }

            // Fallback to all words if filtered list is too small
            if (filteredWords.length < 4) {
                filteredWords = allWords;
            }

            setWords(filteredWords);
            setGameState('playing');
            nextTurn(filteredWords);
        } catch (error) {
            console.error("Failed to start game", error);
        }
    };

    const nextTurn = (currentWords: Word[]) => {
        const randomWord = currentWords[Math.floor(Math.random() * currentWords.length)];
        setCurrentWord(randomWord);

        // Generate options (1 correct, 3 wrong)
        const wrongOptions = currentWords
            .filter(w => w.id !== randomWord.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => w.translation);

        const allOptions = [...wrongOptions, randomWord.translation].sort(() => 0.5 - Math.random());
        setOptions(allOptions);
        setFeedback('none');
    };

    const [isShaking, setIsShaking] = useState(false);
    const [hitEffect, setHitEffect] = useState<'none' | 'damage' | 'heal'>('none');

    useEffect(() => {
        if (hitEffect !== 'none') {
            const timer = setTimeout(() => setHitEffect('none'), 500);
            return () => clearTimeout(timer);
        }
    }, [hitEffect]);

    const handleAttack = (selectedOption: string) => {
        if (!currentWord || feedback !== 'none') return;

        if (selectedOption === currentWord.translation) {
            // Correct
            setFeedback('correct');
            setHitEffect('damage');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);

            const damage = 20; // Fixed damage for now
            setMonsterHP(prev => {
                const newHP = prev - damage;
                if (newHP <= 0) {
                    setTimeout(() => handleWin(), 1000);
                    return 0;
                }
                return newHP;
            });
            if (monsterHP > 20) {
                setTimeout(() => nextTurn(words), 1000);
            }
        } else {
            // Wrong
            setFeedback('wrong');
            setHitEffect('heal'); // Monster heals/player takes damage visual

            const damage = 15;
            setPlayerHP(prev => {
                const newHP = prev - damage;
                if (newHP <= 0) {
                    setTimeout(() => setGameState('lost'), 1000);
                    return 0;
                }
                return newHP;
            });
            if (playerHP > 15) {
                setTimeout(() => nextTurn(words), 1000);
            }
        }
    };

    const handleWin = () => {
        setGameState('won');
        // Logic to increase mastery level of words could go here
    };

    if (gameState === 'loading') return <div className="p-10 text-center">Entering Dungeon...</div>;

    // Level Selection Menu
    if (gameState === 'menu') {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => navigate('/games')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ArrowLeft />
                    </button>
                    <h2 className="text-2xl font-bold">Select Level</h2>
                    <div className="w-10"></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5].map(lvl => {
                        const bossHP = 100 + (lvl - 1) * 50;
                        const isLocked = lvl > unlockedLevel;
                        return (
                            <button
                                key={lvl}
                                onClick={() => !isLocked && startGame(lvl)}
                                disabled={isLocked}
                                className={`p-6 rounded-xl border-2 transition-all ${isLocked
                                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 opacity-50 cursor-not-allowed'
                                    : 'bg-[var(--color-bg-card)] border-[var(--color-primary)] hover:shadow-lg hover:scale-105'
                                    }`}
                            >
                                <div className="text-3xl font-bold mb-2">{lvl}</div>
                                <div className="text-sm text-[var(--color-text-muted)] mb-1">Boss HP: {bossHP}</div>
                                {isLocked && <div className="text-xs">🔒 Locked</div>}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setGameState('menu')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ArrowLeft />
                </button>
                <div className="font-bold text-lg">Dungeon Level {currentLevel}</div>
                <div className="w-8"></div>
            </div>

            {/* Battle Scene */}
            <div className="flex-1 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl shadow-lg p-6 flex flex-col justify-between relative overflow-hidden border-2 border-gray-700">

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

                {/* Monster HP Bar */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Shield className="text-red-500" size={24} />
                        <div className="flex-1">
                            <div className="bg-gray-700 rounded-full h-4 overflow-hidden border border-gray-600">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-red-600 to-red-400"
                                    style={{ width: `${(monsterHP / maxMonsterHP) * 100}%` }}
                                    initial={{ width: '100%' }}
                                    animate={{ width: `${(monsterHP / maxMonsterHP) * 100}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{monsterHP} / {maxMonsterHP} HP</div>
                        </div>
                    </div>
                    <motion.div
                        className="text-8xl mb-6 filter drop-shadow-2xl"
                        animate={isShaking ? { x: [-10, 10, -10, 10, 0], color: ['#fff', '#f00', '#fff'] } : { y: [0, -10, 0] }}
                        transition={isShaking ? { duration: 0.4 } : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    >
                        👾
                    </motion.div>

                    <div className="text-3xl font-bold text-center mb-2 text-white drop-shadow-md">{currentWord?.term}</div>
                    <div className="text-sm text-gray-400">Translate to attack!</div>
                </div>

                {/* Player Stats */}
                <div className="flex justify-between items-center px-4 py-3 bg-gray-800/80 backdrop-blur rounded-xl mb-4 border border-gray-700">
                    <div className="flex items-center text-red-400 font-bold text-lg">
                        <Heart className="mr-2" size={20} fill="currentColor" /> {playerHP}
                    </div>
                    <div className="flex items-center text-blue-400 font-bold text-lg">
                        <Shield className="mr-2" size={20} fill="currentColor" /> 10
                    </div>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 gap-3 relative z-10">
                    {options.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAttack(option)}
                            disabled={feedback !== 'none'}
                            className={`p-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 shadow-lg
                ${feedback === 'none' ? 'bg-white text-gray-900 hover:bg-gray-100' : ''}
                ${feedback === 'correct' && option === currentWord?.translation ? 'bg-green-500 text-white scale-105 ring-4 ring-green-300' : ''}
                ${feedback === 'wrong' && option === currentWord?.translation ? 'bg-green-500 text-white opacity-70' : ''}
                ${feedback === 'wrong' && option !== currentWord?.translation ? 'bg-red-500 text-white shake' : ''}
              `}
                        >
                            {option}
                        </button>
                    ))}
                </div>

                {/* Overlays */}
                <AnimatePresence>
                    {gameState === 'won' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white z-50 backdrop-blur-sm"
                        >
                            <Trophy size={80} className="text-yellow-400 mb-6 drop-shadow-glow" />
                            <h2 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Victory!</h2>
                            <p className="mb-8 text-gray-300 text-lg">You defeated the monster!</p>
                            <button onClick={() => setGameState('menu')} className="btn btn-primary text-lg px-8 py-3 shadow-xl shadow-purple-500/30">Back to Levels</button>
                        </motion.div>
                    )}
                    {gameState === 'lost' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white z-50 backdrop-blur-sm"
                        >
                            <div className="text-8xl mb-6">💀</div>
                            <h2 className="text-4xl font-bold mb-8 text-red-500">Defeated</h2>
                            <button onClick={() => startGame(currentLevel)} className="btn btn-primary text-lg px-8 py-3">Try Again</button>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

// Helper component for Trophy icon since it wasn't imported
const Trophy = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
);

export default VocabDungeonPage;
