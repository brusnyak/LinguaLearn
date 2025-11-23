import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCw, Check, X, Volume2 } from 'lucide-react';
import { db } from '../services/db';
import type { Word } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTTS } from '../hooks/useTTS';
import { useSound } from '../hooks/useSound';

const FlashcardGamePage: React.FC = () => {
    const navigate = useNavigate();
    const { speak } = useTTS();
    const { play } = useSound();
    const [words, setWords] = useState<Word[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        loadWords();
    }, []);

    const loadWords = async () => {
        try {
            const allWords = await db.getWords();
            // Simple algorithm: Sort by mastery level (ascending) and then last reviewed (ascending)
            // This prioritizes words you don't know or haven't seen in a while.
            const sortedWords = allWords.sort((a, b) => {
                if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
                return a.lastReviewed - b.lastReviewed;
            });

            // Take top 10 for this session
            const sessionWords = sortedWords.slice(0, 10);

            if (sessionWords.length === 0) {
                alert("No words to review! Add some words first.");
                navigate('/dictionary');
                return;
            }

            setWords(sessionWords);
        } catch (error) {
            console.error("Failed to load words", error);
        } finally {
            setLoading(false);
        }
    };

    const [direction, setDirection] = useState(0);

    const handleNext = async (known: boolean) => {
        play(known ? 'success' : 'error');
        setDirection(known ? 1 : -1);
        const currentWord = words[currentIndex];

        // Update mastery
        const newMastery = known
            ? Math.min(5, currentWord.masteryLevel + 1)
            : Math.max(0, currentWord.masteryLevel - 1);

        // Track consecutive correct answers
        const newTimesCorrect = known
            ? (currentWord.timesCorrect || 0) + 1
            : 0; // Reset on wrong answer

        // Mark as mastered if 2 consecutive correct
        const isMastered = newTimesCorrect >= 2;

        const updatedWord: Word = {
            ...currentWord,
            masteryLevel: newMastery,
            lastReviewed: Date.now(),
            timesCorrect: newTimesCorrect,
            isMastered
        };

        try {
            await db.addWord(updatedWord); // This updates existing word because ID matches

            // Show special feedback for mastered words
            if (!currentWord.isMastered && isMastered) {
                play('levelUp'); // Special sound for mastery!
            }
        } catch (error) {
            console.error("Failed to update word", error);
        }

        setIsFlipped(false);

        if (currentIndex < words.length - 1) {
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setDirection(0);
            }, 200);
        } else {
            setFinished(true);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Cards...</div>;

    if (finished) {
        return (
            <div className="max-w-md mx-auto h-[calc(100vh-100px)] flex flex-col items-center justify-center space-y-6">
                <h2 className="text-3xl font-bold">Session Complete!</h2>
                <p className="text-[var(--color-text-muted)]">You reviewed {words.length} words.</p>
                <button onClick={() => navigate('/games')} className="btn btn-primary">Back to Games</button>
                <button onClick={() => { setFinished(false); setCurrentIndex(0); loadWords(); }} className="btn btn-secondary">Review Again</button>
            </div>
        );
    }

    const currentWord = words[currentIndex];

    return (
        <div className="max-w-md mx-auto h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => navigate('/games')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ArrowLeft />
                </button>
                <div className="font-bold text-lg">Card {currentIndex + 1} / {words.length}</div>
                <div className="w-8"></div>
            </div>

            {/* Card Area */}
            <div className="flex-1 flex flex-col items-center justify-center perspective-1000 relative w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction * 500, opacity: 0, rotate: direction * 20 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="relative w-full aspect-[3/4] max-h-[400px] cursor-pointer group"
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        <motion.div
                            className="w-full h-full relative [transform-style:preserve-3d] transition-transform duration-500"
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                        >
                            {/* Front */}
                            <div className="absolute inset-0 [backface-visibility:hidden] bg-[var(--color-bg-card)] rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 border-2 border-transparent group-hover:border-[var(--color-primary)] transition-colors">
                                <button
                                    onClick={(e) => { e.stopPropagation(); speak(currentWord.term, 'en-US'); }}
                                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                    title="Listen"
                                >
                                    <Volume2 size={24} />
                                </button>
                                <span className="text-sm uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Term</span>
                                <h2 className="text-4xl font-bold text-center">{currentWord.term}</h2>
                                <div className="absolute bottom-6 text-[var(--color-text-muted)] flex items-center gap-2 text-sm">
                                    <RotateCw size={16} /> Tap to flip
                                </div>
                            </div>

                            {/* Back */}
                            <div
                                className="absolute inset-0 [backface-visibility:hidden] bg-[var(--color-primary)] text-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 [transform:rotateY(180deg)]"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); speak(currentWord.translation, 'uk-UA'); }}
                                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                                    title="Listen"
                                >
                                    <Volume2 size={24} />
                                </button>
                                <span className="text-sm uppercase tracking-widest opacity-70 mb-4">Translation</span>
                                <h2 className="text-4xl font-bold text-center">{currentWord.translation}</h2>
                                {currentWord.phonetic && <p className="mt-4 opacity-80 font-mono">{currentWord.phonetic}</p>}
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="mt-8 h-16">
                {!isFlipped ? (
                    <button
                        onClick={() => setIsFlipped(true)}
                        className="w-full h-full rounded-xl bg-[var(--color-primary)] text-white font-bold text-lg shadow-lg hover:bg-[var(--color-primary-dark)] transition-colors flex items-center justify-center gap-2"
                    >
                        <RotateCw size={20} /> Show Answer
                    </button>
                ) : (
                    <div className="grid grid-cols-2 gap-4 h-full">
                        <button
                            onClick={() => handleNext(false)}
                            className="rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-bold flex items-center justify-center gap-2 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shadow-sm"
                        >
                            <X size={20} /> Forgot
                        </button>
                        <button
                            onClick={() => handleNext(true)}
                            className="rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 font-bold flex items-center justify-center gap-2 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors shadow-sm"
                        >
                            <Check size={20} /> Got it
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FlashcardGamePage;
