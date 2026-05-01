import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Check, X, RotateCcw } from 'lucide-react';
import { db } from '../services/db';
import type { Word } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTTS } from '../hooks/useTTS';
import { useSound } from '../hooks/useSound';
import { useToast } from '../context/ToastContext';

const ListeningChallengePage: React.FC = () => {
    const navigate = useNavigate();
    const { speak, cancel } = useTTS();
    const { play } = useSound();
    const { showToast } = useToast();
    
    const [words, setWords] = useState<Word[]>([]);
    const [currentWord, setCurrentWord] = useState<Word | null>(null);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'checking' | 'correct' | 'wrong' | 'complete'>('loading');
    const [userInput, setUserInput] = useState('');
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [targetLangCode, setTargetLangCode] = useState('en-US');
    const [replayCount, setReplayCount] = useState(0);
    const [showHint, setShowHint] = useState(false);

    const loadWords = useCallback(async () => {
        setGameState('loading');
        try {
            const allWords = await db.getWords();
            const validWords = allWords.filter(w => w.term.length >= 2 && w.term.length <= 12);

            if (validWords.length < 3) {
                showToast('Need at least 3 words for practice!', 'error');
                navigate('/games');
                return;
            }

            // Load language settings
            const settings = await db.getSettings();
            if (settings?.profile) {
                const langMap: Record<string, string> = {
                    'Ukrainian': 'uk-UA', 'English': 'en-US', 'Spanish': 'es-ES',
                    'French': 'fr-FR', 'German': 'de-DE',
                };
                setTargetLangCode(langMap[settings.profile.targetLanguage] || 'en-US');
            }

            const shuffled = validWords.sort(() => 0.5 - Math.random()).slice(0, 8);
            setWords(shuffled);
            setCurrentWord(shuffled[0]);
            setGameState('playing');
        } catch (error) {
            console.error('Failed to load words', error);
        }
    }, [navigate, showToast]);

    useEffect(() => {
        loadWords();
    }, [loadWords]);

    const handlePlayAudio = () => {
        if (!currentWord) return;

        if (isPlaying) {
            cancel();
            setIsPlaying(false);
            return;
        }

        setIsPlaying(true);
        speak(currentWord.term, targetLangCode);
        setIsPlaying(false);
    };

    const handleSubmit = () => {
        if (!userInput.trim() || !currentWord || gameState === 'checking') return;

        setGameState('checking');
        setScore(prev => ({ ...prev, total: prev.total + 1 }));

        const inputLower = userInput.toLowerCase().trim();
        const correctLower = currentWord.term.toLowerCase();
        
        // Check for exact match or very close match
        const isExactMatch = inputLower === correctLower;
        const isCloseMatch = calculateSimilarity(inputLower, correctLower) >= 0.8;
        
        const isCorrect = isExactMatch || isCloseMatch;
        
        if (isCorrect) {
            play('success');
            setGameState('correct');
            setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
            
            setTimeout(() => {
                nextWord();
            }, 1500);
        } else {
            play('error');
            setGameState('wrong');
            
            setTimeout(() => {
                nextWord();
            }, 2000);
        }
    };

    const calculateSimilarity = (str1: string, str2: string): number => {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const editDistance = levenshteinDistance(shorter, longer);
        return (longer.length - editDistance) / longer.length;
    };

    const levenshteinDistance = (str1: string, str2: string): number => {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    };

    const nextWord = () => {
        const nextIdx = currentIndex + 1;
        
        if (nextIdx >= words.length) {
            setGameState('complete');
            return;
        }

        setCurrentWord(words[nextIdx]);
        setCurrentIndex(nextIdx);
        setUserInput('');
        setShowHint(false);
        setReplayCount(0);
        setGameState('playing');
        setIsPlaying(false);
    };

    const handleReplay = () => {
        setReplayCount(prev => prev + 1);
        handlePlayAudio();
    };

    if (gameState === 'loading') {
        return (
            <div className="max-w-md mx-auto h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Loading challenge...</p>
                </div>
            </div>
        );
    }

    if (gameState === 'complete') {
        return (
            <div className="max-w-md mx-auto h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="text-6xl mb-4">🎧</div>
                <h2 className="text-3xl font-bold mb-2">Challenge Complete!</h2>
                <p className="text-[var(--color-text-muted)] mb-6">
                    Score: {score.correct}/{score.total} correct
                </p>
                
                <div className="bg-[var(--color-bg-card)] rounded-xl p-6 w-full mb-6">
                    <div className="text-sm text-[var(--color-text-muted)]">Accuracy</div>
                    <div className="text-2xl font-bold text-[var(--color-primary)]">
                        {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
                    </div>
                </div>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={() => navigate('/games')}
                        className="flex-1 py-3 border rounded-lg font-bold"
                    >
                        Back to Games
                    </button>
                    <button
                        onClick={() => {
                            setScore({ correct: 0, total: 0 });
                            setCurrentIndex(0);
                            loadWords();
                        }}
                        className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-lg font-bold"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!currentWord) return null;

    const isWrong = gameState === 'wrong';

    return (
        <div className="max-w-md mx-auto h-screen flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4">
                <button onClick={() => navigate('/games')} className="p-2 rounded-full hover:bg-[var(--color-bg-card)]">
                    <ArrowLeft />
                </button>
                <div className="font-bold text-lg">
                    Listening Challenge
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">
                    {currentIndex + 1}/{words.length}
                </div>
            </div>

            {/* Score */}
            <div className="px-4 mb-4">
                <div className="flex justify-between text-sm">
                    <span className="text-green-500">✓ {score.correct}</span>
                    <span className="text-red-500">✗ {score.total - score.correct}</span>
                </div>
            </div>

            {/* Audio Player */}
            <div className="mx-4 mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-center">
                    <div className="text-white mb-6">
                        <div className="text-sm opacity-70 uppercase mb-2">Listen carefully</div>
                        <div className="text-lg font-medium">Type what you hear</div>
                    </div>
                    
                    <button
                        onClick={handlePlayAudio}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                            isPlaying 
                                ? 'bg-white/30 hover:bg-white/40' 
                                : 'bg-white/20 hover:bg-white/30'
                        }`}
                    >
                        {isPlaying ? <Pause size={32} className="text-white" /> : <Play size={32} className="text-white" />}
                    </button>
                    
                    <div className="text-white text-sm mt-4 opacity-70">
                        {replayCount === 0 ? 'First play' : `Replay ${replayCount}/3`}
                    </div>
                </div>
            </div>

            {/* Input */}
            <div className="flex-1 px-4">
                <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type the word you heard..."
                    disabled={gameState === 'checking'}
                    className={`w-full h-32 p-4 rounded-xl border-2 bg-[var(--color-bg-card)] resize-none text-lg ${
                        isWrong ? 'border-red-500' : 'border-transparent focus:border-[var(--color-primary)]'
                    } outline-none`}
                />
            </div>

            {/* Hint Section */}
            <div className="px-4 mb-4">
                {!showHint && replayCount >= 2 && (
                    <button
                        onClick={() => setShowHint(true)}
                        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] underline"
                    >
                        Show hint
                    </button>
                )}
                
                {showHint && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-sm">
                        <span className="text-yellow-800 dark:text-yellow-200">
                            💡 Length: {currentWord.term.length} letters, starts with "{currentWord.term[0].toUpperCase()}"
                        </span>
                    </div>
                )}
            </div>

            {/* Result Feedback */}
            <AnimatePresence>
                {(gameState === 'correct' || gameState === 'wrong') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`mx-4 mb-4 p-4 rounded-xl flex items-center gap-2 ${
                            gameState === 'correct' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}
                    >
                        {gameState === 'correct' ? <Check size={20} /> : <X size={20} />}
                        <span className="font-bold">
                            {gameState === 'correct' 
                                ? 'Perfect!' 
                                : `Correct: ${currentWord.term}`
                            }
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="p-4 space-y-3">
                <button
                    onClick={handleSubmit}
                    disabled={!userInput.trim() || gameState === 'checking'}
                    className="w-full py-4 bg-[var(--color-primary)] text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    Check Answer
                </button>
                
                <button
                    onClick={handleReplay}
                    disabled={replayCount >= 3 || isPlaying}
                    className="w-full py-3 border rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <RotateCcw size={16} />
                    Replay Audio ({replayCount}/3)
                </button>
            </div>
        </div>
    );
};

export default ListeningChallengePage;
