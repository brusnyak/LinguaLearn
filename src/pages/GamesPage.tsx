import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sword, Layers, Trophy } from 'lucide-react';
import { getXPInfo } from '../services/xp';

const GamesPage: React.FC = () => {
    const navigate = useNavigate();
    const [level, setLevel] = useState(1);
    const [title, setTitle] = useState('Amateur');

    useEffect(() => {
        const loadXP = async () => {
            const xpInfo = await getXPInfo();
            setLevel(xpInfo.level);
            setTitle(xpInfo.title);
        };
        loadXP();
    }, []);

    const games = [
        {
            id: 'dungeon',
            title: 'Vocab Dungeon',
            description: 'Battle monsters by translating words correctly! Scale through levels.',
            icon: Sword,
            color: 'from-purple-500 to-indigo-600',
            path: '/games/dungeon'
        },
        {
            id: 'flashcards',
            title: 'Flashcards',
            description: 'Classic spaced repetition review. Master your vocabulary.',
            icon: Layers,
            color: 'from-orange-400 to-red-500',
            path: '/games/flashcards'
        },
        {
            id: 'word-match',
            title: 'Word Match',
            description: 'Match words with their translations. Race against the clock!',
            icon: Trophy,
            color: 'from-green-400 to-teal-500',
            path: '/games/word-match'
        }
    ];

    return (
        <div className="space-y-6 pb-20 pt-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Game Hub</h2>
                <div className="flex flex-col items-end">
                    <div className="flex items-center text-[var(--color-primary)] font-bold">
                        <Trophy className="mr-2" />
                        <span>Level {level}</span>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] mt-1">{title}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {games.map((game) => (
                    <div
                        key={game.id}
                        onClick={() => navigate(game.path)}
                        className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg cursor-pointer transform transition-all hover:scale-[1.02] active:scale-95 bg-gradient-to-br ${game.color}`}
                    >
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">{game.title}</h3>
                                <p className="opacity-90 max-w-[80%]">{game.description}</p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                <game.icon size={32} />
                            </div>
                        </div>

                        {/* Decorative circles */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute top-10 -left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GamesPage;
