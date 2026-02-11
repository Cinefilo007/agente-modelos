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
            {/* Noise Texture - Kept for subtle texture without performance impact */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-50 contrast-125"></div>
        </div>
    );
}
