// OpenRouter AI service for story generation
// Replaces Google Gemini with free OpenRouter API

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.openrouter_key;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!API_KEY) {
    console.warn('OpenRouter API key not found. Story generation will not work.');
} else {
    console.log('OpenRouter API initialized with key:', API_KEY.substring(0, 15) + '...');
}

export interface Story {
    id: string;
    title: string;
    content: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    topic: string;
    language: string;
    createdAt: number;
}

export interface StorySegment {
    text: string;
    translation?: string;
}

/**
 * Generate a story using OpenRouter AI based on user level, topic, and target language
 */
export async function generateStory(
    language: string,
    level: 'beginner' | 'intermediate' | 'advanced',
    topic: string
): Promise<Story> {
    if (!API_KEY) {
        throw new Error('OpenRouter API not configured');
    }

    const levelInstructions = {
        beginner: 'Use simple vocabulary and short sentences (A1-A2 level). Keep the story around 150-200 words.',
        intermediate: 'Use moderate vocabulary and varied sentence structures (B1-B2 level). Keep the story around 250-350 words.',
        advanced: 'Use advanced vocabulary and complex sentence structures (C1-C2 level). Keep the story around 400-500 words.',
    };

    const prompt = `Write a ${level} level story in ${language} about "${topic}". 
${levelInstructions[level]}

Requirements:
- Write the story in ${language} ONLY
- Make it engaging and culturally relevant
- Use natural, conversational language
- Include dialogue if appropriate
- DO NOT include any English text or translations
- DO NOT include a title

Just provide the story text.`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'LinguaLearn',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-exp-1219', // Free model on OpenRouter
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenRouter error: ${error}`);
        }

        const data = await response.json();
        const storyText = data.choices?.[0]?.message?.content?.trim() || '';

        if (!storyText) {
            throw new Error('No story content returned');
        }

        // Generate a title
        const titlePrompt = `Based on this story in ${language}, create a SHORT title (2-5 words) in ${language}:\n\n${storyText}\n\nProvide ONLY the title, nothing else.`;

        const titleResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'LinguaLearn',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-exp-1219',
                messages: [
                    { role: 'user', content: titlePrompt }
                ],
                max_tokens: 50,
            }),
        });

        const titleData = await titleResponse.json();
        const title = titleData.choices?.[0]?.message?.content?.trim() || 'Untitled Story';

        const story: Story = {
            id: `story-${Date.now()}`,
            title,
            content: storyText,
            level,
            topic,
            language,
            createdAt: Date.now(),
        };

        return story;
    } catch (error: any) {
        console.error('Error generating story:', error);
        throw new Error('Failed to generate story. Please check your API key and try again.');
    }
}

/**
 * Translate a text segment using OpenRouter AI
 */
export async function translateText(text: string, fromLanguage: string, toLanguage: string = 'English'): Promise<string> {
    if (!API_KEY) {
        throw new Error('OpenRouter API not configured');
    }

    const prompt = `Translate this ${fromLanguage} text to ${toLanguage}. Provide ONLY the translation, nothing else:\n\n${text}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'LinguaLearn',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-exp-1219',
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 1000,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenRouter error: ${error}`);
        }

        const data = await response.json();
        const translation = data.choices?.[0]?.message?.content?.trim() || '';

        return translation;
    } catch (error: any) {
        console.error('Error translating text:', error);
        throw new Error('Translation failed');
    }
}

/**
 * Generate a memory association for a word using OpenRouter AI
 */
export async function generateAssociation(word: string, translation: string): Promise<string> {
    if (!API_KEY) {
        return `Think of "${translation}" when you see "${word}".`;
    }

    const prompt = `Create a short, memorable memory association (mnemonic) to help remember that the English word "${word}" means "${translation}".

Requirements:
- Keep it under 100 characters
- Make it vivid, funny, or surprising
- Use the sounds or spelling of the words
- Provide ONLY the association text, nothing else

Example 1: Word "cat" = "кіт" (Ukrainian) → "A CAT says 'кіт-кіт'"
Example 2: Word "apple" = "яблуко" → "An APPLE a day keeps the 'ябеда' away"`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'LinguaLearn',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-exp-1219',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenRouter error: ${error}`);
        }

        const data = await response.json();
        const association = data.choices?.[0]?.message?.content?.trim() || '';
        return association || `Think of "${translation}" when you see "${word}".`;
    } catch (error) {
        console.error('Error generating association:', error);
        return `Think of "${translation}" when you see "${word}".`;
    }
}

/**
 * Get story topics suggestions
 */
export const STORY_TOPICS = [
    'Daily Life',
    'Travel',
    'Food & Cooking',
    'Family & Friends',
    'Work & Career',
    'Hobbies',
    'Nature & Environment',
    'Technology',
    'History',
    'Mystery',
    'Romance',
    'Adventure',
    'Science Fiction',
    'Culture & Traditions',
];
