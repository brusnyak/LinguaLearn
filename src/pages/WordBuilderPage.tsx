import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lightbulb, RotateCcw } from 'lucide-react';
import { db } from '../services/db';
import type { Word } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../hooks/useSound';
import { useTTS } from '../hooks/useTTS';

interface LetterTile { id: string; char: string }

const WordBuilderPage: React.FC = () => {
    const navigate = useNavigate();
    const { play } = useSound();
    const { speak } = useTTS();
    const [words, setWords] = useState<Word[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [scrambledLetters, setScrambledLetters] = useState<LetterTile[]>([]);
    const [selectedLetters, setSelectedLetters] = useState<LetterTile[]>([]);
    const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
    const [showHint, setShowHint] = useState(false);
    const [loading, setLoading] = useState(true);

    const wordsRef = useRef<Word[]>([]);
    const currentIndexRef = useRef(0);
    const gameStateRef = useRef(gameState);
    useEffect(() => { wordsRef.current = words; }, [words]);
    useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const loadGame = useCallback(async () => {
        setLoading(true); setGameState('playing'); setShowHint(false);
        try {
            const allWords = await db.getWords();
            const validWords = allWords.filter(w => w.term.length >= 3 && w.term.length <= 15 && /^[a-zA-Z]+$/.test(w.term));
            if (validWords.length === 0) { alert("Need more words (3-15 letters, no spaces)!"); navigate('/games'); return; }
            const shuffled = [...validWords].sort(() => 0.5 - Math.random()).slice(0, 5);
            setWords(shuffled); wordsRef.current = shuffled;
            setCurrentIndex(0); currentIndexRef.current = 0;
            startRound(shuffled[0]);
        } catch (e) { console.error("Failed to load game", e); }
        finally { setLoading(false); }
    }, [navigate]);

    useEffect(() => { loadGame(); }, [loadGame]);

    const startRound = (word: Word) => {
        setGameState('playing'); gameStateRef.current = 'playing';
        setShowHint(false); setSelectedLetters([]);
        const letters = word.term.split('').map((char, index) => ({
            id: `${index}-${char}-${Math.random().toString(36).slice(2, 8)}`, char
        }));
        setScrambledLetters([...letters].sort(() => 0.5 - Math.random()));
    };

    const goToNextRound = useCallback(() => {
        const idx = currentIndexRef.current, ws = wordsRef.current;
        if (idx < ws.length - 1) { setCurrentIndex(idx + 1); currentIndexRef.current = idx + 1; startRound(ws[idx + 1]); }
        else { setGameState('complete'); gameStateRef.current = 'complete'; play('levelUp'); }
    }, [play]);

    const handleLetterClick = (letter: LetterTile) => {
        if (gameStateRef.current !== 'playing') return;
        play('tap');
        setScrambledLetters(prev => prev.filter(l => l.id !== letter.id));
        setSelectedLetters(prev => {
            const next = [...prev, letter];
            const word = wordsRef.current[currentIndexRef.current];
            if (word && next.length === word.term.length) {
                const built = next.map(l => l.char).join('');
                if (built.toLowerCase() === word.term.toLowerCase()) {
                    play('success'); speak(word.term, 'en-US');
                    setGameState('success'); gameStateRef.current = 'success';
                    setTimeout(() => goToNextRound(), 1200);
                } else { play('error'); }
            }
            return next;
        });
    };

    const handleSelectedLetterClick = (letter: LetterTile) => {
        if (gameStateRef.current !== 'playing') return;
        play('tap');
        setSelectedLetters(prev => prev.filter(l => l.id !== letter.id));
        setScrambledLetters(prev => [...prev, letter]);
    };

    const currentWord = words[currentIndex];
    const remainingWords = words.length - currentIndex;
    const progressPercent = words.length > 0 ? ((currentIndex) / words.length) * 100 : 0;

    if (loading) return <div className="p-10 text-center">Loading Game...</div>;

    if (gameState === 'complete') {
        return (
            <div className="max-w-md mx-auto h-screen flex flex-col items-center justify-center space-y-6 p-6 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl">🎉</motion.div>
                <h2 className="text-3xl font-bold">Great Job!</h2>
                <p className="text-[var(--color-text-muted)]">You built all {words.length} words correctly.</p>
                <button onClick={() => navigate('/games')} className="btn btn-primary w-full">Back to Games</button>
                <button onClick={loadGame} className="btn btn-secondary w-full">Play Again</button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto h-[calc(100vh-80px)] flex flex-col p-3 sm:p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <button onClick={() => navigate('/games')} className="p-2 rounded-full hover:bg-[var(--color-bg-card)]">
                    <ArrowLeft />
                </button>
                <div className="font-bold text-lg text-center leading-tight">
                    <div>Word Builder</div>
                    <div className="text-sm text-[var(--color-text-muted)] font-normal">
                        Word {currentIndex + 1} of {words.length}
                    </div>
                </div>
                <button onClick={() => { setShowHint(false); loadGame(); }} className="p-2 rounded-full hover:bg-[var(--color-bg-card)] text-gray-400" title="Restart">
                    <RotateCcw size={20} />
                </button>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
                <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                    <span>Progress</span>
                    <span>{remainingWords} {remainingWords === 1 ? 'word' : 'words'} remaining</span>
                </div>
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-[var(--color-primary)] rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }} />
                </div>
            </div>

            {currentWord && (
                <div className="flex-1 flex flex-col items-center space-y-4 sm:space-y-5">
                    {/* Word Display Area */}
                    <div className="w-full bg-[var(--color-bg-card)] rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center shadow-sm">
                        <div className="text-center space-y-2 sm:space-y-3 w-full">
                            <div className="text-xs sm:text-sm text-[var(--color-text-muted)] uppercase tracking-wider">
                                Build the English word for:
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-bold text-[var(--color-primary)]">
                                {currentWord.translation}
                            </h3>
                            <div className="pt-1">
                                {!showHint ? (
                                    <button onClick={() => setShowHint(true)} className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-lg">
                                        <Lightbulb size={14} /> Show hint (English word)
                                    </button>
                                ) : (
                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-yellow-50 dark:bg-yellow-900/20 p-2.5 rounded-lg text-sm inline-flex items-center gap-2">
                                        <span className="text-yellow-800 dark:text-yellow-200 font-medium">💡 {currentWord.term}</span>
                                        <button onClick={() => setShowHint(false)} className="text-xs text-yellow-600 dark:text-yellow-400 underline">Hide</button>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Selected Letters */}
                    <div className="flex flex-wrap justify-center gap-2 min-h-[48px] sm:min-h-[52px]">
                        {selectedLetters.map((letter) => (
                            <motion.button layoutId={letter.id} key={letter.id} onClick={() => handleSelectedLetterClick(letter)}
                                className="w-10 h-10 sm:w-11 sm:h-11 bg-[var(--color-primary)] text-white rounded-xl font-bold text-lg sm:text-xl shadow-lg flex items-center justify-center active:scale-90 transition-transform select-none">
                                {letter.char}
                            </motion.button>
                        ))}
                        {Array.from({ length: Math.max(0, currentWord.term.length - selectedLetters.length) }).map((_, i) => (
                            <div key={`empty-${i}`} className="w-10 h-10 sm:w-11 sm:h-11 bg-gray-100 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex-shrink-0" />
                        ))}
                    </div>

                    {/* Scrambled Letters */}
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
                        {scrambledLetters.map((letter) => (
                            <motion.button layoutId={letter.id} key={letter.id} onClick={() => handleLetterClick(letter)} whileTap={{ scale: 0.9 }}
                                className="w-11 h-11 sm:w-12 sm:h-12 bg-[var(--color-bg-card)] border-2 border-[var(--color-border)] rounded-xl font-bold text-lg sm:text-xl shadow-sm hover:scale-105 active:scale-95 transition-transform flex items-center justify-center text-[var(--color-text)] select-none">
                                {letter.char}
                            </motion.button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {gameState === 'success' && (
                            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                                className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-20">
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-green-500 text-white p-5 sm:p-6 rounded-full shadow-2xl">
                                    <Check size={40} strokeWidth={4} />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default WordBuilderPage;
