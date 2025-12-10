// Translation service using Google Gemini API with caching
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './db';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Language code mapping for better Gemini understanding
const LANGUAGE_NAMES: Record<string, string> = {
    'en': 'English',
    'uk': 'Ukrainian',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
};

const getLanguageName = (code: string): string => {
    return LANGUAGE_NAMES[code] || code;
};

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

    if (!genAI) {
        console.error('Gemini API key missing');
        throw new Error('Translation service not configured (API Key missing)');
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const fromLang = getLanguageName(from);
        const toLang = getLanguageName(to);
        
        const prompt = `Translate the following text from ${fromLang} to ${toLang}.
Only return the direct translation, nothing else. No explanations, no additional text.

Text to translate: "${text}"`;

        const result = await model.generateContent(prompt);
        const translation = result.response.text().trim();
        
        // Remove any quotes that Gemini might add
        const cleanTranslation = translation.replace(/^["']|["']$/g, '');
        
        // Cache the translation
        try {
            await db.cacheTranslation(text, from, to, cleanTranslation);
        } catch (error) {
            console.warn('Failed to cache translation:', error);
        }
        
        return cleanTranslation;
    } catch (error) {
        console.error('Translation failed:', error);
        throw new Error('Translation service unavailable. Please try again.');
    }
};
