import { v4 as uuidv4 } from 'uuid';
import type { User, UserProfile } from '../types';
import * as supabaseService from './supabase';

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
    // Try Supabase first if configured (for email-based login or new users)
    if (supabaseService.isSupabaseConfigured() && username.includes('@')) {
        try {
            const { data } = await supabaseService.signInWithPassword(username, password);
            if (data?.user) {
                // Fetch profile
                const profileData = await supabaseService.getProfile(data.user.id);
                
                const user: User = {
                    id: data.user.id,
                    username: data.user.email || username,
                    passwordHash: '',
                    profile: {
                        name: profileData?.display_name || '',
                        nativeLanguage: profileData?.native_language || 'uk',
                        targetLanguage: profileData?.target_language || 'en',
                        level: (profileData?.learning_level as any) || 'beginner'
                    },
                    createdAt: new Date(data.user.created_at).getTime(),
                    lastLogin: Date.now()
                };

                localStorage.setItem('currentUserId', user.id);
                return user;
            }
        } catch (err: any) {
            console.error('Supabase login error:', err);
        }
    }

    // Check if this is an existing local user (username, not email)
    const existingLocalUser = await findLocalUserByUsername(username);

    if (existingLocalUser) {
        // Existing local user - authenticate locally
        const user = await localLogin(username, password);
        if (user) {
            localStorage.setItem('currentUserId', user.id);
            return user;
        }
    }

    return null;
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

// Login with Google (Supabase)
export async function loginWithGoogle(): Promise<void> {
    if (!supabaseService.isSupabaseConfigured()) {
        throw new Error('Supabase cloud sync is not configured.');
    }
    await supabaseService.signInWithGoogle();
}

// Create new user - supports both Supabase and local auth
export async function createUser(
    username: string,
    password: string,
    profile: UserProfile,
    email?: string // Optional email for Supabase auth
): Promise<User> {
    // Try Supabase first if configured and email provided
    if (supabaseService.isSupabaseConfigured() && email) {
        try {
            const { data, error } = await supabaseService.signUp(email, password);
            
            if (error) throw error;
            if (!data?.user) throw new Error('Failed to create account');

            // Update profile info immediately (triggers handle_new_user but we can enrich it)
            await supabaseService.updateProfile(data.user.id, {
              display_name: profile.name,
              native_language: profile.nativeLanguage,
              target_language: profile.targetLanguage,
              learning_level: profile.level
            });

            const user: User = {
                id: data.user.id,
                username: email,
                passwordHash: '',
                profile,
                createdAt: Date.now(),
                lastLogin: Date.now()
            };

            localStorage.setItem('currentUserId', user.id);
            return user;
        } catch (err: any) {
            console.error('[Auth] Supabase createUser error:', err.message || err);
            throw err;
        }
    }

    // Fallback to local auth
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
export async function logoutUser() {
    if (supabaseService.isSupabaseConfigured()) {
        await supabaseService.signOut();
    }
    localStorage.removeItem('currentUserId');
}

// Get current user - supports both Supabase and local auth
export async function getCurrentUser(): Promise<User | null> {
    // If Supabase is configured, try it first
    if (supabaseService.isSupabaseConfigured()) {
        const session = await supabaseService.getCurrentSession();
        if (session?.user) {
            const profileData = await supabaseService.getProfile(session.user.id);
            return {
                id: session.user.id,
                username: session.user.email || 'user',
                passwordHash: '',
                profile: {
                    name: profileData?.display_name || '',
                    nativeLanguage: profileData?.native_language || 'uk',
                    targetLanguage: profileData?.target_language || 'en',
                    level: (profileData?.learning_level as any) || 'beginner'
                },
                createdAt: new Date(session.user.created_at).getTime(),
                lastLogin: Date.now()
            };
        }
    }

    // Fall back to local auth
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

// Check if user is authenticated with Supabase
export async function isUsingCloudAuth(): Promise<boolean> {
    if (!supabaseService.isSupabaseConfigured()) return false;
    const session = await supabaseService.getCurrentSession();
    return !!session;
}
