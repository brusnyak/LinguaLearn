import { useState, useEffect } from 'react';

export function useDevice() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkDevice = () => {
            // Simple check based on width, can be enhanced with user agent if needed
            setIsMobile(window.innerWidth < 768);
        };

        // Initial check
        checkDevice();

        // Listener
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return { isMobile, isDesktop: !isMobile };
}
