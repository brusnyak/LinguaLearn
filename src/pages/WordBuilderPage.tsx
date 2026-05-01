import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lightbulb } from 'lucide-react';
import { db } from '../services/db';
import type { Word } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../hooks/useSound';
import { useTTS } from '../hooks/useTTS';

const WordBuilderPage: React.FC = () => {
    const navigate = useNavigate();
    const { play } = useSound();
    const { speak } = useTTS();
    const [words, setWords] = useState<Word[]>([]);
    const [currentWord, setCurrentWord] = useState<Word | null>(null);
    const [scrambledLetters, setScrambledLetters] = useState<{ id: string; char: string }[]>([]);
    const [selectedLetters, setSelectedLetters] = useState<{ id: string; char: string }[]>([]);
    const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
    const [showHint, setShowHint] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadGame();
    }, []);

    const loadGame = async () => {
        setLoading(true);
        try {
            const allWords = await db.getWords();
            const validWords = allWords.filter(w => w.term.length >= 3);
            
            if (validWords.length === 0) {
                alert("Need more words to play! Add words with 3+ letters.");
                navigate('/games');
                return;
            }

            const shuffled = validWords.sort(() => 0.5 - Math.random()).slice(0, 5);
            setWords(shuffled);
            startRound(shuffled[0]);
        } catch (error) {
            console.error("Failed to load game", error);
        } finally {
            setLoading(false);
        }
    };

    const startRound = (word: Word) => {
        setCurrentWord(word);
        setGameState('playing');
        setShowHint(false);
        setSelectedLetters([]);

        const letters = word.term.split('').map((char, index) => ({
            id: `${index}-${char}-${Math.random()}`,
            char
        }));
        setScrambledLetters(letters.sort(() => 0.5 - Math.random()));
    };

    const handleLetterClick = (letter: { id: string; char: string }) => {
        if (gameState !== 'playing') return;

        play('tap');
        setScrambledLetters(prev => prev.filter(l => l.id !== letter.id));
        setSelectedLetters(prev => [...prev, letter]);

        const currentString = [...selectedLetters, letter].map(l => l.char).join('');
        if (currentWord && currentString.length === currentWord.term.length) {
            checkWord(currentString);
        }
    };

    const handleSelectedLetterClick = (letter: { id: string; char: string }) => {
        if (gameState !== 'playing') return;

        play('tap');
        setSelectedLetters(prev => prev.filter(l => l.id !== letter.id));
        setScrambledLetters(prev => [...prev, letter]);
    };

    const checkWord = (builtWord: string) => {
        if (!currentWord) return;

        if (builtWord.toLowerCase() === currentWord.term.toLowerCase()) {
            play('success');
            speak(currentWord.term, 'en-US');
            setGameState('success');
            
            setTimeout(() => {
                nextRound();
            }, 1500);
        } else {
            play('error');
        }
    };

    const nextRound = () => {
        if (!currentWord) return;
        const currentIndex = words.findIndex(w => w.id === currentWord.id);
        
        if (currentIndex < words.length - 1) {
            startRound(words[currentIndex + 1]);
        } else {
            setGameState('complete');
            play('levelUp');
        }
    };

    const currentIndex = currentWord ? words.findIndex(w => w.id === currentWord.id) : 0;
    const remainingWords = words.length - currentIndex;

    if (loading) return <div className="p-10 text-center">Loading Game...</div>;

    if (gameState === 'complete') {
        return (
            <div className="max-w-md mx-auto h-screen flex flex-col items-center justify-center space-y-6 p-6 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold">Great Job!</h2>
                <p className="text-[var(--color-text-muted)]">You built all the words correctly.</p>
                <button onClick={() => navigate('/games')} className="btn btn-primary w-full">Back to Games</button>
                <button onClick={loadGame} className="btn btn-secondary w-full">Play Again</button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto h-screen flex flex-col p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => navigate('/games')} className="p-2 rounded-full hover:bg-[var(--color-bg-card)]">
                    <ArrowLeft />
                </button>
                <div className="font-bold text-lg">
                    Word Builder
                    <span className="ml-2 text-sm text-[var(--color-text-muted)]">
                        {currentIndex + 1}/{words.length}
                    </span>
                </div>
                <button 
                    onClick={() => setShowHint(!showHint)} 
                    className={`p-2 rounded-full transition-colors ${showHint ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20' : 'text-gray-400'}`}
                >
                    <Lightbulb size={24} />
                </button>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
                <div className="flex justify-between text-sm text-[var(--color-text-muted)] mb-1">
                    <span>Progress</span>
                    <span>{remainingWords} words remaining</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-[var(--color-primary)] transition-all duration-300"
                        style={{ width: `${((currentIndex) / words.length) * 100}%` }}
                    />
                </div>
            </div>

            {currentWord && (
                <div className="flex-1 flex flex-col items-center space-y-6">
                    {/* Word Display Area */}
                    <div className="w-full bg-[var(--color-bg-card)] rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm">
                        <div className="text-center space-y-4">
                            <div className="text-sm text-[var(--color-text-muted)] uppercase tracking-wider">
                                Translate to English
                            </div>
                            <h3 className="text-3xl font-bold text-[var(--color-primary)]">
                                {currentWord.translation}
                            </h3>
                            
                            {/* Hint button */}
                            <button 
                                onClick={() => setShowHint(!showHint)}
                                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] underline"
                            >
                                {showHint ? 'Hide hint' : 'Need a hint?'}
                            </button>
                            
                            {/* Hint display */}
                            {showHint && currentWord.association && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-sm"
                                >
                                    <span className="text-yellow-800 dark:text-yellow-200">
                                        💡 {currentWord.association}
                                    </span>
                                </motion.div>
                            )}
                            
                            {/* Word hints showing letters */}
                            {showHint && !currentWord.association && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg"
                                >
                                    <span className="text-yellow-800 dark:text-yellow-200">
                                        💡 First letter: <strong>{currentWord.term[0].toUpperCase()}</strong>
                                    </span>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Selected Letters */}
                    <div className="flex flex-wrap justify-center gap-2 min-h-[60px]">
                        {selectedLetters.map((letter) => (
                            <motion.button
                                layoutId={letter.id}
                                key={letter.id}
                                onClick={() => handleSelectedLetterClick(letter)}
                                className="w-12 h-12 bg-[var(--color-primary)] text-white rounded-xl font-bold text-xl shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                            >
                                {letter.char}
                            </motion.button>
                        ))}
                        {Array.from({ length: Math.max(0, currentWord.term.length - selectedLetters.length) }).map((_, i) => (
                            <div key={`empty-${i}`} className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700" />
                        ))}
                    </div>

                    {/* Scrambled Letters */}
                    <div className="flex flex-wrap justify-center gap-3 mt-4">
                        {scrambledLetters.map((letter) => (
                            <motion.button
                                layoutId={letter.id}
                                key={letter.id}
                                onClick={() => handleLetterClick(letter)}
                                className="w-14 h-14 bg-[var(--color-bg-card)] border-2 border-[var(--color-border)] rounded-xl font-bold text-2xl shadow-sm hover:scale-105 active:scale-95 transition-transform flex items-center justify-center text-[var(--color-text)]"
                            >
                                {letter.char}
                            </motion.button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {gameState === 'success' && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-20"
                            >
                                <div className="bg-green-500 text-white p-6 rounded-full shadow-2xl">
                                    <Check size={48} strokeWidth={4} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default WordBuilderPage;
