import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Word, UserSettings, UserProgress } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Debug log (remove in production)
console.log('Supabase config check:', {
  url: supabaseUrl ? '✓ Set' : '✗ Missing',
  anonKey: supabaseAnonKey ? `✓ Set (${supabaseAnonKey.substring(0, 20)}...)` : '✗ Missing'
});

let supabase: SupabaseClient | null = null;

export function getSupabase() {
  if (!supabase && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    });
  }
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

// Google OAuth - implicit flow (hash fragment)
export async function signInWithGoogle() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');
  
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/auth/callback'
    }
  });
  
  if (error) throw error;
  return { data, error };
}

// Password-based login
export async function signInWithPassword(email: string, password: string) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');
  
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return { data, error };
}

// Sign up with email/password
export async function signUp(email: string, password: string) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');
  
  const { data, error } = await client.auth.signUp({
    email,
    password
  });
    
  if (error) throw error;
  return { data, error };
}

export async function signOut() {
  const client = getSupabase();
  if (!client) return;
  await client.auth.signOut();
}

export async function getCurrentSession() {
  const client = getSupabase();
  if (!client) return null;
  
  const { data: { session }, error } = await client.auth.getSession();
  if (error) {
    console.error('Session error:', error);
    return null;
  }
  return session;
}

// Helper to convert Word (camelCase) to Supabase format (snake_case)
function wordToSupabase(word: Word, userId: string) {
  return {
    id: word.id,
    user_id: userId,
    term: word.term,
    translation: word.translation,
    phonetic: word.phonetic || null,
    category: word.category || 'Other',
    type: word.type || 'word',
    mastery_level: word.masteryLevel || 0,
    last_reviewed: word.lastReviewed || 0,
    times_correct: word.timesCorrect || 0,
    is_mastered: word.isMastered || false,
    association: word.association || null,
    created_at: word.createdAt,
    updated_at: new Date().toISOString()
  };
}

// Helper to convert Supabase word (snake_case) to Word (camelCase)
function supabaseToWord(supabaseWord: any): Word {
  return {
    id: supabaseWord.id,
    userId: supabaseWord.user_id,
    term: supabaseWord.term,
    translation: supabaseWord.translation,
    phonetic: supabaseWord.phonetic || undefined,
    category: supabaseWord.category || 'Other',
    type: supabaseWord.type as 'word' | 'phrase' || 'word',
    masteryLevel: supabaseWord.mastery_level || 0,
    lastReviewed: supabaseWord.last_reviewed || 0,
    timesCorrect: supabaseWord.times_correct || 0,
    isMastered: supabaseWord.is_mastered || false,
    association: supabaseWord.association || undefined,
    createdAt: supabaseWord.created_at
  };
}

// Sync functions
export async function syncWordsToSupabase(words: Word[]) {
  const client = getSupabase();
  if (!client) return;
  
  const session = await getCurrentSession();
  if (!session) return;
  
  const { error } = await client
    .from('words')
    .upsert(words.map(w => wordToSupabase(w, session.user.id)), { onConflict: 'id' });
  
  if (error) console.error('Failed to sync words:', error);
}

export async function syncWordsFromSupabase(): Promise<Word[]> {
  const client = getSupabase();
  if (!client) return [];
  
  const session = await getCurrentSession();
  if (!session) return [];
  
  const { data, error } = await client
    .from('words')
    .select('*')
    .eq('user_id', session.user.id);
  
  if (error) {
    console.error('Failed to fetch words:', error);
    return [];
  }
  
  return (data || []).map(supabaseToWord);
}

// Helper to convert UserSettings (camelCase) to Supabase format (snake_case)
function settingsToSupabase(settings: UserSettings, userId: string) {
  return {
    user_id: userId,
    profile: settings.profile || null,
    theme: settings.theme || 'system',
    notifications_enabled: settings.notificationsEnabled || false,
    notification_time: settings.notificationTime || '08:00',
    daily_goal: settings.dailyGoal || 5,
    auto_read_flashcards: settings.autoReadFlashcards || false,
    updated_at: new Date().toISOString()
  };
}

