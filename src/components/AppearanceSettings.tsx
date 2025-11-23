import React, { useState, useEffect } from 'react';
import { Palette, Type, Text } from 'lucide-react';

const FONTS = [
    { name: 'Inter (Default)', value: 'Inter, system-ui, sans-serif' },
    { name: 'Serif', value: 'Georgia, serif' },
    { name: 'Mono', value: 'monospace' },
    { name: 'Comic', value: '"Comic Sans MS", cursive' }, // For fun
];

const COLORS = [
    { name: 'Purple & Orange', primary: '#6D28D9', secondary: '#F97316' },
    { name: 'Blue & Teal', primary: '#2563EB', secondary: '#0D9488' },
    { name: 'Green & Pink', primary: '#16A34A', secondary: '#DB2777' },
    { name: 'Red & Yellow', primary: '#DC2626', secondary: '#CA8A04' },
];

const AppearanceSettings: React.FC = () => {
    const [currentFont, setCurrentFont] = useState('Inter, system-ui, sans-serif');
    const [currentColor, setCurrentColor] = useState('Purple & Orange');
    const [currentScale, setCurrentScale] = useState(1);

    const handleFontChange = (font: string) => {
        setCurrentFont(font);
        document.documentElement.style.setProperty('--font-primary', font);
        localStorage.setItem('app-font', font);
    };

    const handleScaleChange = (scale: number) => {
        setCurrentScale(scale);
        document.documentElement.style.setProperty('--text-scale', String(scale));
        localStorage.setItem('app-text-scale', String(scale));
    };

    const handleColorChange = (colorSet: typeof COLORS[0]) => {
        setCurrentColor(colorSet.name);
        document.documentElement.style.setProperty('--color-primary', colorSet.primary);
        document.documentElement.style.setProperty('--color-secondary', colorSet.secondary);
        // Also update variants if needed, but for now main colors are enough
        localStorage.setItem('app-color-name', colorSet.name);
        localStorage.setItem('app-color-primary', colorSet.primary);
        localStorage.setItem('app-color-secondary', colorSet.secondary);
    };

    useEffect(() => {
        // Load saved settings
        const savedFont = localStorage.getItem('app-font');
        if (savedFont) {
            handleFontChange(savedFont);
        }

        const savedColorName = localStorage.getItem('app-color-name');
        if (savedColorName) setCurrentColor(savedColorName);

        const savedScale = localStorage.getItem('app-text-scale');
        if (savedScale) {
            handleScaleChange(parseFloat(savedScale));
        }

        const savedPrimary = localStorage.getItem('app-color-primary');
        const savedSecondary = localStorage.getItem('app-color-secondary');
        if (savedPrimary && savedSecondary) {
            document.documentElement.style.setProperty('--color-primary', savedPrimary);
            document.documentElement.style.setProperty('--color-secondary', savedSecondary);
        }
    }, []);

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <Palette size={20} /> Appearance
            </h3>

            {/* Colors */}
            <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm">
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">Theme Colors</label>
                <div className="grid grid-cols-2 gap-3">
                    {COLORS.map(color => (
                        <button
                            key={color.name}
                            onClick={() => handleColorChange(color)}
                            className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-all ${currentColor === color.name
                                ? 'border-[var(--color-primary)] bg-purple-50 dark:bg-purple-900/20'
                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            <div className="flex gap-1">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.primary }}></div>
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.secondary }}></div>
                            </div>
                            <span className="text-sm font-medium">{color.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Fonts */}
            <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm">
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                    <Type size={16} /> Font Style
                </label>
                <div className="space-y-2">
                    {FONTS.map(font => (
                        <button
                            key={font.name}
                            onClick={() => handleFontChange(font.value)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${currentFont === font.value
                                ? 'border-[var(--color-primary)] bg-purple-50 dark:bg-purple-900/20'
                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            style={{ fontFamily: font.value }}
                        >
                            <span className="text-sm">{font.name}</span>
                            <span className="text-xs text-[var(--color-text-muted)] ml-2">The quick brown fox jumps...</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Text Size */}
            <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm">
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                    <Text size={16} /> Text Size
                </label>
                <div className="flex items-center gap-4 px-2">
                    <span className="text-xs font-bold text-[var(--color-text-muted)]">A</span>
                    <input
                        type="range"
                        min="0.8"
                        max="1.2"
                        step="0.05"
                        value={currentScale}
                        onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                    />
                    <span className="text-xl font-bold text-[var(--color-text-muted)]">A</span>
                </div>
                <div className="text-center text-xs text-[var(--color-text-muted)] mt-2">
                    {Math.round(currentScale * 100)}%
                </div>
            </div>

            {/* Sound Effects */}
            <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--color-text-muted)] flex items-center gap-2">
                        🔊 Sound Effects
                    </label>
                    <button
                        onClick={() => {
                            const current = localStorage.getItem('soundEnabled') !== 'false';
                            localStorage.setItem('soundEnabled', String(!current));
                            // Force re-render would be nice but not critical
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localStorage.getItem('soundEnabled') !== 'false'
                                ? 'bg-[var(--color-primary)]'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localStorage.getItem('soundEnabled') !== 'false' ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppearanceSettings;
