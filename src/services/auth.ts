import { v4 as uuidv4 } from 'uuid';
import type { User, UserProfile } from '../types';
import { getSupabase, isSupabaseConfigured, signInWithGitHub, signInWithGoogle, signInWithPassword, signUp, signOut, getCurrentSession } from './supabase';

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
// Priority: local auth for existing users, Supabase for new email-based users
export async function loginUser(username: string, password: string): Promise<User | null> {
    // Check if this is an existing local user first (username, not email)
    const existingLocalUser = await findLocalUserByUsername(username);

    if (existingLocalUser) {
        // Existing local user - authenticate locally
        const user = await localLogin(username, password);
        if (user) {
            localStorage.setItem('currentUserId', user.id);
            return user;
        }
        // If local auth fails (wrong password), fall through to Supabase
    }

    // Try Supabase if configured (for email-based login or new users)
    if (isSupabaseConfigured() && username.includes('@')) {
        try {
            const result = await signInWithPassword(username, password);
            if (result?.data?.user) {
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
            }
        } catch (err: any) {
            console.error('Supabase login error:', err);
        }
    }

    // Final fallback: try local auth
    return await localLogin(username, password);
}

// Helper to check if a local user exists
async function findLocalUserByUsername(username: string): Promise<User | null> {
    const users = await getAllUsers();
    return users.find(u => u.username.toLowerCase() === username.trim().toLowerCase()) || null;
}

// Local auth helper for createUser
async function localCreateUser(
    username: string,
    password: string,
    profile: UserProfile
): Promise<User> {
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

// Local auth helper for loginUser
async function localLogin(username: string, password: string): Promise<User | null> {
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

// Login with Google
export async function loginWithGoogle(): Promise<void> {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase not configured');
    }
    await signInWithGoogle();
}

// Create new user - supports both Supabase and local auth
export async function createUser(
    username: string,
    password: string,
    profile: UserProfile
): Promise<User> {
    // Try Supabase first if configured
    if (isSupabaseConfigured()) {
        try {
            const result = await signUp(username, password);
            if (!result?.data?.user) {
                console.log('Supabase signup returned no user, falling back to local auth...');
                return await localCreateUser(username, password, profile);
            }

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
            console.error('Supabase createUser error:', err.message || err);
            console.log('Falling back to local auth...');
        }
    }

    // Fallback to local auth (or if Supabase not configured)
    return await localCreateUser(username, password, profile);
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

// Get current user - supports both Supabase and local auth
export async function getCurrentUser(): Promise<User | null> {
    // If Supabase is configured, try it first
    if (isSupabaseConfigured()) {
        const session = await getCurrentSession();
        if (session?.user) {
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
    }

    // Fall back to local auth (either Supabase not configured, or no session)
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

// Check if user is authenticated with Supabase (has valid session)
export async function isUsingSupabaseAuth(): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const session = await getCurrentSession();
    return !!session;
}
