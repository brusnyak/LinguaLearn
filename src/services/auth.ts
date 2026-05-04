import { v4 as uuidv4 } from 'uuid';
import type { User, UserProfile } from '../types';
import { getSupabase, isSupabaseConfigured, signInWithGitHub, signInWithPassword, signUp, signOut, getCurrentSession } from './supabase';

// Password hashing using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Current DB version - must match db.ts
const DB_VERSION = 5;

// Get all users from IndexedDB (fallback for local-only mode)
export async function getAllUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('lingua-learn-db', DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('users')) {
                db.createObjectStore('users', { keyPath: 'id' });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('users')) {
                resolve([]);
                return;
            }
            const transaction = db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
    });
}

// Login user - supports both Supabase and local auth
export async function loginUser(username: string, password: string): Promise<User | null> {
    if (isSupabaseConfigured()) {
        try {
            const result = await signInWithPassword(username, password);
            if (!result?.data?.user) return null;

            // Get user profile from Supabase
            const supabase = getSupabase();
            const { data: profile } = await supabase!
                .from('user_settings')
                .select('profile')
                .eq('user_id', result.data.user.id)
                .single();

            const user: User = {
                id: result.data.user.id,
                username: result.data.user.email || username,
                passwordHash: '',
                profile: profile?.profile || { name: '', nativeLanguage: 'uk', targetLanguage: 'en', level: 'beginner' },
                createdAt: new Date(result.data.user.created_at || Date.now()).getTime(),
                lastLogin: Date.now()
            };

            localStorage.setItem('currentUserId', user.id);
            return user;
        } catch (err) {
            console.error('Supabase login error:', err);
            return null;
        }
    }

    // Fallback to local auth
    if (!username || !password) return null;

    const users = await getAllUsers();
    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!user) return null;

    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.passwordHash) return null;

    user.lastLogin = Date.now();
    await updateUser(user);

    localStorage.setItem('currentUserId', user.id);
    return user;
}

// Login with GitHub
export async function loginWithGitHub(): Promise<void> {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }
    await signInWithGitHub();
}

// Create new user - supports both Supabase and local auth
export async function createUser(
    username: string,
    password: string,
    profile: UserProfile
): Promise<User> {
    if (isSupabaseConfigured()) {
        try {
            const result = await signUp(username, password);
            if (!result?.data?.user) throw new Error('User creation failed');

            // Save profile to user_settings
            const supabase = getSupabase();
            await supabase!
                .from('user_settings')
                .insert({
                    user_id: result.data.user.id,
                    profile,
                    theme: 'system',
                    notifications_enabled: false,
                    notification_time: '08:00',
                    daily_goal: 5,
                    auto_read_flashcards: false
                });

            const user: User = {
                id: result.data.user.id,
                username,
                passwordHash: '',
                profile,
                createdAt: Date.now(),
                lastLogin: Date.now()
            };

            localStorage.setItem('currentUserId', user.id);
            return user;
        } catch (err: any) {
            throw new Error(err.message || 'Failed to create user');
        }
    }

    // Fallback to local auth
    if (!username || username.trim().length === 0) throw new Error('Username is required');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
    if (username.length > 50) throw new Error('Username must be 50 characters or less');

    const existingUsers = await getAllUsers();
    const duplicate = existingUsers.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (duplicate) throw new Error('Username already exists');

    const passwordHash = await hashPassword(password);

    const user: User = {
        id: uuidv4(),
        username: username.trim(),
        passwordHash,
        profile,
        createdAt: Date.now(),
        lastLogin: Date.now()
    };

    return new Promise((resolve, reject) => {
        const request = indexedDB.open('lingua-learn-db', DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const addRequest = store.add(user);

            addRequest.onsuccess = () => {
                localStorage.setItem('currentUserId', user.id);
                resolve(user);
            };
            addRequest.onerror = () => reject(addRequest.error);
        };
    });
}

// Update user (local only)
async function updateUser(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('lingua-learn-db', DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const updateRequest = store.put(user);

            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject(updateRequest.error);
        };
    });
}

// Logout user
export function logoutUser(): void {
    if (isSupabaseConfigured()) {
        signOut();
    }
    localStorage.removeItem('currentUserId');
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
    if (isSupabaseConfigured()) {
        const session = await getCurrentSession();
        if (!session) return null;

        const supabase = getSupabase();
        const { data: profile } = await supabase!
            .from('user_settings')
            .select('profile')
            .eq('user_id', session.user.id)
            .single();

        return {
            id: session.user.id,
            username: session.user.email || 'user',
            passwordHash: '',
            profile: profile?.profile || { name: '', nativeLanguage: 'uk', targetLanguage: 'en', level: 'beginner' },
            createdAt: new Date(session.user.created_at).getTime(),
            lastLogin: Date.now()
        };
    }

    const userId = localStorage.getItem('currentUserId');
    if (!userId) return null;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open('lingua-learn-db', DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('users')) {
                resolve(null);
                return;
            }
            const transaction = db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const getRequest = store.get(userId);

            getRequest.onsuccess = () => resolve(getRequest.result || null);
            getRequest.onerror = () => reject(getRequest.error);
        };
    });
}

// Get current user ID (synchronous)
export function getCurrentUserId(): string | null {
    return localStorage.getItem('currentUserId');
}

// Check if Supabase auth is enabled
export function isUsingSupabaseAuth(): boolean {
    return isSupabaseConfigured();
}
