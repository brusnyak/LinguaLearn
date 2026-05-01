import React, { useState, useEffect, useCallback } from 'react';
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
    
    // All state at the top level
    const [words, setWords] = useState<Word[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [finished, setFinished] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [autoReadEnabled, setAutoReadEnabled] = useState(true);
    const [direction, setDirection] = useState(0);
    const [nativeLangCode, setNativeLangCode] = useState('uk-UA');
    const [targetLangCode, setTargetLangCode] = useState('en-US');

    // Load words on mount
    useEffect(() => {
        loadWords();
        loadSettings();
        const hasSeenTutorial = localStorage.getItem('flashcard-tutorial-seen');
        if (!hasSeenTutorial) {
            setShowTutorial(true);
        }
    }, []);

    const loadWords = async () => {
        try {
            const allWords = await db.getWords();
            const sortedWords = allWords.sort((a, b) => {
                if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
                return a.lastReviewed - b.lastReviewed;
            });
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

    const loadSettings = async () => {
        try {
            const settings = await db.getSettings();
            if (settings && settings.autoReadFlashcards !== undefined) {
                setAutoReadEnabled(settings.autoReadFlashcards);
            }
            if (settings?.profile?.nativeLanguage) {
                const langMap: Record<string, string> = {
                    'Ukrainian': 'uk-UA',
                    'English': 'en-US',
                    'Spanish': 'es-ES',
                    'French': 'fr-FR',
                    'German': 'de-DE',
                };
                setNativeLangCode(langMap[settings.profile.nativeLanguage] || 'uk-UA');
                setTargetLangCode(langMap[settings.profile.targetLanguage] || 'en-US');
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const currentWord = words[currentIndex];

    // Auto-read card when it appears
    useEffect(() => {
        if (autoReadEnabled && currentWord && !isFlipped && !loading && !finished) {
            const timer = setTimeout(() => {
                speak(currentWord.term, targetLangCode);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, autoReadEnabled, isFlipped, loading, finished, currentWord, speak]);

    // Auto-read translation when card flips
    useEffect(() => {
        if (autoReadEnabled && currentWord && isFlipped && !loading && !finished) {
            const timer = setTimeout(() => {
                speak(currentWord.translation, nativeLangCode);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isFlipped, autoReadEnabled, currentWord, speak, loading, finished]);

    const handleNext = useCallback(async (known: boolean) => {
        if (!currentWord) return;
        
        play(known ? 'success' : 'error');
        setDirection(known ? 1 : -1);

        const newMastery = known
            ? Math.min(5, currentWord.masteryLevel + 1)
            : Math.max(0, currentWord.masteryLevel - 1);

        const newTimesCorrect = known
            ? (currentWord.timesCorrect || 0) + 1
            : 0;

        const isMastered = newTimesCorrect >= 2;

        const updatedWord: Word = {
            ...currentWord,
            masteryLevel: newMastery,
            lastReviewed: Date.now(),
            timesCorrect: newTimesCorrect,
            isMastered
        };

        try {
            await db.addWord(updatedWord);

            if (!currentWord.isMastered && isMastered) {
                play('levelUp');
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
    }, [currentWord, currentIndex, words.length, play]);

    // Swipe handler
    const handleSwipe = useCallback((swipeDirection: number) => {
        if (swipeDirection > 100) {
            handleNext(true); // right - known
        } else if (swipeDirection < -100) {
            handleNext(false); // left - forgot
        }
    }, [handleNext]);

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

    return (
        <div className="max-w-md mx-auto h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => navigate('/games')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ArrowLeft />
                </button>
                <div className="font-bold text-lg">Card {currentIndex + 1} / {words.length}</div>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center perspective-1000 relative w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        drag="x"
                        dragElastic={0.2}
                        onDragEnd={(_, info) => handleSwipe(info.offset.x)}
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction * 300, opacity: 0, transition: { duration: 0.2 } }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full aspect-[3/4] max-h-[400px] cursor-grab active:cursor-grabbing group"
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        <motion.div
                            className="w-full h-full relative [transform-style:preserve-3d] transition-transform duration-500"
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                        >
                            {/* Front */}
                            <div className="absolute inset-0 [backface-visibility:hidden] bg-[var(--color-bg-card)] rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 border-2 border-transparent group-hover:border-[var(--color-primary)] transition-colors">
                                <button
                                    onClick={(e) => { e.stopPropagation(); speak(currentWord.term, targetLangCode); }}
                                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                >
                                    <Volume2 size={24} />
                                </button>
                                <span className="text-sm uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Term</span>
                                <h2 className="text-4xl font-bold text-center">{currentWord.term}</h2>
                                <div className="absolute bottom-6 text-[var(--color-text-muted)] flex items-center gap-2 text-sm">
                                    <RotateCw size={16} /> Tap to flip • Swipe to answer
                                </div>
                            </div>

                            {/* Back */}
                            <div className="absolute inset-0 [backface-visibility:hidden] bg-[var(--color-primary)] text-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 [transform:rotateY(180deg)]">
                                <button
                                    onClick={(e) => { e.stopPropagation(); speak(currentWord.translation, nativeLangCode); }}
                                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
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

            <AnimatePresence>
                {showTutorial && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[var(--color-bg-card)] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <h3 className="text-2xl font-bold mb-4">How to Play</h3>
                            <div className="space-y-4 text-[var(--color-text-muted)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">👉</div>
                                    <span>Swipe <strong className="text-green-600 dark:text-green-400">right</strong> if you know</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400">👈</div>
                                    <span>Swipe <strong className="text-red-600 dark:text-red-400">left</strong> if you forgot</span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowTutorial(false);
                                    localStorage.setItem('flashcard-tutorial-seen', 'true');
                                }}
                                className="w-full mt-6 btn btn-primary"
                            >
                                Got it!
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FlashcardGamePage;
