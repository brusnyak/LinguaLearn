import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Volume2, Check, X, Lightbulb, Target } from 'lucide-react';
import { db } from '../services/db';
import { translateText, generateScenarioWords, generatePracticePhrase } from '../services/openrouter';
import type { Word } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTTS } from '../hooks/useTTS';
import { useSound } from '../hooks/useSound';
import { useToast } from '../context/ToastContext';

// Enhanced scenarios with better structure and difficulty levels
const SCENARIOS = [
    {
        id: 'restaurant',
        icon: '🍽️',
        title: 'Restaurant',
        description: 'Order food and ask for help',
        difficulty: 'beginner' as const,
        context: 'You are at a restaurant and need to communicate with the staff.'
    },
    {
        id: 'hotel',
        icon: '🏨',
        title: 'Hotel',
        description: 'Check-in and room requests',
        difficulty: 'beginner' as const,
        context: 'You are at a hotel reception and need help with your stay.'
    },
    {
        id: 'shopping',
        icon: '🛍️',
        title: 'Shopping',
        description: 'Buy items and ask about products',
        difficulty: 'intermediate' as const,
        context: 'You are shopping and need to find or purchase items.'
    },
    {
        id: 'directions',
        icon: '🚶',
        title: 'Directions',
        description: 'Ask for help finding places',
        difficulty: 'intermediate' as const,
        context: 'You are lost and need to ask for directions.'
    },
    {
        id: 'emergency',
        icon: '🚑',
        title: 'Emergency',
        description: 'Get help in urgent situations',
        difficulty: 'advanced' as const,
        context: 'You need urgent help and must communicate quickly.'
    },
    {
        id: 'greeting',
        icon: '👋',
        title: 'Social',
        description: 'Meet people and have conversations',
        difficulty: 'beginner' as const,
        context: 'You are meeting new people and want to be friendly.'
    }
];

type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type GameState = 'menu' | 'playing' | 'checking' | 'correct' | 'wrong' | 'complete';

