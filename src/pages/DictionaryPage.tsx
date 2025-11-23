import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import type { Word } from '../types';
import { Search, Plus, Volume2 } from 'lucide-react';

const DictionaryPage: React.FC = () => {
    const navigate = useNavigate();
    const [words, setWords] = useState<Word[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWords();
    }, []);

    const loadWords = async () => {
        try {
            const allWords = await db.getWords();
            // Sort alphabetically by term
            allWords.sort((a, b) => a.term.localeCompare(b.term));
            setWords(allWords);
        } catch (error) {
            console.error('Failed to load words:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredWords = words.filter(word =>
        word.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.translation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group by first letter
    const groupedWords = filteredWords.reduce((acc, word) => {
        const letter = word.term[0].toUpperCase();
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(word);
        return acc;
    }, {} as Record<string, Word[]>);

    const sortedLetters = Object.keys(groupedWords).sort();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Dictionary</h2>
                <button
                    onClick={() => navigate('/word/new')}
                    className="btn btn-primary shadow-lg shadow-purple-500/30"
                >
                    <Plus size={20} className="mr-1" /> Add Word
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search words..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-[var(--color-bg-card)] shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
                />
            </div>

            {loading ? (
                <div className="text-center py-10 text-[var(--color-text-muted)]">Loading dictionary...</div>
            ) : (
                <div className="space-y-6 pb-20">
                    {sortedLetters.length === 0 ? (
                        <div className="text-center py-10 text-[var(--color-text-muted)]">
                            No words found. Try adding some!
                        </div>
                    ) : (
                        sortedLetters.map(letter => (
                            <div key={letter} className="bg-[var(--color-bg-card)] rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="font-bold text-[var(--color-primary)]">{letter}</span>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {groupedWords[letter].map(word => (
                                        <div
                                            key={word.id}
                                            onClick={() => navigate(`/word/${word.id}`)}
                                            className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                        >
                                            <div>
                                                <div className="font-medium text-lg flex items-center gap-2">
                                                    {word.isMastered && <span className="text-yellow-400" title="Mastered!">⭐</span>}
                                                    {word.term}
                                                </div>
                                                <div className="text-[var(--color-text-muted)] text-sm flex items-center gap-2">
                                                    {word.translation}
                                                    {/* Mastery Indicator */}
                                                    <div className="flex gap-0.5 ml-2" title={`Mastery Level: ${word.masteryLevel || 0}/5`}>
                                                        {[...Array(5)].map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={`w-1.5 h-1.5 rounded-full ${i < (word.masteryLevel || 0)
                                                                    ? 'bg-green-500'
                                                                    : 'bg-gray-200 dark:bg-gray-700'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="p-2 rounded-full text-gray-400 hover:text-[var(--color-primary)] hover:bg-purple-50 dark:hover:bg-purple-900/20 opacity-0 group-hover:opacity-100 transition-all">
                                                <Volume2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default DictionaryPage;
