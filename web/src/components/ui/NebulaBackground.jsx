import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from 'react-router-dom';

export default function NebulaBackground() {
    const { themeColor } = useTheme();
    const location = useLocation();

    // Exclude specific paths
    const excludePaths = ['/create-post', '/create-story'];
    if (excludePaths.includes(location.pathname)) return null;

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-transparent">
            {/* Noise Texture - CSS Generated to avoid 403 errors from external hosts */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>
        </div>
    );
}
