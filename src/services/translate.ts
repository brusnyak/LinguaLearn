// Simple wrapper around a free translation API
// We'll use MyMemory API for now as it doesn't require an API key for small usage.
// In production, we'd want a more robust solution or a proxy.

const API_URL = 'https://api.mymemory.translated.net/get';

export const translateText = async (text: string, from: string, to: string): Promise<string> => {
    if (!text) return '';

    try {
        const response = await fetch(`${API_URL}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
        const data = await response.json();

        if (data.responseStatus === 200) {
            const translated = data.responseData.translatedText.trim();
            // If translation is identical to input (case-insensitive), it likely failed or wasn't found
            if (translated.toLowerCase() === text.toLowerCase()) {
                return '';
            }
            return translated;
        } else {
            console.warn('Translation API error:', data.responseDetails);
            return ''; // Fallback or throw
        }
    } catch (error) {
        console.error('Translation request failed:', error);
        return '';
    }
};
