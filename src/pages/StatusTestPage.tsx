import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { getCurrentUser, getCurrentUserId } from '../services/auth';
import { isPBConfigured, pbIsAuthenticated, getPocketBase } from '../services/pocketbase';
import { CheckCircle, XCircle, Database, User, Cloud } from 'lucide-react';

const StatusTestPage: React.FC = () => {
    const navigate = useNavigate();
    const [results, setResults] = useState<Array<{name: string, status: 'pass' | 'fail' | 'testing', message: string}>>([]);
    const [testing, setTesting] = useState(false);

    const runTests = async () => {
        setTesting(true);
        const tests: Array<{name: string, status: 'pass' | 'fail' | 'testing', message: string}> = [];

        // Test 1: IndexedDB Available
        try {
            const test = 'IndexedDB Available';
            if ('indexedDB' in window) {
                tests.push({ name: test, status: 'pass', message: 'IndexedDB is available in this browser' });
            } else {
                tests.push({ name: test, status: 'fail', message: 'IndexedDB is NOT available' });
            }
        } catch (e: any) {
            tests.push({ name: 'IndexedDB Available', status: 'fail', message: e.message });
        }
        setResults([...tests]);

        // Test 2: Database Init
        try {
            const test = 'Database Init';
            tests.push({ name: test, status: 'testing', message: 'Testing...' });
            setResults([...tests]);
            await db.getWords();
            tests[tests.length - 1] = { name: test, status: 'pass', message: 'Database initialized successfully' };
        } catch (e: any) {
            tests[tests.length - 1] = { name: 'Database Init', status: 'fail', message: e.message };
        }
        setResults([...tests]);

        // Test 3: User Auth (Local)
        try {
            const test = 'Local User Auth';
            tests.push({ name: test, status: 'testing', message: 'Testing...' });
            setResults([...tests]);
            const userId = getCurrentUserId();
            if (userId) {
                tests[tests.length - 1] = { name: test, status: 'pass', message: `Logged in as: ${userId}` };
            } else {
                tests[tests.length - 1] = { name: test, status: 'fail', message: 'No user logged in locally' };
            }
        } catch (e: any) {
            tests[tests.length - 1] = { name: 'Local User Auth', status: 'fail', message: e.message };
        }
        setResults([...tests]);

        // Test 4: Get Current User
        try {
            const test = 'Get Current User';
            tests.push({ name: test, status: 'testing', message: 'Testing...' });
            setResults([...tests]);
            const user = await getCurrentUser();
            if (user) {
                tests[tests.length - 1] = { name: test, status: 'pass', message: `User: ${user.username || user.id}` };
            } else {
                tests[tests.length - 1] = { name: test, status: 'fail', message: 'No user found' };
            }
        } catch (e: any) {
            tests[tests.length - 1] = { name: 'Get Current User', status: 'fail', message: e.message };
        }
        setResults([...tests]);

        // Test 5: PocketBase Configured
        try {
            const test = 'PocketBase Configured';
            tests.push({ name: test, status: 'testing', message: 'Testing...' });
            setResults([...tests]);
            if (isPBConfigured()) {
                tests[tests.length - 1] = { name: test, status: 'pass', message: `URL: ${import.meta.env.VITE_PB_URL}` };
            } else {
                tests[tests.length - 1] = { name: test, status: 'fail', message: 'PocketBase URL not configured in .env' };
            }
        } catch (e: any) {
            tests[tests.length - 1] = { name: 'PocketBase Configured', status: 'fail', message: e.message };
        }
        setResults([...tests]);

        // Test 6: PocketBase Connection
        try {
            const test = 'PocketBase Connection';
            tests.push({ name: test, status: 'testing', message: 'Testing...' });
            setResults([...tests]);
            const response = await fetch(`${import.meta.env.VITE_PB_URL}/api/health`);
            if (response.ok) {
                tests[tests.length - 1] = { name: test, status: 'pass', message: 'Connected to PocketBase!' };
            } else {
                tests[tests.length - 1] = { name: test, status: 'fail', message: `HTTP ${response.status}` };
            }
        } catch (e: any) {
            tests[tests.length - 1] = { name: 'PocketBase Connection', status: 'fail', message: 'Cannot connect (is PocketBase running?)' };
        }
        setResults([...tests]);

        // Test 7: PocketBase Auth
        try {
            const test = 'PocketBase Auth';
            tests.push({ name: test, status: 'testing', message: 'Testing...' });
            setResults([...tests]);
            const isAuth = await pbIsAuthenticated();
            if (isAuth) {
                const pb = getPocketBase();
                const user = pb.authStore.model;
                tests[tests.length - 1] = { name: test, status: 'pass', message: `Authenticated as: ${user?.email || user?.id}` };
            } else {
                tests[tests.length - 1] = { name: test, status: 'fail', message: 'Not authenticated to PocketBase' };
            }
        } catch (e: any) {
            tests[tests.length - 1] = { name: 'PocketBase Auth', status: 'fail', message: e.message };
        }
        setResults([...tests]);

        // Test 8: DB Read/Write
        try {
            const test = 'DB Read/Write Test';
            tests.push({ name: test, status: 'testing', message: 'Testing...' });
            setResults([...tests]);
            const words = await db.getWords();
            tests[tests.length - 1] = { name: test, status: 'pass', message: `Found ${words.length} words in database` };
        } catch (e: any) {
            tests[tests.length - 1] = { name: 'DB Read/Write Test', status: 'fail', message: e.message };
        }
        setResults([...tests]);

        setTesting(false);
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg)] p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">User & DB Status Test</h1>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
                    >
                        Back
                    </button>
                </div>

                <div className="bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm mb-6">
                    <p className="text-sm text-[var(--color-text-muted)] mb-4">
                        This page tests the user authentication and database status.
                    </p>
                    <button
                        onClick={runTests}
                        disabled={testing}
                        className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
                    >
                        {testing ? 'Testing...' : 'Run All Tests'}
                    </button>
                </div>

                {results.length > 0 && (
                    <div className="bg-[var(--color-bg-card)] rounded-xl shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {results.map((result, index) => (
                                <div key={index} className="flex items-center gap-3 p-4">
                                    {result.status === 'pass' && (
                                        <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
                                    )}
                                    {result.status === 'fail' && (
                                        <XCircle className="text-red-500 flex-shrink-0" size={20} />
                                    )}
                                    {result.status === 'testing' && (
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                    )}
                                    <div className="flex-1">
                                        <div className="font-medium">{result.name}</div>
                                        <div className="text-sm text-[var(--color-text-muted)]">{result.message}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-bold mb-2">Quick Actions</h3>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={async () => {
                                const user = await getCurrentUser();
                                alert(user ? `User: ${JSON.stringify(user, null, 2)}` : 'No user logged in');
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
                        >
                            <User size={16} className="inline mr-1" /> Check User
                        </button>
                        <button
                            onClick={async () => {
                                const words = await db.getWords();
                                alert(`Words in DB: ${words.length}`);
                            }}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm"
                        >
                            <Database size={16} className="inline mr-1" /> Check DB
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const health = await fetch(`${import.meta.env.VITE_PB_URL}/api/health`);
                                    alert(health.ok ? 'PocketBase is running!' : 'PocketBase not reachable');
                                } catch (e: any) {
                                    alert(`Error: ${e.message}`);
                                }
                            }}
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm"
                        >
                            <Cloud size={16} className="inline mr-1" /> Check Cloud
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatusTestPage;