// Helper to convert Supabase settings (snake_case) to UserSettings (camelCase)
function supabaseToSettings(supabaseSettings: any): UserSettings {
  return {
    userId: supabaseSettings.user_id,
    profile: supabaseSettings.profile || undefined,
    theme: supabaseSettings.theme as 'light' | 'dark' | 'system' || 'system',
    notificationsEnabled: supabaseSettings.notifications_enabled || false,
    notificationTime: supabaseSettings.notification_time || '08:00',
    dailyGoal: supabaseSettings.daily_goal || 5,
    autoReadFlashcards: supabaseSettings.auto_read_flashcards || false
  };
}

export async function syncSettingsToSupabase(settings: UserSettings) {
  const client = getSupabase();
  if (!client) return;
  
  const session = await getCurrentSession();
  if (!session) return;  
  const { error } = await client
    .from('user_settings')
    .upsert(settingsToSupabase(settings, session.user.id), { onConflict: 'user_id' });  
  if (error) console.error('Failed to sync settings:', error);
}

export async function syncSettingsFromSupabase(): Promise<UserSettings | null> {
  const client = getSupabase();
  if (!client) return null;  
  const session = await getCurrentSession();
  if (!session) return null;  
  const { data, error } = await client
    .from('user_settings')
    .select('*')
    .eq('user_id', session.user.id)
    .single();  
  if (error) {
    if (error.code !== 'PGRST116') console.error('Failed to fetch settings:', error);
    return null;
  }  
  return data ? supabaseToSettings(data) : null;
}

// Helper to convert UserProgress (camelCase) to Supabase format (snake_case)
function progressToSupabase(progress: UserProgress, userId: string) {
  return {
    user_id: userId,
    current_streak: progress.currentStreak || 0,
    last_study_date: progress.lastStudyDate || '',
    study_history: progress.studyHistory || [],
    xp: progress.xp || 0,
    level: progress.level || 1,
    completed_dungeon_levels: progress.completedDungeonLevels || [],
    updated_at: new Date().toISOString()
  };
}

// Helper to convert Supabase progress (snake_case) to UserProgress (camelCase)
function supabaseToProgress(supabaseProgress: any): UserProgress {
  return {
    userId: supabaseProgress.user_id,
    currentStreak: supabaseProgress.current_streak || 0,
    lastStudyDate: supabaseProgress.last_study_date || '',
    studyHistory: supabaseProgress.study_history || [],
    xp: supabaseProgress.xp || 0,
    level: supabaseProgress.level || 1,
    completedDungeonLevels: supabaseProgress.completed_dungeon_levels || []
  };
}

export async function syncProgressToSupabase(progress: UserProgress) {
  const client = getSupabase();
  if (!client) return;  
  const session = await getCurrentSession();
  if (!session) return;  
  const { error } = await client
    .from('user_progress')
    .upsert(progressToSupabase(progress, session.user.id), { onConflict: 'user_id' });  
  if (error) console.error('Failed to sync progress:', error);
}

export async function syncProgressFromSupabase(): Promise<UserProgress | null> {
  const client = getSupabase();
  if (!client) return null;  
  const session = await getCurrentSession();
  if (!session) return null;  
  const { data, error } = await client
    .from('user_progress')
    .select('*')
    .eq('user_id', session.user.id)
    .single();  
  if (error) {
    if (error.code !== 'PGRST116') console.error('Failed to fetch progress:', error);
    return null;
  }  
  return data ? supabaseToProgress(data) : null;
}

// Profile management
export async function getProfile(userId: string) {
  const client = getSupabase();
  if (!client) return null;
  
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
  return data;
}

export async function updateProfile(userId: string, updates: any) {
  const client = getSupabase();
  if (!client) return;
  
  const { error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', userId);
    
  if (error) console.error('Failed to update profile:', error);
}
