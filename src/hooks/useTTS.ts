import { useState, useEffect, useCallback, useRef } from 'react';

export const useTTS = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        const updateVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                setVoices(availableVoices);
            }
        };

        updateVoices();
        window.speechSynthesis.onvoiceschanged = updateVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
            window.speechSynthesis.cancel();
        };
    }, []);

    const speak = useCallback((text: string, lang: string = 'en-US') => {
        if (!text) return;

        // Cancel previous utterance
        window.speechSynthesis.cancel();
        setIsSpeaking(true);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;

        // Keep reference to prevent garbage collection
        utteranceRef.current = utterance;

        // Voice selection
        const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
        const voice = currentVoices.find(v => v.lang.startsWith(lang)) || 
                     currentVoices.find(v => v.lang.includes(lang.split('-')[0])); // Fallback to base lang
        
        if (voice) {
            utterance.voice = voice;
        }

        utterance.onend = () => {
            setIsSpeaking(false);
            utteranceRef.current = null;
        };

        utterance.onerror = (e) => {
            // Explicitly ignore 'canceled' and 'interrupted' errors
            const errorType = e.error;
            if (errorType !== 'interrupted' && errorType !== 'canceled') {
                console.error('TTS Error:', e);
            }
            setIsSpeaking(false);
            utteranceRef.current = null;
        };

        // Speak immediately
        window.speechSynthesis.speak(utterance);
        
    }, [voices]);

    const cancel = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        utteranceRef.current = null;
    }, []);

    return { speak, cancel, isSpeaking, voices };
};
