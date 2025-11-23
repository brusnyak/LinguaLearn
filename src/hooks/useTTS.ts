import { useState, useEffect, useCallback } from 'react';

export const useTTS = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        const updateVoices = () => {
            setVoices(window.speechSynthesis.getVoices());
        };

        updateVoices();
        window.speechSynthesis.onvoiceschanged = updateVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const speak = useCallback((text: string, lang: string = 'en-US') => {
        if (!text) return;

        window.speechSynthesis.cancel(); // Stop previous
        setIsSpeaking(true);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;

        // Try to find a specific voice for the language
        // Prioritize Google voices or native system voices if available
        const voice = voices.find(v => v.lang.startsWith(lang));
        if (voice) {
            utterance.voice = voice;
        }

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
            console.error('TTS Error:', e);
            setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
    }, [voices]);

    const cancel = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    return { speak, cancel, isSpeaking, voices };
};
