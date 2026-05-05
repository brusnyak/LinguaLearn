import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Word, UserSettings, UserProgress } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let supabase: SupabaseClient | null = null;

export function getSupabase() {
  if (!supabase && supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project-ref.supabase.co') {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'implicit', // Use hash fragment (simpler)
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true // Important: auto-detect session from URL
      }
    });
  }
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project-ref.supabase.co');
}

// Simple Google OAuth (more reliable than GitHub)
export async function signInWithGoogle() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');
  
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
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

// Simple GitHub OAuth  
export async function signInWithGitHub() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');
  
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
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
  
  const { data: { session } } = await client.auth.getSession();
  return session;
}

// Sync functions - simple upsert based on user_id
export async function syncWordsToSupabase(words: Word[]) {
  const client = getSupabase();
  if (!client) return;
  
  const session = await getCurrentSession();
  if (!session) return;
  
  const { error } = await client
    .from('words')
    .upsert(words.map(w => ({ ...w, user_id: session.user.id })), { onConflict: 'id' });
  
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
  
  return data || [];
}

export async function syncSettingsToSupabase(settings: UserSettings) {
  const client = getSupabase();
  if (!client) return;
  
  const session = await getCurrentSession();
  if (!session) return;
  
  const { error } = await client
    .from('user_settings')
    .upsert({ ...settings, user_id: session.user.id }, { onConflict: 'user_id' });
  
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
  
  return data;
}

export async function syncProgressToSupabase(progress: UserProgress) {
  const client = getSupabase();
  if (!client) return;
  
  const session = await getCurrentSession();
  if (!session) return;
  
  const { error } = await client
    .from('user_progress')
    .upsert({ ...progress, user_id: session.user.id }, { onConflict: 'user_id' });
  
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
  
  return data;
}
