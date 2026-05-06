import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as supabaseService from '../services/supabase';
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
                
                addLog(`URL: ${window.location.href}`);
                
                if (!supabaseService.isSupabaseConfigured()) {
                    throw new Error('Supabase not configured');
                }

                addLog('Checking for established session...');
                
                // Supabase's detectSessionInUrl should have picked up the hash by now,
                // but we wait a bit to be sure or explicitly get session.
                let session = await supabaseService.getCurrentSession();
                
                if (!session) {
                    addLog('Session not immediately available, waiting...');
                    // Try one more time after a short delay
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    session = await supabaseService.getCurrentSession();
                }

                if (session?.user) {
                    addLog(`✅ Logged in: ${session.user.email}`);
                    
                    try {
                        addLog('Syncing local data to cloud...');
                        // Update localStorage so sync works with correct ID
                        localStorage.setItem('currentUserId', session.user.id);
                        await db.syncToCloud();
                        addLog('✅ Local data synced to cloud');
                    } catch (syncErr: any) {
                        addLog(`⚠️ Auto-sync failed: ${syncErr?.message || 'unknown error'}`);
                    }
                    
                    addLog('Redirecting to home in 1s...');
                    setTimeout(() => navigate('/'), 1000);
                } else {
                    addLog('❌ No session found in URL hash/fragment');
                    addLog('Check if Google OAuth is enabled in Supabase dashboard');
                    setTimeout(() => {
                        addLog('Redirecting to login...');
                        navigate('/login');
                    }, 5000);
                }
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
