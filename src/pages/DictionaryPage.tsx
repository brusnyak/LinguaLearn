import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { importFromFile, createCSVTemplate, type ImportResult } from '../services/import';
import type { Word } from '../types';
import { Search, Plus, Volume2, Upload, X, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const DictionaryPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [words, setWords] = useState<Word[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        loadWords();
    }, []);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setShowImportModal(true);

        try {
            const result = await importFromFile(file);
            setImportResult(result);
        } catch (error: any) {
            setImportResult({
                success: false,
                words: [],
                errors: [error.message],
                imported: 0,
                skipped: 0,
            });
        } finally {
            setImporting(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!importResult || !importResult.success) {
            setShowImportModal(false);
            setImportResult(null);
            return;
        }

        try {
            let imported = 0;
            for (const word of importResult.words) {
                await db.addWord(word);
                imported++;
            }
            await loadWords();
            showToast(`Imported ${imported} words!`, 'success');
            setShowImportModal(false);
            setImportResult(null);
        } catch (error) {
            console.error('Failed to save imported words:', error);
            showToast('Failed to save imported words', 'error');
        }
    };

    const handleDownloadTemplate = () => {
        const template = createCSVTemplate();
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lingualearn_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const loadWords = async () => {
        try {
            const allWords = await db.getWords();
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

    const groupedWords = filteredWords.reduce((acc, word) => {
        const letter = word.term[0].toUpperCase();
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(word);
        return acc;
    }, {} as Record<string, Word[]>);

    const sortedLetters = Object.keys(groupedWords).sort();

    return (
        <div className="space-y-6 pb-20 pt-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Dictionary</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleImportClick}
                        className="btn btn-secondary"
                        title="Import from CSV/Excel"
                    >
                        <Upload size={18} />
                    </button>
                    <button
                        onClick={() => navigate('/word/new')}
                        className="btn btn-primary shadow-lg shadow-purple-500/30"
                    >
                        <Plus size={20} className="mr-1" /> Add Word
                    </button>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
            />

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

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Import Words</h3>
                            <button onClick={() => { setShowImportModal(false); setImportResult(null); }} className="p-2">
                                <X size={20} />
                            </button>
                        </div>

                        {importing ? (
                            <div className="text-center py-8">
                                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p>Processing file...</p>
                            </div>
                        ) : importResult ? (
                            <div className="space-y-4">
                                {importResult.success ? (
                                    <>
                                        <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                                <Check size={20} />
                                                <span className="font-bold">Ready to import</span>
                                            </div>
                                            <p className="text-sm mt-1">
                                                {importResult.imported} words found ({importResult.skipped} skipped)
                                            </p>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto border rounded-lg">
                                            {importResult.words.slice(0, 5).map((word, i) => (
                                                <div key={i} className="px-3 py-2 border-b text-sm">
                                                    <strong>{word.term}</strong> → {word.translation}
                                                </div>
                                            ))}
                                            {importResult.words.length > 5 && (
                                                <div className="px-3 py-2 text-sm text-gray-500">
                                                    ...and {importResult.words.length - 5} more
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                                        <p className="text-red-700 dark:text-red-400 font-bold">Import failed</p>
                                        {importResult.errors.map((err, i) => (
                                            <p key={i} className="text-sm">{err}</p>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="flex-1 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        Download Template
                                    </button>
                                    {importResult?.success ? (
                                        <button
                                            onClick={handleConfirmImport}
                                            className="flex-1 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600"
                                        >
                                            Import {importResult.imported} Words
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { setShowImportModal(false); setImportResult(null); }}
                                            className="flex-1 py-2 bg-gray-500 text-white rounded-lg font-bold"
                                        >
                                            Close
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                                <p className="mb-4">Select a CSV or Excel file to import words</p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="text-purple-500 hover:underline text-sm"
                                >
                                    Download CSV Template
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DictionaryPage;
