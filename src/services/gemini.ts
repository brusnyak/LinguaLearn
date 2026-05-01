// AI Story Generation Service
// Uses OpenRouter as primary (free), falls back to Gemini if needed

import { generateStory, translateText, STORY_TOPICS, type Story } from './openrouter';
export { generateStory, translateText, STORY_TOPICS };
export type { Story };

// Export for backwards compatibility
export { generateStory as generateStoryWithGemini, translateText as translateTextWithGemini };
