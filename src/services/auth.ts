import { v4 as uuidv4 } from 'uuid';
import type { User, UserProfile } from '../types';

// Password hashing using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Get all users from IndexedDB
export async function getAllUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('lingua-learn-db', 5);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
    });
}

// Create new user
export async function createUser(
    username: string,
    password: string,
    profile: UserProfile
): Promise<User> {
    // Validate inputs
    if (!username || username.trim().length === 0) {
        throw new Error('Username is required');
    }
    if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters');
    }
    if (username.length > 50) {
        throw new Error('Username must be 50 characters or less');
    }

    // Check for duplicate username
    const existingUsers = await getAllUsers();
    const duplicate = existingUsers.find(
        u => u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (duplicate) {
        throw new Error('Username already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user object
    const user: User = {
        id: uuidv4(),
        username: username.trim(),
        passwordHash,
        profile,
        createdAt: Date.now(),
        lastLogin: Date.now()
    };

    // Save to IndexedDB
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('lingua-learn-db', 5);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const addRequest = store.add(user);

            addRequest.onsuccess = () => {
                // Set as current user
                localStorage.setItem('currentUserId', user.id);
                resolve(user);
            };
            addRequest.onerror = () => reject(addRequest.error);
        };
    });
}

// Login user
export async function loginUser(username: string, password: string): Promise<User | null> {
    if (!username || !password) {
        return null;
    }

    const users = await getAllUsers();
    const user = users.find(
        u => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!user) {
        return null;
    }

    // Verify password
    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.passwordHash) {
        return null;
    }

    // Update last login
    user.lastLogin = Date.now();
    await updateUser(user);

    // Set as current user
    localStorage.setItem('currentUserId', user.id);

    return user;
}

// Update user
async function updateUser(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('lingua-learn-db', 5);

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
    localStorage.removeItem('currentUserId');
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) {
        return null;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open('lingua-learn-db', 5);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
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