const RealWorldPracticePage: React.FC = () => {
    const navigate = useNavigate();
    const { speak } = useTTS();
    const { play } = useSound();
    const { showToast } = useToast();
    
    const [words, setWords] = useState<Word[]>([]);
    const [currentWord, setCurrentWord] = useState<Word | null>(null);
    const [currentScenario, setCurrentScenario] = useState<typeof SCENARIOS[0] | null>(null);
    const [userInput, setUserInput] = useState('');
    const [gameState, setGameState] = useState<GameState>('menu');
    const [aiHint, setAiHint] = useState<string | null>(null);
    const [loadingHint, setLoadingHint] = useState(false);
    const [targetPhrase, setTargetPhrase] = useState<string>('');
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('beginner');
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [nativeLangCode, setNativeLangCode] = useState('uk-UA');
    const [targetLangCode, setTargetLangCode] = useState('en-US');
    const [showHint, setShowHint] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [maxAttempts] = useState(3);

    const getWordsForScenario = useCallback(async (allWords: Word[], scenario: typeof SCENARIOS[0], difficulty: Difficulty) => {
        try {
            // Extract user vocabulary terms
            const userWords = allWords.map(w => w.term);
            
            // Use AI to select scenario-appropriate words
            const selectedWords = await generateScenarioWords(userWords, scenario.id, difficulty);
            
            // Find matching Word objects and filter for quality
            const scenarioWords = allWords.filter(word => 
                selectedWords.includes(word.term) &&
                word.term.length >= 3 && 
                word.term.length <= 12 &&
                /^[a-z]+$/.test(word.term)
            );

            // If AI doesn't return enough words, use fallback filtering
            if (scenarioWords.length < 5) {
                const fallbackWords = allWords
                    .filter(w => w.term.length >= 3 && w.term.length <= 10)
                    .filter(w => !w.term.includes('citation') && !w.term.includes('complex'))
                    .filter(w => /^[a-z]+$/.test(w.term))
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 8);
                
                return fallbackWords;
            }

            return scenarioWords.slice(0, 8);
        } catch (error) {
            console.error('Error getting scenario words:', error);
            // Fallback to basic filtering
            return allWords
                .filter(w => w.term.length >= 3 && w.term.length <= 10)
                .filter(w => !w.term.includes('citation') && !w.term.includes('complex'))
                .filter(w => /^[a-z]+$/.test(w.term))
                .sort(() => 0.5 - Math.random())
                .slice(0, 8);
        }
    }, []);

    const startGame = useCallback(async (difficulty: Difficulty) => {
        setGameState('playing');
        setSelectedDifficulty(difficulty);
        setScore({ correct: 0, total: 0 });
        setCurrentIndex(0);
        setStreak(0);
        setAttempts(0);
        
        try {
            const allWords = await db.getWords();
            const validWords = allWords.filter(w => w.term.length >= 2);

            if (validWords.length < 3) {
                showToast('Need at least 3 words for practice!', 'error');
                setGameState('menu');
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

            // Select scenario based on difficulty
            const availableScenarios = SCENARIOS.filter(s => s.difficulty === difficulty);
            const scenario = availableScenarios[Math.floor(Math.random() * availableScenarios.length)];
            const selectedWords = await getWordsForScenario(validWords, scenario, difficulty);
            
            setWords(selectedWords);
            setCurrentScenario(scenario);
            setCurrentWord(selectedWords[0]);
            
            // Generate target phrase for the first word
            generateTargetPhrase(scenario, selectedWords[0]);
        } catch (error) {
            console.error('Failed to start game:', error);
            showToast('Failed to start game. Please try again.', 'error');
            setGameState('menu');
        }
    }, [showToast, selectedDifficulty]);

    const generateTargetPhrase = useCallback(async (scenario: typeof SCENARIOS[0], word: Word) => {
        if (!scenario || !word) return;

        try {
            // Use AI to generate a natural phrase for the scenario and word
            const phrase = await generatePracticePhrase(word.term, scenario.id, selectedDifficulty);
            setTargetPhrase(phrase);
        } catch (error) {
            console.error('Error generating phrase:', error);
            // Fallback to simple template
            const fallbackPhrase = `Can you help me with the ${word.term}?`;
            setTargetPhrase(fallbackPhrase);
        }
    }, [selectedDifficulty]);

    const getAiHint = async () => {
        if (!currentWord) return;

        setLoadingHint(true);
        setAiHint(null);

        try {
            const hint = await translateText(currentWord.term, 'English', nativeLangCode.split('-')[0]);
            setAiHint(hint);
            setShowHint(true);
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
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setScore(prev => ({ ...prev, total: prev.total + 1 }));

        const inputLower = userInput.toLowerCase().trim();
        const targetLower = targetPhrase.toLowerCase().trim();
        const wordLower = currentWord.term.toLowerCase();
        
        // Enhanced checking logic
        const hasTargetWord = inputLower.includes(wordLower);
        const phraseSimilarity = calculateSimilarity(inputLower, targetLower);
        
        // Stricter checking with attempt consideration
        const similarityThreshold = newAttempts === 1 ? 0.7 : newAttempts === 2 ? 0.5 : 0.3;
        const isCorrect = hasTargetWord && phraseSimilarity >= similarityThreshold;
        
        if (isCorrect) {
            play('success');
            setGameState('correct');
            setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
            setStreak(prev => {
                const newStreak = prev + 1;
                setBestStreak(current => Math.max(current, newStreak));
                return newStreak;
            });
            
            setTimeout(async () => {
                await nextWord();
            }, 2000);
        } else {
            play('error');
            setGameState('wrong');
            
            if (newAttempts >= maxAttempts) {
                setTimeout(async () => {
                    await nextWord();
                }, 3000);
            } else {
                setTimeout(() => {
                    setGameState('playing');
                    setUserInput('');
                }, 2000);
            }
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

    const nextWord = useCallback(async () => {
        const nextIdx = currentIndex + 1;
        
        if (nextIdx >= words.length) {
            setGameState('complete');
            return;
        }

        const nextWord = words[nextIdx];
        setCurrentWord(nextWord);
        setCurrentIndex(nextIdx);
        setUserInput('');
        setAiHint(null);
        setShowHint(false);
        setTargetPhrase('');
        setAttempts(0);
        setGameState('playing');
        
        // Generate target phrase for the new word
        if (currentScenario) {
            await generateTargetPhrase(currentScenario, nextWord);
        }
    }, [currentIndex, words, currentScenario, generateTargetPhrase]);

    const handleSpeak = () => {
        if (currentWord) {
            speak(currentWord.term, targetLangCode);
        }
    };

    if (gameState === 'menu') {
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
                    <div className="w-10"></div>
                </div>

                {/* Content */}
                <div className="flex-1 px-4 py-8">
                    <div className="text-center mb-8">
                        <div className="text-6xl mb-4">🌍</div>
                        <h2 className="text-2xl font-bold mb-2">Real World Practice</h2>
                        <p className="text-[var(--color-text-muted)]">
                            Practice English in real-life situations
                        </p>
                    </div>

                    {/* Difficulty Selection */}
                    <div className="space-y-4 mb-8">
                        <h3 className="font-bold text-lg">Choose Difficulty:</h3>
                        
                        <button
                            onClick={() => startGame('beginner')}
                            className="w-full p-4 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <span>🌱 Beginner</span>
                                <span className="text-sm opacity-80">Restaurant, Hotel, Social</span>
                            </div>
                        </button>

                        <button
                            onClick={() => startGame('intermediate')}
                            className="w-full p-4 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <span>🌿 Intermediate</span>
                                <span className="text-sm opacity-80">Shopping, Directions</span>
                            </div>
                        </button>

                        <button
                            onClick={() => startGame('advanced')}
                            className="w-full p-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <span>🔥 Advanced</span>
                                <span className="text-sm opacity-80">Emergency Situations</span>
                            </div>
                        </button>
                    </div>

                    {/* Best Streak */}
                    {bestStreak > 0 && (
                        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 text-center">
                            <div className="text-sm text-[var(--color-text-muted)]">Best Streak</div>
                            <div className="text-2xl font-bold text-[var(--color-primary)]">🔥 {bestStreak}</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (gameState === 'complete') {
        const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
        
        return (
            <div className="max-w-md mx-auto h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-3xl font-bold mb-2">Practice Complete!</h2>
                <p className="text-[var(--color-text-muted)] mb-6">
                    Score: {score.correct}/{score.total} correct
                </p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-6">
                    <div className="bg-[var(--color-bg-card)] rounded-xl p-4">
                        <div className="text-sm text-[var(--color-text-muted)]">Accuracy</div>
                        <div className="text-2xl font-bold text-[var(--color-primary)]">{accuracy}%</div>
                    </div>
                    <div className="bg-[var(--color-bg-card)] rounded-xl p-4">
                        <div className="text-sm text-[var(--color-text-muted)]">Best Streak</div>
                        <div className="text-2xl font-bold text-orange-500">🔥 {bestStreak}</div>
                    </div>
                </div>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={() => setGameState('menu')}
                        className="flex-1 py-3 border rounded-lg font-bold"
                    >
                        Menu
                    </button>
                    <button
                        onClick={() => startGame(selectedDifficulty)}
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
    const attemptsLeft = maxAttempts - attempts;

    return (
        <div className="max-w-md mx-auto h-screen flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4">
                <button onClick={() => setGameState('menu')} className="p-2 rounded-full hover:bg-[var(--color-bg-card)]">
                    <ArrowLeft />
                </button>
                <div className="font-bold text-lg">
                    {currentScenario.title}
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">
                    {currentIndex + 1}/{words.length}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="px-4 mb-4">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-green-500">✓ {score.correct}</span>
                    <span className="text-orange-500">🔥 {streak}</span>
                    <span className="text-red-500">✗ {score.total - score.correct}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Scenario Card */}
            <div className="mx-4 mb-6">
                <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-2">{currentScenario.icon}</div>
                    <div className="text-lg font-bold mb-1">{currentScenario.title}</div>
                    <div className="text-sm text-[var(--color-text-muted)] mb-3">
                        {currentScenario.context}
                    </div>
                    <div className="bg-[var(--color-bg)] rounded-lg p-3 text-sm">
                        <Target className="inline mr-2 text-[var(--color-primary)]" size={16} />
                        How would you communicate about "{currentWord.term}"?
                    </div>
                </div>
            </div>

            {/* Target Phrase */}
            <div className="mx-4 mb-4">
                <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] rounded-xl p-4">
                    <div className="text-white mb-2">
                        <div className="text-xs opacity-70 uppercase">Practice Phrase</div>
                        <div className="text-lg font-bold">{targetPhrase || 'Get ready...'}</div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-white text-sm opacity-90">
                            Target word: <span className="font-bold">{currentWord.term}</span>
                        </div>
                        <button 
                            onClick={handleSpeak}
                            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                        >
                            <Volume2 className="text-white text-sm" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Input */}
            <div className="flex-1 px-4">
                <div className="relative">
                    <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={`Type the practice phrase in English...`}
                        disabled={gameState === 'checking'}
                        className={`w-full h-32 p-4 rounded-xl border-2 bg-[var(--color-bg-card)] resize-none text-lg ${
                            isWrong ? 'border-red-500' : 'border-transparent focus:border-[var(--color-primary)]'
                        } outline-none`}
                    />
                    {attemptsLeft < maxAttempts && (
                        <div className="absolute top-2 right-2 text-xs text-[var(--color-text-muted)]">
                            Attempts left: {attemptsLeft}
                        </div>
                    )}
                </div>
            </div>

            {/* Hint Section */}
            <div className="px-4 mb-4">
                {!showHint && !loadingHint && (
                    <button
                        onClick={getAiHint}
                        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] underline"
                    >
                        <Lightbulb size={14} className="inline mr-1" />
                        Get translation hint
                    </button>
                )}
                
                {loadingHint && (
                    <div className="text-sm text-gray-400">
                        <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full inline mr-2"></div>
                        Getting hint...
                    </div>
                )}
                
                {aiHint && showHint && (
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
                                ? `Excellent! 🔥 ${streak + 1} streak!` 
                                : attemptsLeft > 0 
                                    ? `Not quite right. Try again! (${attemptsLeft} attempts left)`
                                    : `Correct phrase: ${targetPhrase}`
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
                    {attempts === 0 ? 'Check Answer' : `Try Again (${attemptsLeft}/${maxAttempts})`}
                </button>
            </div>
        </div>
    );
};

export default RealWorldPracticePage;
