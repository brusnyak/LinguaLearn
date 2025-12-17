// Translation service with multiple providers and fallback
import { db } from './db';

const LIBRE_TRANSLATE_URL = '/api/translate'; // Proxied in dev/prod
const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get';

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

    // Try providers in order
    try {
        // 1. Try LibreTranslate (via Proxy)
        try {
            console.log('Trying LibreTranslate...');
            return await translateWithLibre(text, from, to);
        } catch (libreError) {
            console.warn('LibreTranslate failed, trying fallback...', libreError);
        }

        // 2. Try MyMemory (Direct)
        try {
            console.log('Trying MyMemory...');
            return await translateWithMyMemory(text, from, to);
        } catch (myMemError) {
             console.warn('MyMemory failed, trying fallback...', myMemError);
        }

        // 3. Try Google Translate (Unofficial)
        console.log('Trying Google Translate...');
        return await translateWithGoogle(text, from, to);

    } catch (error) {
        console.error('All translation providers failed:', error);
        throw new Error('Translation service unavailable. Please try again later.');
    }
};

const translateWithLibre = async (text: string, from: string, to: string): Promise<string> => {
    const response = await fetch(LIBRE_TRANSLATE_URL, {
        method: 'POST',
        body: JSON.stringify({
            q: text,
            source: from,
            target: to,
            format: 'text',
            api_key: ''
        }),
        headers: { 'Content-Type': 'application/json' }
    });

    // Check for non-JSON responses (like HTML error pages)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const textBody = await response.text();
        throw new Error(`Invalid response format: ${textBody.substring(0, 50)}...`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    if (!data.translatedText) throw new Error('No translation returned');

    await cacheResult(text, from, to, data.translatedText);
    return data.translatedText;
};

const translateWithMyMemory = async (text: string, from: string, to: string): Promise<string> => {
    // MyMemory requires email for more quota, but works without for small usage
    const url = `${MYMEMORY_API_URL}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus !== 200) {
        // Only throw if strictly necessary, otherwise try next provider
        throw new Error(data.responseDetails || 'MyMemory error');
    }

    // Try to find a better match than the default
    let bestTranslation = data.responseData.translatedText;
    
    // Check matches for potential better quality
    if (data.matches && Array.isArray(data.matches)) {
        // Prioritize matches that:
        // 1. Have high quality/match score
        // 2. Are NOT identical to source (unless source is same as target word, unlikely)
        // 3. Keep capitalization rules
        const candidates = data.matches.filter((m: any) => 
            m.translation && 
            m.translation.toLowerCase() !== text.toLowerCase() &&
            (m.quality > 0 || m.match > 0.8)
        );
        
        if (candidates.length > 0) {
             // Heuristic: pick the one with highest quality
             const best = candidates.reduce((prev: any, current: any) => 
                (current.quality > prev.quality) ? current : prev
             );
             bestTranslation = best.translation;
        }
    }

    if (!bestTranslation) throw new Error('No translation returned');

    await cacheResult(text, from, to, bestTranslation);
    return bestTranslation;
};

// Fallback: Google Translate (Unofficial - use with caution/care)
const translateWithGoogle = async (text: string, from: string, to: string): Promise<string> => {
     // Single word fallback mostly
     const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
     const response = await fetch(url);
     const data = await response.json();
     // Structure: [[["translated", "source", ...], ...], ...]
     if (data && data[0] && data[0][0] && data[0][0][0]) {
         const translation = data[0][0][0];
         await cacheResult(text, from, to, translation);
         return translation;
     }
     throw new Error('Google Translate format changed');
};

const cacheResult = async (text: string, from: string, to: string, translation: string) => {
    try {
        await db.cacheTranslation(text, from, to, translation);
    } catch (error) {
        console.warn('Failed to cache translation:', error);
    }
};
