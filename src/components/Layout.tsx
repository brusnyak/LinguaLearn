import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Book, Gamepad2, Settings, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDevice } from '../hooks/useDevice';

interface LayoutProps {
    children: React.ReactNode;
    fullscreen?: boolean; // Hide header and footer for immersive game experience
}

const Layout: React.FC<LayoutProps> = ({ children, fullscreen = false }) => {
    const location = useLocation();
    const { isMobile } = useDevice();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [showHeader, setShowHeader] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Initialize sidebar state and enable dark mode
    useEffect(() => {
        // Always enable dark mode
        document.documentElement.classList.add('dark');

        const savedSidebarState = localStorage.getItem('sidebar-collapsed');
        if (savedSidebarState === 'true') {
            setIsSidebarCollapsed(true);
        }
    }, []);

    // Auto-hide header on scroll (mobile only)
    useEffect(() => {
        if (!isMobile) return;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Show header when scrolling up or at top
            if (currentScrollY < lastScrollY || currentScrollY < 50) {
                setShowHeader(true);
            }
            // Hide header when scrolling down
            else if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setShowHeader(false);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMobile, lastScrollY]);

    // Online status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);



    const toggleSidebar = () => {
        const newState = !isSidebarCollapsed;
        setIsSidebarCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', String(newState));
    };

    const navItems = [
        { path: '/', label: 'Home', icon: Home },
        { path: '/dictionary', label: 'Dictionary', icon: Book },
        { path: '/games', label: 'Games', icon: Gamepad2 },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen flex flex-col md:flex-row text-[var(--color-text)] transition-colors duration-300">

            {/* Desktop Sidebar */}
            {!isMobile && (
                <aside
                    className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[var(--color-bg-card)] border-r border-[var(--color-border)] flex flex-col sticky top-0 h-screen transition-all duration-300 ease-in-out`}
                >
                    <div className="p-6 flex items-center justify-between">
                        {!isSidebarCollapsed && (
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent whitespace-nowrap overflow-hidden">
                                LinguaLearn
                            </h1>
                        )}
                        <button
                            onClick={toggleSidebar}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--color-text-muted)] ml-auto"
                        >
                            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                        </button>
                    </div>

                    <nav className="flex-1 px-4 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    title={isSidebarCollapsed ? item.label : ''}
                                    className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-3 rounded-xl transition-colors ${isActive
                                        ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-purple-500/20'
                                        : 'text-[var(--color-text-muted)] hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <Icon size={20} />
                                    {!isSidebarCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-[var(--color-border)]">
                    </div>
                </aside>
            )}

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-h-screen">

                {/* Mobile Header */}
                {isMobile && !fullscreen && (
                    <header
                        className={`sticky top-0 z-10 bg-[var(--color-bg-card)]/80 backdrop-blur-md border-b border-[var(--color-border)] px-4 py-3 flex justify-between items-center shadow-sm transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'
                            }`}
                    >
                        <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                            LinguaLearn
                        </h1>
                    </header>
                )}

                {/* Offline Banner */}
                {!isOnline && (
                    <div className="bg-red-500 text-white text-xs text-center py-1 font-bold">
                        You are currently offline. App is running in offline mode.
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 container py-6 pb-24 md:pb-6 md:px-8 max-w-5xl mx-auto w-full">
                    {children}
                </main>

                {/* Mobile Bottom Nav */}
                {isMobile && !fullscreen && (
                    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-card)] border-t border-[var(--color-border)] pb-safe z-50">
                        <div className="flex justify-around items-center h-16">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                                            }`}
                                    >
                                        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                        <span className="text-xs font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                )}
            </div>
        </div>
    );
};

export default Layout;
