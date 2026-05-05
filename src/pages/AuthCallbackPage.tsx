import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';

const AuthCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('Processing authentication...');

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                if (!isSupabaseConfigured()) {
                    throw new Error('Supabase not configured');
                }

                const supabase = getSupabase();
                if (!supabase) throw new Error('Supabase client not initialized');

                setStatus('Establishing session...');

                // Wait a bit for Supabase to process the hash fragment
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Get the session (Supabase should have processed the hash automatically)
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (session) {
                    setStatus('Authentication successful! Redirecting...');
                    localStorage.setItem('currentUserId', session.user.id);
                    // Small delay to show success message
                    setTimeout(() => navigate('/'), 500);
                } else {
                    // Check for error in URL
                    const params = new URLSearchParams(window.location.search);
                    const errorMsg = params.get('error_description') || params.get('error');
                    if (errorMsg) {
                        throw new Error(decodeURIComponent(errorMsg));
                    }
                    // No session, redirect to login
                    setStatus('No session found. Redirecting to login...');
                    setTimeout(() => navigate('/login'), 1000);
                }
            } catch (err: any) {
                console.error('Auth callback error:', err);
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
            <div className="text-center space-y-4">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-[var(--color-text-muted)]">{status}</p>
            </div>
        </div>
    );
};

export default AuthCallbackPage;
