import { useCallback, useRef } from 'react';

export type SoundType = 'success' | 'error' | 'levelUp' | 'tap';

export const useSound = () => {
    const audioContextRef = useRef<AudioContext | null>(null);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    const play = useCallback((type: SoundType) => {
        // Check if sounds are enabled
        const soundEnabled = localStorage.getItem('soundEnabled');
        if (soundEnabled === 'false') return;

        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Configure based on sound type
        switch (type) {
            case 'success':
                // Pleasant ascending chime
                oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
                oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.3);
                break;

            case 'error':
                // Descending buzz
                oscillator.frequency.setValueAtTime(300, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.2);
                break;

            case 'levelUp':
                // Triumphant rising melody
                oscillator.frequency.setValueAtTime(392, ctx.currentTime); // G4
                oscillator.frequency.setValueAtTime(523.25, ctx.currentTime + 0.1); // C5
                oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2); // E5
                oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.5);
                break;

            case 'tap':
                // Short click
                oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.05);
                break;
        }
    }, [getAudioContext]);

    return { play };
};
