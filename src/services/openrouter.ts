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
                model: 'openrouter/free', // Free model on OpenRouter
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
                model: 'openrouter/free',
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
    } catch (error: unknown) {
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
                model: 'openrouter/free',
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
    } catch (error: unknown) {
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
                model: 'openrouter/free',
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
 * Generate scenario-appropriate words from user's vocabulary using AI
 */
export async function generateScenarioWords(
    userWords: string[],
    scenario: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced'
): Promise<string[]> {
    // Pre-filter words to remove obviously inappropriate ones
    const preFilteredWords = userWords.filter(word => {
        const lowerWord = word.toLowerCase();
        
        // Basic quality filters
        if (word.length < 3 || word.length > 12) return false;
        if (!/^[a-z]+$/.test(word)) return false;
        
        // Scenario-specific inappropriate words
        const inappropriateWords = {
            emergency: ['create', 'make', 'build', 'design', 'develop', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'document', 'application', 'software', 'computer', 'technology', 'digital', 'online', 'website', 'internet', 'email', 'message', 'notification', 'update', 'install', 'download', 'upload', 'save', 'delete', 'edit', 'copy', 'paste', 'cut', 'search', 'find', 'replace', 'format', 'print', 'scan', 'upload', 'download'],
            restaurant: ['create', 'make', 'build', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'computer', 'technology', 'digital', 'software', 'application', 'internet', 'email', 'website'],
            hotel: ['create', 'make', 'build', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'computer', 'technology', 'digital', 'software', 'application', 'internet', 'email'],
            shopping: ['create', 'build', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'computer', 'technology', 'digital', 'software', 'application', 'internet', 'email'],
            directions: ['create', 'make', 'build', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'computer', 'technology', 'digital', 'software', 'application', 'internet', 'email'],
            greeting: ['create', 'build', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'computer', 'technology', 'digital', 'software', 'application', 'internet', 'email']
        };
        
        const scenarioInappropriate = inappropriateWords[scenario as keyof typeof inappropriateWords] || [];
        if (scenarioInappropriate.includes(lowerWord)) return false;
        
        // General inappropriate words for all scenarios
        const generalInappropriate = ['citation', 'complex', 'algorithm', 'system', 'data', 'file', 'document', 'application', 'software', 'computer', 'technology', 'digital', 'online', 'website', 'internet', 'email', 'message', 'notification', 'update', 'install', 'download', 'upload', 'save', 'delete', 'edit', 'copy', 'paste', 'cut', 'search', 'find', 'replace', 'format', 'print', 'scan', 'code', 'program', 'develop', 'design', 'build'];
        
        return !generalInappropriate.includes(lowerWord);
    });

    if (!API_KEY) {
        // Fallback to pre-filtered words if no API key
        return preFilteredWords.slice(0, 8);
    }

    const prompt = `I need to select the most appropriate words from this vocabulary list for a "${scenario}" scenario at ${difficulty} level.

Available vocabulary: ${preFilteredWords.join(', ')}

CRITICAL REQUIREMENTS:
- Select 8-12 words that are PERFECTLY suited for ${scenario} situations
- Each word MUST be something people would actually say/use in ${scenario} contexts
- ABSOLUTELY NO technical words, abstract concepts, or unrelated terms
- ${difficulty === 'beginner' ? 'Choose ONLY simple, everyday words' : difficulty === 'intermediate' ? 'Choose moderately common practical words' : 'Choose sophisticated but practical words'}

Scenario Examples:
- Emergency: "help", "doctor", "hospital", "police", "phone", "medicine", "pain", "hurt", "urgent", "quick"
- Restaurant: "menu", "order", "table", "food", "drink", "bill", "waiter", "service", "price", "pay"
- Hotel: "room", "key", "bed", "bathroom", "reception", "check", "reservation", "floor", "help", "night"
- Shopping: "price", "cost", "buy", "pay", "bag", "store", "item", "product", "sale", "discount"
- Directions: "street", "road", "left", "right", "turn", "walk", "go", "near", "far", "help"
- Greeting: "hello", "good", "morning", "nice", "meet", "name", "thank", "please", "welcome", "see"

Return ONLY a JSON array of perfectly appropriate words: ["word1", "word2", ...]`;

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
                model: 'openrouter/free',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenRouter error: ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.choices?.[0]?.message?.content?.trim() || '';
        
        // Parse the JSON array from the response
        const wordsMatch = result.match(/\[.*?]/);
        if (wordsMatch) {
            try {
                const words = JSON.parse(wordsMatch[0]);
                return Array.isArray(words) ? words.slice(0, 12) : [];
            } catch {
                // If parsing fails, extract words manually
                return result
                    .replace(/[\[\]]/g, '')
                    .split(',')
                    .map((w: string) => w.trim().replace(/['"]/g, ''))
                    .filter((w: string) => w && userWords.includes(w))
                    .slice(0, 12);
            }
        }

        // Fallback: extract words from response
        return result
            .split(',')
            .map((w: string) => w.trim().replace(/['"]/g, ''))
            .filter((w: string) => w && userWords.includes(w))
            .slice(0, 12);
    } catch (error) {
        console.error('Error generating scenario words:', error);
        
        // Scenario-specific fallback word pools
        const fallbackWords: Record<string, string[]> = {
            emergency: ['help', 'doctor', 'hospital', 'police', 'phone', 'medicine', 'pain', 'hurt', 'urgent', 'quick', 'call', 'ambulance'],
            restaurant: ['menu', 'order', 'table', 'food', 'drink', 'bill', 'waiter', 'service', 'price', 'pay', 'water', 'coffee'],
            hotel: ['room', 'key', 'bed', 'bathroom', 'reception', 'check', 'reservation', 'floor', 'help', 'night', 'door', 'window'],
            shopping: ['price', 'cost', 'buy', 'pay', 'bag', 'store', 'item', 'product', 'sale', 'discount', 'size', 'color'],
            directions: ['street', 'road', 'left', 'right', 'turn', 'walk', 'go', 'near', 'far', 'help', 'address', 'location'],
            greeting: ['hello', 'good', 'morning', 'nice', 'meet', 'name', 'thank', 'please', 'welcome', 'see', 'evening', 'fine']
        };
        
        const scenarioFallback = fallbackWords[scenario] || fallbackWords.greeting;
        
        // Try to use user's words that match fallback words
        const userMatches = preFilteredWords.filter(word => 
            scenarioFallback.includes(word.toLowerCase())
        );
        
        // If we have enough user matches, use them
        if (userMatches.length >= 6) {
            return userMatches.slice(0, 8);
        }
        
        // Otherwise, use fallback words that exist in user vocabulary
        const availableFallbacks = scenarioFallback.filter(word => 
            preFilteredWords.includes(word)
        );
        
        if (availableFallbacks.length >= 4) {
            return availableFallbacks.slice(0, 8);
        }
        
        // Last resort: use basic filtering
        return preFilteredWords.slice(0, 8);
    }
}

/**
 * Generate a natural practice phrase for a specific scenario and word
 */
export async function generatePracticePhrase(
    word: string,
    scenario: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced'
): Promise<string> {
    // Pre-validate the word to ensure it's appropriate for the scenario
    const inappropriateWords = {
        emergency: ['create', 'make', 'build', 'design', 'develop', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'document', 'application', 'software', 'computer', 'technology', 'digital'],
        restaurant: ['create', 'make', 'build', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'computer', 'technology', 'digital', 'software'],
        hotel: ['create', 'make', 'build', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'computer', 'technology', 'digital', 'software'],
        shopping: ['create', 'build', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'computer', 'technology', 'digital', 'software'],
        directions: ['create', 'make', 'build', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'computer', 'technology', 'digital', 'software'],
        greeting: ['create', 'build', 'code', 'program', 'system', 'algorithm', 'data', 'file', 'computer', 'technology', 'digital', 'software']
    };
    
    const scenarioInappropriate = inappropriateWords[scenario as keyof typeof inappropriateWords] || [];
    if (scenarioInappropriate.includes(word.toLowerCase())) {
        // Word is inappropriate - return a fallback phrase that makes sense
        const fallbackPhrases: Record<string, string> = {
            emergency: "I need help immediately!",
            restaurant: "Can I see the menu, please?",
            hotel: "I need help with my room.",
            shopping: "How much does this cost?",
            directions: "Excuse me, can you help me?",
            greeting: "Hello, nice to meet you!"
        };
        return fallbackPhrases[scenario] || "Can you help me?";
    }

    if (!API_KEY) {
        // Fallback templates
        const templates: Record<string, string> = {
            restaurant: `I would like to order the ${word}, please.`,
            hotel: `Can you help me with the ${word}?`,
            shopping: `How much does this ${word} cost?`,
            directions: `Excuse me, where is the ${word}?`,
            emergency: `I need help with the ${word}!`,
            greeting: `It's nice to ${word} you!`,
        };
        return templates[scenario] || `Can you help me with the ${word}?`;
    }

    const prompt = `Generate a natural, practical English phrase someone would say in a ${scenario} situation using the word "${word}".

CRITICAL REQUIREMENTS:
- The phrase MUST be natural and realistic for ${scenario} situations
- The word "${word}" must fit perfectly into the phrase context
- ${difficulty === 'beginner' ? 'Use simple grammar and common vocabulary' : difficulty === 'intermediate' ? 'Use moderately complex sentences' : 'Use sophisticated but natural language'}
- Keep it under 15 words
- The phrase must be something people would ACTUALLY say in real life
- If "${word}" doesn't fit naturally in ${scenario}, create a phrase that uses a related concept

Perfect Examples:
- Word: "menu", Scenario: "restaurant" → "Can I see the menu, please?"
- Word: "room", Scenario: "hotel" → "I need help with my room key."
- Word: "price", Scenario: "shopping" → "What's the price of this item?"
- Word: "help", Scenario: "emergency" → "I need help right now!"
- Word: "hello", Scenario: "greeting" → "Hello, it's nice to meet you."

Provide ONLY the perfect phrase, nothing else:`;

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
                model: 'openrouter/free',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 100,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenRouter error: ${response.statusText}`);
        }

        const data = await response.json();
        const phrase = data.choices?.[0]?.message?.content?.trim() || '';
        
        // Clean up the response and validate it
        const cleanedPhrase = phrase.replace(/['"]/g, '').trim();
        
        // Validate the generated phrase
        if (cleanedPhrase.toLowerCase().includes(word.toLowerCase()) && 
            cleanedPhrase.length > 5 && 
            cleanedPhrase.length < 100 &&
            !cleanedPhrase.includes('undefined') &&
            !cleanedPhrase.includes('null')) {
            return cleanedPhrase;
        }
        
        // Fallback if AI doesn't include the word properly or generates invalid content
        const fallbackTemplates: Record<string, string> = {
            restaurant: `I would like to order the ${word}, please.`,
            hotel: `Can you help me with the ${word}?`,
            shopping: `How much does this ${word} cost?`,
            directions: `Excuse me, where is the ${word}?`,
            emergency: `I need help with the ${word}!`,
            greeting: `It's nice to ${word} you!`,
        };
        return fallbackTemplates[scenario] || `Can you help me with the ${word}?`;
    } catch (error) {
        console.error('Error generating practice phrase:', error);
        // Robust fallback templates
        const fallbackTemplates: Record<string, string> = {
            restaurant: `I would like to order the ${word}, please.`,
            hotel: `Can you help me with the ${word}?`,
            shopping: `How much does this ${word} cost?`,
            directions: `Excuse me, where is the ${word}?`,
            emergency: `I need help with the ${word}!`,
            greeting: `It's nice to ${word} you!`,
        };
        return fallbackTemplates[scenario] || `Can you help me with the ${word}?`;
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
