import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import type { Word } from '../types';
import { Sparkles, ArrowRight } from 'lucide-react';

const WordOfTheDay: React.FC = () => {
    const navigate = useNavigate();
    const [word, setWord] = useState<Word | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadWordOfTheDay = async () => {
            try {
                const words = await db.getWords();
                if (words.length === 0) return;

                // Simple "random" based on date to keep it consistent for the day
                const today = new Date().toDateString();
                const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const index = seed % words.length;

                setWord(words[index]);
            } catch (error) {
                console.error('Failed to load WOTD:', error);
            } finally {
                setLoading(false);
            }
        };
        loadWordOfTheDay();
    }, []);

    if (loading || !word) return null;

    return (
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 opacity-90">
                    <Sparkles size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Word of the Day</span>
                </div>

                <h3 className="text-3xl font-bold mb-1">{word.term}</h3>
                <p className="text-lg opacity-90 mb-4">{word.translation}</p>

                <button
                    onClick={() => navigate(`/word/${word.id}`)}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                >
                    Learn More <ArrowRight size={16} />
                </button>
            </div>

            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl"></div>
        </div>
    );
};

export default WordOfTheDay;
