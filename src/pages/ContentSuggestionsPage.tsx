import React, { useState, useEffect } from 'react';
import { Film, Tv, Star, Calendar, ArrowLeft } from 'lucide-react';
import { db } from '../services/db';
import { getMoviesByLanguage, getTVShowsByLanguage, getPosterUrl, type TMDBMovie, type TMDBTVShow } from '../services/tmdb';
import { motion, AnimatePresence } from 'framer-motion';

type ContentType = 'movies' | 'tv';

const ContentSuggestionsPage: React.FC = () => {
    const [contentType, setContentType] = useState<ContentType>('movies');
    const [movies, setMovies] = useState<TMDBMovie[]>([]);
    const [tvShows, setTVShows] = useState<TMDBTVShow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<TMDBMovie | TMDBTVShow | null>(null);
    const [targetLanguage, setTargetLanguage] = useState('English');
    const [userLevel, setUserLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

    useEffect(() => {
        loadUserSettings();
    }, []);

    useEffect(() => {
        if (targetLanguage && userLevel) {
            loadContent();
        }
    }, [contentType, targetLanguage, userLevel]);

    const loadUserSettings = async () => {
        const settings = await db.getSettings();
        if (settings?.profile) {
            setTargetLanguage(settings.profile.targetLanguage);
            setUserLevel(settings.profile.level);
        }
    };

    const loadContent = async () => {
        setLoading(true);
        if (contentType === 'movies') {
            const data = await getMoviesByLanguage(targetLanguage, userLevel);
            setMovies(data);
        } else {
            const data = await getTVShowsByLanguage(targetLanguage, userLevel);
            setTVShows(data);
        }
        setLoading(false);
    };

    const getYear = (date: string) => {
        if (!date) return '';
        return new Date(date).getFullYear();
    };

    const isMovie = (item: TMDBMovie | TMDBTVShow): item is TMDBMovie => {
        return 'title' in item;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Content Suggestions</h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        Watching content in {targetLanguage} • {userLevel.charAt(0).toUpperCase() + userLevel.slice(1)} level
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-[var(--color-bg-card)] p-1 rounded-lg shadow-sm w-fit">
                <button
                    onClick={() => setContentType('movies')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${contentType === 'movies'
                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                >
                    <Film size={18} />
                    Movies
                </button>
                <button
                    onClick={() => setContentType('tv')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${contentType === 'tv'
                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                >
                    <Tv size={18} />
                    TV Shows
                </button>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-[var(--color-bg-card)] rounded-xl overflow-hidden animate-pulse">
                            <div className="aspect-[2/3] bg-gray-300 dark:bg-gray-700"></div>
                            <div className="p-3 space-y-2">
                                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Content Grid */}
            {!loading && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(contentType === 'movies' ? movies : tvShows).map((item) => (
                        <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedItem(item)}
                            className="bg-[var(--color-bg-card)] rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer"
                        >
                            <div className="aspect-[2/3] relative overflow-hidden">
                                <img
                                    src={getPosterUrl(item.poster_path)}
                                    alt={isMovie(item) ? item.title : item.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-white text-xs font-bold">
                                    <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                    {item.vote_average.toFixed(1)}
                                </div>
                            </div>
                            <div className="p-3">
                                <h3 className="font-bold text-sm line-clamp-2 mb-1">
                                    {isMovie(item) ? item.title : item.name}
                                </h3>
                                <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                                    <Calendar size={12} />
                                    {getYear(isMovie(item) ? item.release_date : item.first_air_date)}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && (contentType === 'movies' ? movies : tvShows).length === 0 && (
                <div className="text-center py-20 text-[var(--color-text-muted)]">
                    <p className="text-lg font-bold mb-2">No content found</p>
                    <p className="text-sm">Try adjusting your language or level settings</p>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-2xl w-full bg-[var(--color-bg-card)] rounded-2xl overflow-hidden shadow-xl"
                        >
                            <div className="relative h-64 overflow-hidden">
                                <img
                                    src={getPosterUrl(selectedItem.backdrop_path || selectedItem.poster_path)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-card)] to-transparent"></div>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                                >
                                    <ArrowLeft className="text-white" />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-2">
                                            {isMovie(selectedItem) ? selectedItem.title : selectedItem.name}
                                        </h2>
                                        <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                                            <div className="flex items-center gap-1">
                                                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                                {selectedItem.vote_average.toFixed(1)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {getYear(isMovie(selectedItem) ? selectedItem.release_date : selectedItem.first_air_date)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[var(--color-text-muted)] mb-6 leading-relaxed">
                                    {selectedItem.overview || 'No description available.'}
                                </p>
                                <a
                                    href={`https://www.themoviedb.org/${contentType === 'movies' ? 'movie' : 'tv'}/${selectedItem.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                                >
                                    View on TMDb →
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ContentSuggestionsPage;
