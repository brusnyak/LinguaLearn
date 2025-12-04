import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Wand2, Save, Volume2 } from 'lucide-react';
import { db } from '../services/db';
import { translateText } from '../services/translate';
import { v4 as uuidv4 } from 'uuid';
import type { Word } from '../types';
import { useToast } from '../context/ToastContext';
import { useTTS } from '../hooks/useTTS';
import { useSound } from '../hooks/useSound';
import ConfirmationModal from '../components/ConfirmationModal';

const CATEGORIES = ['Greetings', 'Food', 'Animals', 'People', 'Places', 'Emotions', 'Verbs', 'Adjectives', 'Other'];

const WordDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const { speak } = useTTS();
    const { play } = useSound();

    const [term, setTerm] = useState('');
    const [translation, setTranslation] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [type, setType] = useState<'word' | 'phrase'>('word');
    const [isTranslating, setIsTranslating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [targetLang, setTargetLang] = useState('en');
    const [nativeLang, setNativeLang] = useState('uk');

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        loadUserSettings();
        if (id && id !== 'new') {
            loadWord(id);
        }
    }, [id]);

    const loadUserSettings = async () => {
        try {
            const settings = await db.getSettings();
            if (settings?.profile) {
                // Map full language names to codes
                const langMap: Record<string, string> = {
                    'English': 'en',
                    'Ukrainian': 'uk',
                    'Spanish': 'es',
                    'French': 'fr',
                    'German': 'de',
                    'Italian': 'it',
                    'Portuguese': 'pt',
                    'Russian': 'ru',
                    'Japanese': 'ja',
                    'Korean': 'ko',
                    'Chinese': 'zh'
                };
                setTargetLang(langMap[settings.profile.targetLanguage] || 'en');
                setNativeLang(langMap[settings.profile.nativeLanguage] || 'uk');
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const loadWord = async (wordId: string) => {
        setLoading(true);
        try {
            const words = await db.getWords();
            const word = words.find(w => w.id === wordId);
            if (word) {
                setTerm(word.term);
                setTranslation(word.translation);
                setCategory(word.category);
                setType(word.type || 'word');
            }
        } catch (error) {
            console.error('Failed to load word:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMagicTranslate = async () => {
        if (!term) return;
        setIsTranslating(true);
        try {
            // Translate from target language to native language
            const result = await translateText(term, targetLang, nativeLang);
            if (result) {
                setTranslation(result);
                showToast('Translation found!', 'success');
            } else {
                showToast('Translation not found. Please check spelling.', 'error');
            }
        } catch (error) {
            console.error('Translation failed:', error);
            showToast('Translation service unavailable. Please try again.', 'error');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSave = async () => {
        if (!term || !translation) return;

        try {
            // Duplicate Check
            if (id === 'new' || !id) {
                const allWords = await db.getWords();
                const exists = allWords.some(w => w.term.toLowerCase() === term.toLowerCase());
                if (exists) {
                    showToast('Word already exists!', 'error');
                    return;
                }
            }

            const wordData: Word = {
                id: id === 'new' || !id ? uuidv4() : id,
                term,
                translation,
                category,
                type,
                masteryLevel: 0,
                lastReviewed: 0,
                timesCorrect: 0,
                isMastered: false,
                createdAt: Date.now(),
            };

            await db.addWord(wordData);
            play('success');
            showToast(`${type === 'phrase' ? 'Phrase' : 'Word'} saved successfully!`, 'success');
            navigate('/dictionary');
        } catch (error) {
            console.error('Failed to save word:', error);
            showToast('Failed to save.', 'error');
        }
    };

    const handleDeleteClick = () => {
        if (!id || id === 'new') return;
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!id) return;
        try {
            await db.deleteWord(id);
            play('error');
            showToast('Deleted.', 'success');
            navigate('/dictionary');
        } catch (error) {
            console.error('Failed to delete:', error);
            showToast('Failed to delete.', 'error');
        }
    };

    if (loading) {
        return <div className="p-6 text-center">Loading...</div>;
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => navigate('/dictionary')}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold">{id === 'new' ? 'Add New Entry' : 'Edit Entry'}</h2>
            </div>

            {/* Form */}
            <div className="bg-[var(--color-bg-card)] p-6 rounded-xl shadow-sm space-y-6">

                {/* Type Selection */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                        onClick={() => setType('word')}
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${type === 'word'
                            ? 'bg-white dark:bg-gray-700 shadow-sm text-[var(--color-primary)]'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                    >
                        Word
                    </button>
                    <button
                        onClick={() => setType('phrase')}
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${type === 'phrase'
                            ? 'bg-white dark:bg-gray-700 shadow-sm text-[var(--color-primary)]'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                    >
                        Phrase
                    </button>
                </div>

                {/* Term Input */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--color-text-muted)]">
                        {type === 'phrase' ? 'Phrase (English)' : 'Word (English)'}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            placeholder={type === 'phrase' ? "e.g., How are you?" : "e.g., Hello"}
                            className="flex-1 p-3 rounded-lg bg-[var(--color-bg)] border-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                        />
                        <button
                            onClick={() => speak(term, 'en-US')}
                            disabled={!term}
                            className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-[var(--color-text)] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title="Listen"
                        >
                            <Volume2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Translation Input with Magic Button */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--color-text-muted)]">
                        Translation (Ukrainian)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={translation}
                            onChange={(e) => setTranslation(e.target.value)}
                            placeholder="e.g., Привіт"
                            className="flex-1 p-3 rounded-lg bg-[var(--color-bg)] border-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                        />
                        <button
                            onClick={handleMagicTranslate}
                            disabled={isTranslating || !term}
                            className="p-3 rounded-lg bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-secondary-dark)] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
                            title="Magic Translate"
                        >
                            <Wand2 size={20} className={isTranslating ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => speak(translation, 'uk-UA')}
                            disabled={!translation}
                            className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-[var(--color-text)] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title="Listen"
                        >
                            <Volume2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Category Select */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--color-text-muted)]">
                        Category
                    </label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3 rounded-lg bg-[var(--color-bg)] border-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none appearance-none cursor-pointer"
                    >
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    {id !== 'new' && (
                        <button
                            onClick={handleDeleteClick}
                            className="flex-1 py-3 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-bold flex items-center justify-center gap-2 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                            Delete
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!term || !translation}
                        className="flex-[2] py-3 rounded-lg bg-[var(--color-primary)] text-white font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
                    >
                        <Save size={20} />
                        Save Word
                    </button>
                </div>

            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Delete Word"
                message={`Are you sure you want to delete "${term}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
};

export default WordDetailPage;
