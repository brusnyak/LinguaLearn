import { v4 as uuidv4 } from 'uuid';
import type { User, UserProfile } from '../types';
import { getPocketBase, isPBConfigured, pbSignIn, pbSignUp, pbSignOut, pbGetCurrentUser, pbIsAuthenticated } from './pocketbase';

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

// Login user - supports both PocketBase and local auth
// Priority: local auth for existing users, PocketBase for new email-based users
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
        // If local auth fails (wrong password), fall through to PocketBase
    }

    // Try PocketBase if configured (for email-based login or new users)
    if (isPBConfigured() && username.includes('@')) {
        try {
            const result = await pbSignIn(username, password);
            if (result?.record) {
                const user: User = {
                    id: result.record.id,
                    username: result.record.email || username,
                    passwordHash: '',
                    profile: result.record.profile || { name: '', nativeLanguage: 'uk', targetLanguage: 'en', level: 'beginner' },
                    createdAt: new Date(result.record.created || Date.now()).getTime(),
                    lastLogin: Date.now()
                };

                localStorage.setItem('currentUserId', user.id);
                return user;
            }
        } catch (err: any) {
            console.error('PocketBase login error:', err);
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

// Login with Google (kept for backward compatibility, uses PocketBase OAuth)
export async function loginWithGoogle(): Promise<void> {
    throw new Error('Google OAuth not implemented in PocketBase yet. Use email/password login.');
}

export async function updateLinkedEmail(newEmail: string): Promise<void> {
    if (!isPBConfigured()) {
        throw new Error('Cloud sync is not configured.');
    }

    if (!isValidEmail(newEmail)) {
        throw new Error('Please enter a valid email address.');
    }

    const pb = getPocketBase();
    if (!pb.authStore.isValid) {
        throw new Error('You need to be logged in to cloud account.');
    }

    try {
        await pb.collection('users').requestEmailChange(newEmail.trim());
    } catch (error: any) {
        throw error;
    }
}

type LinkEmailResult = {
    status: 'linked_and_logged_in' | 'verification_required';
    userId: string;
    email: string;
};

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Link existing local account to PocketBase email/password auth
export async function linkCurrentLocalAccountWithEmail(email: string, password: string): Promise<LinkEmailResult> {
    if (!isPBConfigured()) {
        throw new Error('Cloud sync is not configured.');
    }

    if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address.');
    }

    if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
    }

    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) {
        throw new Error('No local user is currently logged in.');
    }

    const localUser = await getCurrentUser();
    if (!localUser) {
        throw new Error('Could not load current local user.');
    }

    let linkedUserId: string | null = null;
    let hasSession = false;

    try {
        const signUpResult = await pbSignUp(email.trim(), password, localUser.profile?.name);
        linkedUserId = signUpResult?.record?.id || null;
        hasSession = await pbIsAuthenticated();
    } catch (err: any) {
        const message = (err?.message || '').toLowerCase();
        if (message.includes('already registered') || message.includes('already exists')) {
            const loginResult = await pbSignIn(email.trim(), password);
            linkedUserId = loginResult?.record?.id || null;
            hasSession = await pbIsAuthenticated();
        } else {
            throw err;
        }
    }

    if (!linkedUserId) {
        throw new Error('Failed to create or link cloud account.');
    }

    // If we have a session, we can map local ID to PocketBase user ID immediately.
    if (hasSession) {
        localStorage.setItem('currentUserId', linkedUserId);
    }

    // Save profile to PocketBase (upsert pattern: try get, then update or create)
    try {
        const pb = getPocketBase();
        const userSettingsData = {
            user_id: linkedUserId,
            profile: localUser.profile,
            theme: 'system',
            notifications_enabled: false,
            notification_time: '08:00',
            daily_goal: 5,
            auto_read_flashcards: false
        };

        try {
            const existing = await pb.collection('user_settings').getFirstListItem(`user_id = "${linkedUserId}"`);
            await pb.collection('user_settings').update(existing.id, userSettingsData);
        } catch (getErr: any) {
            if (getErr?.status === 404) {
                await pb.collection('user_settings').create(userSettingsData);
            } else {
                throw getErr;
            }
        }
    } catch (profileErr) {
        console.warn('Could not save profile during account linking:', profileErr);
    }

    return {
        status: hasSession ? 'linked_and_logged_in' : 'verification_required',
        userId: linkedUserId,
        email: email.trim()
    };
}

// Create new user - supports both PocketBase and local auth
export async function createUser(
    username: string,
    password: string,
    profile: UserProfile,
    email?: string // Optional email for PocketBase auth
): Promise<User> {
    // Try PocketBase first if configured and email provided
    if (isPBConfigured() && email) {
        try {
            const result = await pbSignUp(email, password, profile.name);
            if (!result?.record) {
                console.log('PocketBase signup returned no user, falling back to local auth...');
                return await localCreateUser(username, password, profile);
            }

            const user: User = {
                id: result.record.id,
                username,
                passwordHash: '',
                profile,
                createdAt: Date.now(),
                lastLogin: Date.now()
            };

            localStorage.setItem('currentUserId', user.id);
            return user;
        } catch (err: any) {
            console.error('PocketBase createUser error:', err.message || err);
            console.log('Falling back to local auth...');
        }
    }

    // Fallback to local auth (or if PocketBase not configured)
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
    if (isPBConfigured()) {
        pbSignOut();
    }
    localStorage.removeItem('currentUserId');
}

// Get current user - supports both PocketBase and local auth
export async function getCurrentUser(): Promise<User | null> {
    // If PocketBase is configured, try it first
    if (isPBConfigured()) {
        const pbUser = await pbGetCurrentUser();
        if (pbUser) {
            return {
                id: pbUser.id,
                username: pbUser.email || 'user',
                passwordHash: '',
                profile: pbUser.profile || { name: '', nativeLanguage: 'uk', targetLanguage: 'en', level: 'beginner' },
                createdAt: new Date(pbUser.created || Date.now()).getTime(),
                lastLogin: Date.now()
            };
        }
    }

    // Fall back to local auth (either PocketBase not configured, or no session)
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

// Check if user is authenticated with PocketBase (has valid session)
export async function isUsingPBAuth(): Promise<boolean> {
    if (!isPBConfigured()) return false;
    return await pbIsAuthenticated();
}
