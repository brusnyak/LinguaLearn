import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Mic, Plus } from 'lucide-react';
import { translateText, type Story } from '../services/gemini';
import { db } from '../services/db';
import type { Word } from '../types';
import { useToast } from '../context/ToastContext';
import { v4 as uuidv4 } from 'uuid';

const StoryReaderPage: React.FC = () => {
    const { storyId } = useParams<{ storyId: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [story, setStory] = useState<Story | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const [translation, setTranslation] = useState('');
    const [translating, setTranslating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
    const [transcript, setTranscript] = useState('');

    useEffect(() => {
        loadStory();
        setupSpeechRecognition();

        return () => {
            if (synthRef.current) {
                window.speechSynthesis.cancel();
            }
            if (recognition) {
                recognition.stop();
            }
        };
    }, [storyId]);

    const loadStory = () => {
        const saved = localStorage.getItem('reading-stories');
        if (saved) {
            const stories: Story[] = JSON.parse(saved);
            const found = stories.find(s => s.id === storyId);
            if (found) {
                setStory(found);
            }
        }
    };

    const setupSpeechRecognition = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognitionAPI = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognitionInstance = new SpeechRecognitionAPI();
            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = true; // Enable interim results for live typing effect

            recognitionInstance.onresult = (event: any) => {
                let currentTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        currentTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    if (selectedText) {
                        handleSpeechResult(finalTranscript);
                    } else {
                        setTranscript(finalTranscript);
                    }
                } else {
                    // For interim results, update the transcript state
                    setTranscript(currentTranscript);
                }
            };

            recognitionInstance.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                showToast('Speech recognition error', 'error');
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
            };

            setRecognition(recognitionInstance);
        }
    };

    const handleTextSelection = async () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            const text = selection.toString().trim();
            setSelectedText(text);
            setTranslation('');
            setTranscript(''); // Clear transcript when text is selected

            setTranslating(true);
            try {
                const translated = await translateText(text, story!.language);
                setTranslation(translated);
            } catch (error) {
                console.error(error);
                showToast('Translation failed', 'error');
            } finally {
                setTranslating(false);
            }
        }
    };

    const handleAddWord = async () => {
        if (!selectedText || !translation) return;

        const word: Word = {
            id: uuidv4(),
            term: selectedText,
            translation: translation,
            category: 'From Reading',
            phonetic: '',
            masteryLevel: 0,
            lastReviewed: Date.now(),
            isMastered: false,
            timesCorrect: 0,
            createdAt: Date.now(),
        };

        await db.addWord(word);
        showToast('Word added to dictionary!', 'success');
        setSelectedText('');
        setTranslation('');
    };

    const handlePlayStory = () => {
        if (!story) return;

        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(story.content);
        utterance.lang = getLanguageCode(story.language);
        utterance.rate = 0.9;

        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
    };

    const handleListen = () => {
        if (!recognition) {
            showToast('Speech recognition not supported', 'error');
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            setTranscript(''); // Clear previous transcript
            setSelectedText(''); // Clear selected text when starting dictation
            recognition.lang = getLanguageCode(story!.language);
            recognition.start();
            setIsListening(true);
        }
    };

    const handleSpeechResult = (transcript: string) => {
        const similarity = calculateSimilarity(transcript.toLowerCase(), selectedText.toLowerCase());
        const percentage = Math.round(similarity * 100);

        if (percentage >= 80) {
            showToast(`Great! ${percentage}% match`, 'success');
        } else if (percentage >= 60) {
            showToast(`Good try: ${percentage}% match`, 'error');
        } else {
            showToast(`Try again: ${percentage}% match`, 'error');
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

    const getLanguageCode = (language: string): string => {
        const codes: { [key: string]: string } = {
            'Spanish': 'es-ES',
            'French': 'fr-FR',
            'German': 'de-DE',
            'Italian': 'it-IT',
            'Portuguese': 'pt-PT',
            'Russian': 'ru-RU',
            'Japanese': 'ja-JP',
            'Korean': 'ko-KR',
            'Chinese': 'zh-CN',
        };
        return codes[language] || 'en-US';
    };

    if (!story) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading story...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20 pt-6 px-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-[var(--color-bg-card)] rounded-lg transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{story.title}</h1>
                    <div className="flex gap-2 mt-1">
                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium">
                            {story.level}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-bg-card)] text-[var(--color-text-muted)]">
                            {story.topic}
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
                <button
                    onClick={handlePlayStory}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-bg-card)] rounded-lg font-bold hover:bg-[var(--color-bg)] transition-colors"
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    {isPlaying ? 'Pause' : 'Play Story'}
                </button>
                <button
                    onClick={handleListen}
                    className={`p-3 rounded-lg font-bold transition-colors ${isListening
                        ? 'bg-red-500 text-white'
                        : 'bg-[var(--color-bg-card)] hover:bg-[var(--color-bg)]'
                        }`}
                >
                    <Mic size={20} />
                </button>
            </div>

            {/* Dictation / Transcript Panel */}
            {isListening && !selectedText && (
                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-primary)] animate-pulse">
                    <p className="text-sm text-[var(--color-text-muted)] mb-1">Listening...</p>
                    <p className="text-lg font-medium">{transcript || "Start speaking..."}</p>
                </div>
            )}

            {/* Result Display (when not listening but has transcript) */}
            {!isListening && transcript && !selectedText && (
                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border)]">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-[var(--color-text-muted)]">You said:</p>
                        <button onClick={() => setTranscript('')} className="text-xs text-[var(--color-primary)]">Clear</button>
                    </div>
                    <p className="text-lg">{transcript}</p>
                </div>
            )}

            {/* Story Content */}
            <div className="text-sm text-[var(--color-text-muted)] text-center italic">
                👆 Select text to translate, or click 🎤 to practice speaking
            </div>
            <div
                onMouseUp={handleTextSelection}
                onTouchEnd={handleTextSelection}
                className="bg-[var(--color-bg-card)] rounded-xl p-6 leading-relaxed text-lg select-text border border-[var(--color-border)] whitespace-pre-wrap"
                style={{ userSelect: 'text' }}
            >
                {story.content}
            </div>

            {/* Translation Panel */}
            {selectedText && (
                <div className="bg-gradient-to-r from-purple-500/10 to-purple-700/10 rounded-xl p-6 border border-purple-500/20">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg">Selected Text</h3>
                        <button
                            onClick={() => {
                                setSelectedText('');
                                setTranslation('');
                            }}
                            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                            Clear
                        </button>
                    </div>
                    <p className="text-[var(--color-text)] font-medium mb-3">{selectedText}</p>

                    {translating && <p className="text-sm text-[var(--color-text-muted)]">Translating...</p>}

                    {translation && !translating && (
                        <>
                            <p className="text-[var(--color-text-muted)] mb-4">{translation}</p>
                            <button
                                onClick={handleAddWord}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[var(--color-primary-dark)] transition-colors"
                            >
                                <Plus size={16} />
                                Add to Dictionary
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default StoryReaderPage;
