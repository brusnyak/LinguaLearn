import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Bot, Volume2, Check, X } from 'lucide-react';
import { db } from '../services/db';
import { translateText } from '../services/openrouter';
import type { Word } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTTS } from '../hooks/useTTS';
import { useSound } from '../hooks/useSound';
import { useToast } from '../context/ToastContext';

// Real-world scenarios for practice
const SCENARIOS = [
    {
        id: 'restaurant',
        icon: '🍽️',
        title: 'Restaurant',
        prompt: (word: string) => `You're at a restaurant. Ask for "${word}" in English. How would you say it?`
    },
    {
        id: 'hotel',
        icon: '🏨',
        title: 'Hotel',
        prompt: (word: string) => `You need help at a hotel reception. Ask for "${word}". How would you say it?`
    },
    {
        id: 'shopping',
        icon: '🛍️',
        title: 'Shopping',
        prompt: (word: string) => `You're at a store asking about "${word}". How would you ask?`
    },
    {
        id: 'directions',
        icon: '🚶',
        title: 'Directions',
        prompt: (word: string) => `You need to ask for directions to "${word}". How would you ask?`
    },
    {
        id: 'emergency',
        icon: '🚑',
        title: 'Emergency',
        prompt: (word: string) => `You need urgent help. Explain you need "${word}". How would you say it?`
    },
    {
        id: 'greeting',
        icon: '👋',
        title: 'Meeting Someone',
        prompt: (word: string) => `You're meeting someone new. Say "${word}" to greet them.`
    },
];

const RealWorldPracticePage: React.FC = () => {
    const navigate = useNavigate();
    const { speak } = useTTS();
    const { play } = useSound();
    const { showToast } = useToast();
    
    const [words, setWords] = useState<Word[]>([]);
    const [currentWord, setCurrentWord] = useState<Word | null>(null);
    const [currentScenario, setCurrentScenario] = useState<typeof SCENARIOS[0] | null>(null);
    const [userInput, setUserInput] = useState('');
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'checking' | 'correct' | 'wrong' | 'complete'>('loading');
    const [aiHint, setAiHint] = useState<string | null>(null);
    const [loadingHint, setLoadingHint] = useState(false);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nativeLangCode, setNativeLangCode] = useState('uk-UA');
    const [targetLangCode, setTargetLangCode] = useState('en-US');

    const loadWords = useCallback(async () => {
        setGameState('loading');
        try {
            const allWords = await db.getWords();
            const validWords = allWords.filter(w => w.term.length >= 2);

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
                setNativeLangCode(langMap[settings.profile.nativeLanguage] || 'uk-UA');
                setTargetLangCode(langMap[settings.profile.targetLanguage] || 'en-US');
            }

            const shuffled = validWords.sort(() => 0.5 - Math.random()).slice(0, 5);
            setWords(shuffled);

            const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
            setCurrentScenario(scenario);
            setCurrentWord(shuffled[0]);
            setGameState('playing');
        } catch (error) {
            console.error('Failed to load words', error);
        }
    }, [navigate, showToast]);

    useEffect(() => {
        loadWords();
    }, [loadWords]);

    const getAiHint = async () => {
        if (!currentWord) return;

        setLoadingHint(true);
        setAiHint(null);

        try {
            const hint = await translateText(currentWord.term, 'English', nativeLangCode.split('-')[0]);
            setAiHint(hint);
        } catch (error) {
            console.error('Failed to get hint:', error);
            showToast('Failed to get hint. Try again.', 'error');
        } finally {
            setLoadingHint(false);
        }
    };

    const handleSubmit = async () => {
        if (!userInput.trim() || !currentWord || gameState === 'checking') return;

        setGameState('checking');
        setScore(prev => ({ ...prev, total: prev.total + 1 }));

        // Simple check - does user input contain letters from the word
        const inputLower = userInput.toLowerCase().trim();
        const wordLower = currentWord.term.toLowerCase();
        
        const isCorrect = inputLower.includes(wordLower) || wordLower.includes(inputLower);
        
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

    const nextWord = () => {
        const nextIdx = currentIndex + 1;
        
        if (nextIdx >= words.length) {
            setGameState('complete');
            return;
        }

        setCurrentWord(words[nextIdx]);
        setCurrentIndex(nextIdx);
        setUserInput('');
        setAiHint(null);
        setGameState('playing');
        
        // New random scenario
        const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
        setCurrentScenario(scenario);
    };

    const handleSpeak = () => {
        if (currentWord) {
            speak(currentWord.term, targetLangCode);
        }
    };

    if (gameState === 'loading') {
        return (
            <div className="max-w-md mx-auto h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Loading practice...</p>
                </div>
            </div>
        );
    }

    if (gameState === 'complete') {
        return (
            <div className="max-w-md mx-auto h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-3xl font-bold mb-2">Practice Complete!</h2>
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

    if (!currentWord || !currentScenario) return null;

    const isWrong = gameState === 'wrong';

    return (
        <div className="max-w-md mx-auto h-screen flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4">
                <button onClick={() => navigate('/games')} className="p-2 rounded-full hover:bg-[var(--color-bg-card)]">
                    <ArrowLeft />
                </button>
                <div className="font-bold text-lg">
                    Real World Practice
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

            {/* Scenario Card */}
            <div className="mx-4 mb-6">
                <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-2">{currentScenario.icon}</div>
                    <div className="text-lg font-bold mb-1">{currentScenario.title}</div>
                    <div className="text-sm text-[var(--color-text-muted)]">
                        {currentScenario.prompt(currentWord.term)}
                    </div>
                </div>
            </div>

            {/* Word to Practice */}
            <div className="mx-4 mb-4">
                <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] rounded-xl p-4 flex items-center justify-between">
                    <div className="text-white">
                        <div className="text-xs opacity-70 uppercase">Your Target Word</div>
                        <div className="text-2xl font-bold">{currentWord.translation}</div>
                    </div>
                    <button 
                        onClick={handleSpeak}
                        className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    >
                        <Volume2 className="text-white" />
                    </button>
                </div>
            </div>

            {/* Input */}
            <div className="flex-1 px-4">
                <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type what you would say in English..."
                    disabled={gameState === 'checking'}
                    className={`w-full h-32 p-4 rounded-xl border-2 bg-[var(--color-bg-card)] resize-none text-lg ${
                        isWrong ? 'border-red-500' : 'border-transparent focus:border-[var(--color-primary)]'
                    } outline-none`}
                />
            </div>

            {/* Hint Section */}
            <div className="px-4 mb-4">
                {!aiHint && !loadingHint && (
                    <button
                        onClick={getAiHint}
                        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] underline"
                    >
                        <Bot size={14} className="inline mr-1" />
                        Get translation hint
                    </button>
                )}
                
                {loadingHint && (
                    <div className="text-sm text-gray-400">
                        <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full inline mr-2"></div>
                        Getting hint...
                    </div>
                )}
                
                {aiHint && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-sm"
                    >
                        <span className="text-yellow-800 dark:text-yellow-200">💡 {aiHint}</span>
                    </motion.div>
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
                                ? 'Great job!' 
                                : `The correct answer: ${currentWord?.term}`
                            }
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit Button */}
            <div className="p-4">
                <button
                    onClick={handleSubmit}
                    disabled={!userInput.trim() || gameState === 'checking'}
                    className="w-full py-4 bg-[var(--color-primary)] text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Send size={20} />
                    Check Answer
                </button>
            </div>
        </div>
    );
};

export default RealWorldPracticePage;
