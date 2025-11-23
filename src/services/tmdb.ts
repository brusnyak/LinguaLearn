const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '6559ac2ee525595dd90a994feb5bcb71';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Language code mapping
const LANGUAGE_MAP: Record<string, string> = {
    'English': 'en',
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Ukrainian': 'uk',
    'Italian': 'it',
    'Portuguese': 'pt',
    'Russian': 'ru',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Chinese': 'zh'
};

export interface TMDBMovie {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
    release_date: string;
    original_language: string;
    genre_ids: number[];
}

export interface TMDBTVShow {
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
    first_air_date: string;
    original_language: string;
    genre_ids: number[];
}

export const getLanguageCode = (language: string): string => {
    return LANGUAGE_MAP[language] || 'en';
};

export const getPosterUrl = (path: string | null): string => {
    if (!path) return 'https://via.placeholder.com/500x750?text=No+Poster';
    return `${TMDB_IMAGE_BASE}${path}`;
};

// Genre IDs for filtering
const BEGINNER_GENRES = [16, 10751]; // Animation, Family
const INTERMEDIATE_GENRES = [35, 18]; // Comedy, Drama

export const getMoviesByLanguage = async (
    language: string,
    level: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
    page: number = 1
): Promise<TMDBMovie[]> => {
    try {
        const languageCode = getLanguageCode(language);
        let url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${languageCode}&sort_by=popularity.desc&page=${page}`;

        // Add level-based filtering
        if (level === 'beginner') {
            url += `&with_genres=${BEGINNER_GENRES.join(',')}&vote_average.gte=7`;
        } else if (level === 'intermediate') {
            url += `&with_genres=${INTERMEDIATE_GENRES.join(',')}&vote_average.gte=6`;
        } else {
            // Advanced: all content, but highly rated
            url += `&vote_average.gte=6`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch movies');

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching movies:', error);
        return [];
    }
};

export const getTVShowsByLanguage = async (
    language: string,
    level: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
    page: number = 1
): Promise<TMDBTVShow[]> => {
    try {
        const languageCode = getLanguageCode(language);
        let url = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=${languageCode}&sort_by=popularity.desc&page=${page}`;

        // Add level-based filtering
        if (level === 'beginner') {
            url += `&with_genres=${BEGINNER_GENRES.join(',')}&vote_average.gte=7`;
        } else if (level === 'intermediate') {
            url += `&with_genres=${INTERMEDIATE_GENRES.join(',')}&vote_average.gte=6`;
        } else {
            url += `&vote_average.gte=6`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch TV shows');

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching TV shows:', error);
        return [];
    }
};
