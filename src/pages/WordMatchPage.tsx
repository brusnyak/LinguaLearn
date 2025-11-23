import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { db } from '../services/db';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../hooks/useSound';

interface Card {
    id: string;
    content: string;
    pairId: string;
    isWord: boolean;
    isFlipped: boolean;
    isMatched: boolean;
}

const WordMatchPage: React.FC = () => {
    const navigate = useNavigate();
    const { play } = useSound();
    const [cards, setCards] = useState<Card[]>([]);
    const [selectedCards, setSelectedCards] = useState<string[]>([]);
    const [moves, setMoves] = useState(0);
    const [matches, setMatches] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'won'>('loading');
    const [timerInterval, setTimerInterval] = useState<number | null>(null);

    useEffect(() => {
        startGame();
        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    }, []);

    const startGame = async () => {
        try {
            const allWords = await db.getWords();
            if (allWords.length < 6) {
                alert("You need at least 6 words to play Word Match!");
                navigate('/games');
                return;
            }

            // Select 6 random words
            const selectedWords = allWords
                .sort(() => 0.5 - Math.random())
                .slice(0, 6);

            // Create card pairs
            const cardPairs: Card[] = [];
            selectedWords.forEach(word => {
                cardPairs.push({
                    id: `${word.id}-term`,
                    content: word.term,
                    pairId: word.id,
                    isWord: true,
                    isFlipped: false,
                    isMatched: false
                });
                cardPairs.push({
                    id: `${word.id}-translation`,
                    content: word.translation,
                    pairId: word.id,
                    isWord: false,
                    isFlipped: false,
                    isMatched: false
                });
            });

            // Shuffle cards
            const shuffled = cardPairs.sort(() => 0.5 - Math.random());
            setCards(shuffled);
            setGameState('playing');
            setMoves(0);
            setMatches(0);
            setTimeElapsed(0);

            // Start timer
            const interval = setInterval(() => {
                setTimeElapsed(prev => prev + 1);
            }, 1000);
            setTimerInterval(interval);
        } catch (error) {
            console.error("Failed to start game", error);
        }
    };

    const handleCardClick = (cardId: string) => {
        const card = cards.find(c => c.id === cardId);
        if (!card || card.isFlipped || card.isMatched || selectedCards.length >= 2) return;

        // Flip card
        setCards(cards.map(c =>
            c.id === cardId ? { ...c, isFlipped: true } : c
        ));

        const newSelected = [...selectedCards, cardId];
        setSelectedCards(newSelected);

        if (newSelected.length === 2) {
            setMoves(prev => prev + 1);
            const [firstId, secondId] = newSelected;
            const firstCard = cards.find(c => c.id === firstId);
            const secondCard = cards.find(c => c.id === secondId);

            if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
                // Match!
                play('success');
                setCards(cards.map(c =>
                    c.id === firstId || c.id === secondId
                        ? { ...c, isMatched: true }
                        : c
                ));
                setMatches(prev => prev + 1);
                setSelectedCards([]);

                // Check if game is won
                if (matches + 1 === 6) {
                    if (timerInterval) clearInterval(timerInterval);
                    setGameState('won');
                    play('levelUp');
                }
            } else {
                // No match
                play('error');
                setTimeout(() => {
                    setCards(cards.map(c =>
                        (c.id === firstId || c.id === secondId) && !c.isMatched
                            ? { ...c, isFlipped: false }
                            : c
                    ));
                    setSelectedCards([]);
                }, 1000);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (gameState === 'loading') return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/games')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ArrowLeft />
                </button>
                <h2 className="text-2xl font-bold">Word Match</h2>
                <div className="w-10"></div>
            </div>

            {/* Stats */}
            <div className="flex justify-around mb-6 bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm">
                <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--color-primary)]">{formatTime(timeElapsed)}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Time</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--color-primary)]">{moves}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Moves</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--color-primary)]">{matches}/6</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Matches</div>
                </div>
            </div>

            {/* Game Grid */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                {cards.map(card => (
                    <motion.div
                        key={card.id}
                        className={`aspect-square rounded-xl cursor-pointer transition-all ${card.isMatched
                            ? 'bg-green-500 text-white'
                            : card.isFlipped
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'bg-[var(--color-bg-card)] hover:shadow-lg'
                            } flex items-center justify-center p-2 text-center font-bold shadow-sm border-2 ${card.isMatched ? 'border-green-600' : 'border-transparent'
                            }`}
                        onClick={() => handleCardClick(card.id)}
                        whileHover={{ scale: card.isMatched ? 1 : 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {card.isFlipped || card.isMatched ? (
                            <span className="text-sm break-words">{card.content}</span>
                        ) : (
                            <span className="text-3xl">🎴</span>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Victory Overlay */}
            <AnimatePresence>
                {gameState === 'won' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center text-white z-50 backdrop-blur-sm"
                    >
                        <Trophy size={80} className="text-yellow-400 mb-6" />
                        <h2 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Perfect Match!</h2>
                        <p className="text-xl mb-2">Time: {formatTime(timeElapsed)}</p>
                        <p className="mb-8 text-gray-300">Moves: {moves}</p>
                        <div className="flex gap-4">
                            <button onClick={startGame} className="btn btn-primary text-lg px-8 py-3">Play Again</button>
                            <button onClick={() => navigate('/games')} className="btn bg-gray-700 hover:bg-gray-600 text-white text-lg px-8 py-3">Back to Games</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WordMatchPage;
