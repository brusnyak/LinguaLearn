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
        let isMounted = true;
        
        const handleAuthCallback = async () => {
            try {
                addLog('Starting auth callback...');
                addLog(`URL: ${window.location.href}`);
                
                if (!supabaseService.isSupabaseConfigured()) {
                    throw new Error('Supabase not configured');
                }

                const client = supabaseService.getSupabase();
                if (!client) throw new Error('Supabase client failed to initialize');

                addLog('Checking for established session...');
                
                // Try immediate session
                const { data: { session: immediateSession } } = await client.auth.getSession();
                
                if (immediateSession?.user) {
                    await processSession(immediateSession);
                    return;
                }

                addLog('Session not immediately available, listening for auth state change...');

                // Set a timeout to bail out if no session is detected
                const timeoutId = setTimeout(() => {
                    if (isMounted) {
                        addLog('❌ Timeout: No session detected after 10s');
                        setError('No session found. Please try logging in again.');
                    }
                }, 10000);

                const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
                    addLog(`Auth event: ${event}`);
                    if (session?.user && isMounted) {
                        clearTimeout(timeoutId);
                        subscription.unsubscribe();
                        await processSession(session);
                    }
                });

                return () => {
                    isMounted = false;
                    subscription.unsubscribe();
                    clearTimeout(timeoutId);
                };
            } catch (err: any) {
                console.error('Auth callback error:', err);
                addLog(`❌ Error: ${err.message}`);
                if (isMounted) setError(err.message || 'Authentication failed');
            }
        };

        const processSession = async (session: any) => {
            if (!isMounted) return;
            addLog(`✅ Logged in: ${session.user.email}`);
            
            try {
                addLog('Syncing local data to cloud...');
                // Note: db.syncToCloud will handle updating the local user ID 
                // and migrating data from the old local ID to the new cloud ID.
                await db.syncToCloud();
                addLog('✅ Local data synced to cloud');
            } catch (syncErr: any) {
                addLog(`⚠️ Auto-sync failed: ${syncErr?.message || 'unknown error'}`);
                // Even if sync fails, we have the session, so we can proceed
            }
            
            addLog('Redirecting to home in 1s...');
            setTimeout(() => {
                if (isMounted) navigate('/');
            }, 1000);
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
