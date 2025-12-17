// Translation service using LibreTranslate API
import { db } from './db';

const LIBRE_TRANSLATE_URL = import.meta.env.VITE_LIBRETRANSLATE_API_URL || 'https://libretranslate.de/translate';

export const translateText = async (text: string, from: string, to: string): Promise<string> => {
    if (!text) return '';

    // Check cache first
    try {
        const cached = await db.getCachedTranslation(text, from, to);
        if (cached) {
            console.log('Translation cache hit:', text);
            return cached;
        }
    } catch (error) {
        console.warn('Cache lookup failed, proceeding to API:', error);
    }

    try {
        const response = await fetch(LIBRE_TRANSLATE_URL, {
            method: 'POST',
            body: JSON.stringify({
                q: text,
                source: from,
                target: to,
                format: 'text',
                api_key: '' // Empty for free tier usually, or handle if needed
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        const translation = data.translatedText;
        
        if (!translation) {
             throw new Error('No translation returned');
        }

        // Cache the translation
        try {
            await db.cacheTranslation(text, from, to, translation);
        } catch (error) {
            console.warn('Failed to cache translation:', error);
        }
        
        return translation;
    } catch (error) {
        console.error('Translation failed:', error);
        throw new Error('Translation service unavailable. Please try again later.');
    }
};
