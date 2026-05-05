import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';

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
                
                // Check if we have hash or query params
                const hash = window.location.hash;
                const search = window.location.search;
                addLog(`URL: ${window.location.href}`);
                addLog(`Hash: ${hash ? hash.substring(0, 50) + '...' : 'none'}`);
                addLog(`Search: ${search ? search.substring(0, 50) + '...' : 'none'}`);
                
                if (!isSupabaseConfigured()) {
                    throw new Error('Supabase not configured');
                }

                const supabase = getSupabase();
                if (!supabase) throw new Error('Supabase client not initialized');

                addLog('Supabase client ready');

                // With implicit flow, Supabase should auto-process the hash
                // Wait a bit for it to happen
                addLog('Waiting for Supabase to process URL...');
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Now check for session
                addLog('Checking for session...');
                const { data: { session }, error } = await supabase.auth.getSession();

                addLog(`Session: ${session ? 'FOUND ✅' : 'NOT FOUND ❌'}`);
                
                if (error) {
                    addLog(`Session error: ${error.message}`);
                    throw error;
                }

                if (session) {
                    addLog(`✅ Logged in as: ${session.user.email || session.user.id}`);
                    addLog('Saving user ID and redirecting...');
                    localStorage.setItem('currentUserId', session.user.id);
                    setTimeout(() => {
                        addLog('Redirecting to home...');
                        navigate('/');
                    }, 1000);
                } else {
                    // Check for error in URL
                    const params = new URLSearchParams(window.location.search);
                    const errorMsg = params.get('error_description') || params.get('error');
                    if (errorMsg) {
                        throw new Error(decodeURIComponent(errorMsg));
                    }
                    
                    addLog('❌ No session found after OAuth');
                    addLog('This usually means:');
                    addLog('1. Google OAuth not enabled in Supabase');
                    addLog('2. Wrong anon key in Vercel');
                    addLog('3. Site URL not set in Supabase');
                    
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
