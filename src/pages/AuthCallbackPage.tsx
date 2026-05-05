import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';

const AuthCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        console.log('[AuthCallback]', msg);
        setLogs(prev => [...prev, msg]);
    };

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                addLog('Starting auth callback...');
                
                if (!isSupabaseConfigured()) {
                    throw new Error('Supabase not configured');
                }

                const supabase = getSupabase();
                if (!supabase) throw new Error('Supabase client not initialized');

                addLog('Supabase client initialized');

                // Check if we have a hash fragment
                const hash = window.location.hash;
                addLog(`Hash present: ${hash ? 'yes' : 'no'}`);
                if (hash) {
                    addLog(`Hash preview: ${hash.substring(0, 50)}...`);
                }

                // Wait a bit for Supabase to process the hash
                addLog('Waiting for Supabase to process hash...');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Get the session
                addLog('Getting session...');
                const { data: { session }, error } = await supabase.auth.getSession();

                addLog(`Session: ${session ? 'found' : 'not found'}`);
                
                if (error) {
                    addLog(`Session error: ${error.message}`);
                    throw error;
                }

                if (session) {
                    addLog(`User ID: ${session.user.id}`);
                    addLog('Authentication successful! Redirecting...');
                    localStorage.setItem('currentUserId', session.user.id);
                    setTimeout(() => navigate('/'), 1000);
                } else {
                    // Check for error in URL
                    const params = new URLSearchParams(window.location.search);
                    const errorMsg = params.get('error_description') || params.get('error');
                    if (errorMsg) {
                        throw new Error(decodeURIComponent(errorMsg));
                    }
                    
                    // Try to manually set session from hash
                    addLog('Trying to extract session from hash...');
                    if (hash && hash.includes('access_token')) {
                        addLog('Hash contains access_token, but session not established');
                        addLog('This usually means the Supabase anon key is wrong or Supabase URL is misconfigured');
                    }
                    
                    addLog('No session found. Redirecting to login...');
                    setTimeout(() => navigate('/login'), 2000);
                }
            } catch (err: any) {
                console.error('Auth callback error:', err);
                addLog(`Error: ${err.message}`);
                setError(err.message || 'Authentication failed');
            }
        };

        handleAuthCallback();
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
                <div className="text-center space-y-4 max-w-md mx-auto p-4">
                    <div className="text-red-500 text-xl font-bold">Authentication Failed</div>
                    <p className="text-[var(--color-text-muted)]">{error}</p>
                    <div className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-48">
                        {logs.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
            <div className="text-center space-y-4 max-w-md mx-auto p-4">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-[var(--color-text-muted)]">Processing authentication...</p>
                <div className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-48">
                    {logs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            </div>
        </div>
    );
};

export default AuthCallbackPage;
