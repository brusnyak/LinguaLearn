import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPocketBase, isPBConfigured } from '../services/pocketbase';
import { db } from '../services/db';

const AuthCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        console.log('[AuthCallback]', msg);
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    };

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                addLog('Starting auth callback...');
                
                const hash = window.location.hash;
                const search = window.location.search;
                addLog(`URL: ${window.location.href}`);
                addLog(`Hash present: ${hash ? 'yes' : 'no'}`);
                addLog(`Search present: ${search ? 'yes' : 'no'}`);
                
                if (!isPBConfigured()) {
                    throw new Error('PocketBase not configured');
                }

                const pb = getPocketBase();
                addLog('PocketBase client ready');

                // Check if already authenticated
                addLog('Checking for existing session...');
                if (pb.authStore.isValid) {
                    addLog(`✅ Already logged in: ${pb.authStore.model?.email || pb.authStore.model?.id}`);
                    try {
                        addLog('Syncing local data to cloud...');
                        await db.syncToPocketBase();
                        addLog('✅ Local data synced to cloud');
                    } catch (syncErr: any) {
                        addLog(`⚠️ Auto-sync failed: ${syncErr?.message || 'unknown error'}`);
                    }
                    localStorage.setItem('currentUserId', pb.authStore.model?.id || '');
                    addLog('Redirecting to home in 1s...');
                    setTimeout(() => navigate('/'), 1000);
                    return;
                }
                
                addLog('❌ No session found');
                addLog('Check: 1) Email/password login required, 2) Correct PocketBase URL');
                setTimeout(() => {
                    addLog('Redirecting to login...');
                    navigate('/login');
                }, 5000);
            } catch (err: any) {
                console.error('Auth callback error:', err);
                addLog(`❌ Error: ${err.message}`);
                setError(err.message || 'Authentication failed');
            }
        };

        handleAuthCallback();
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
                <div className="text-center space-y-4 max-w-lg mx-auto p-6">
                    <div className="text-red-500 text-2xl font-bold">Authentication Failed</div>
                    <p className="text-[var(--color-text-muted)]">{error}</p>
                    <div className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-64 font-mono">
                        {logs.map((log, i) => (
                            <div key={i} className="py-1 border-b border-gray-200 dark:border-gray-700">{log}</div>
                        ))}
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-bold"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
            <div className="text-center space-y-4 max-w-lg mx-auto p-6">
                <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-[var(--color-text-muted)] text-lg">Processing authentication...</p>
                <div className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-64 font-mono">
                    {logs.map((log, i) => (
                        <div key={i} className="py-1 border-b border-gray-200 dark:border-gray-700">{log}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AuthCallbackPage;
