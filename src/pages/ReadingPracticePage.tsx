import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Sparkles, ArrowLeft } from 'lucide-react';
import { db } from '../services/db';
import { generateStory, STORY_TOPICS, type Story } from '../services/gemini';
import { useToast } from '../context/ToastContext';

const ReadingPracticePage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [stories, setStories] = useState<Story[]>([]);
    const [showGenerator, setShowGenerator] = useState(false);
    const [targetLanguage, setTargetLanguage] = useState('Spanish');
    const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
    const [topic, setTopic] = useState(STORY_TOPICS[0]);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadUserSettings();
        loadStories();
    }, []);

    const loadUserSettings = async () => {
        const settings = await db.getSettings();
        if (settings?.profile) {
            setTargetLanguage(settings.profile.targetLanguage);
            setLevel(settings.profile.level);
        }
    };

    const loadStories = () => {
        const saved = localStorage.getItem('reading-stories');
        if (saved) {
            setStories(JSON.parse(saved));
        }
    };

    const handleGenerateStory = async () => {
        if (!import.meta.env.VITE_GEMINI_API_KEY) {
            showToast('Gemini API key not configured in .env file', 'error');
            return;
        }

        setGenerating(true);
        try {
            const story = await generateStory(targetLanguage, level, topic);
            const updated = [story, ...stories];
            setStories(updated);
            localStorage.setItem('reading-stories', JSON.stringify(updated));
            setShowGenerator(false);
            showToast('Story generated!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to generate story. Check API key.', 'error');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6 pb-20 pt-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-[var(--color-bg-card)] rounded-lg transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">Reading Practice</h1>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        AI-generated stories in {targetLanguage}
                    </p>
                </div>
            </div>

            {/* Generate Story Button */}
            <button
                onClick={() => setShowGenerator(!showGenerator)}
                className="w-full p-6 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-2xl hover:shadow-xl transition-all"
            >
                <div className="flex items-center justify-center gap-3">
                    <Sparkles size={24} />
                    <span className="font-bold text-lg">Generate New Story</span>
                </div>
            </button>

            {/* Story Generator */}
            {showGenerator && (
                <div className="bg-[var(--color-bg-card)] rounded-xl p-6 space-y-4 border border-[var(--color-border)]">
                    <h3 className="font-bold text-lg">Story Settings</h3>

                    <div>
                        <label className="block text-sm font-medium mb-2">Level</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value as any)}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Topic</label>
                        <select
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                        >
                            {STORY_TOPICS.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleGenerateStory}
                        disabled={generating}
                        className="w-full px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
                    >
                        {generating ? 'Generating...' : 'Generate Story'}
                    </button>
                </div>
            )}

            {/* Story Library */}
            <div>
                <h2 className="text-lg font-bold mb-3">Your Stories</h2>

                {stories.length === 0 ? (
                    <div className="text-center py-20 text-[var(--color-text-muted)]">
                        <Book size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-bold mb-2">No stories yet</p>
                        <p className="text-sm">Generate your first AI story to start reading!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {stories.map(story => (
                            <div
                                key={story.id}
                                onClick={() => navigate(`/reading/${story.id}`)}
                                className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg mb-1">{story.title}</h3>
                                        <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-2">
                                            {story.content.substring(0, 100)}...
                                        </p>
                                        <div className="flex gap-2">
                                            <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium">
                                                {story.level}
                                            </span>
                                            <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)]">
                                                {story.topic}
                                            </span>
                                        </div>
                                    </div>
                                    <Book size={20} className="text-[var(--color-text-muted)] flex-shrink-0 ml-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReadingPracticePage;
