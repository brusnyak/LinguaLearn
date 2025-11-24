import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn('Gemini API key not found. Story generation will not work.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export interface Story {
    id: string;
    title: string;
    content: string; // Full story text
    level: 'beginner' | 'intermediate' | 'advanced';
    topic: string;
    language: string;
    createdAt: number;
}

export interface StorySegment {
    text: string;
    translation?: string; // Lazy-loaded translation
}

/**
 * Generate a story using Gemini AI based on user level, topic, and target language
 */
export async function generateStory(
    language: string,
    level: 'beginner' | 'intermediate' | 'advanced',
    topic: string
): Promise<Story> {
    if (!genAI) {
        throw new Error('Gemini API not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
        const result = await model.generateContent(prompt);
        const response = result.response;
        const storyText = response.text().trim();

        // Generate a title
        const titlePrompt = `Based on this story in ${language}, create a SHORT title (2-5 words) in ${language}:\n\n${storyText}\n\nProvide ONLY the title, nothing else.`;
        const titleResult = await model.generateContent(titlePrompt);
        const title = titleResult.response.text().trim();

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
    } catch (error) {
        console.error('Error generating story:', error);
        throw new Error('Failed to generate story. Please check your API key and try again.');
    }
}

/**
 * Translate a text segment using Gemini AI
 */
export async function translateText(text: string, fromLanguage: string, toLanguage: string = 'English'): Promise<string> {
    if (!genAI) {
        throw new Error('Gemini API not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Translate this ${fromLanguage} text to ${toLanguage}. Provide ONLY the translation, nothing else:\n\n${text}`;

    try {
        const result = await model.generateContent(prompt);
        const translation = result.response.text().trim();
        return translation;
    } catch (error) {
        console.error('Error translating text:', error);
        throw new Error('Translation failed');
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
