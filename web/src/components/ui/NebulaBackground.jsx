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
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black/5">
            {/* Primary Blob (Top Left) */}
            <div
                className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full blur-[120px] animate-pulse transition-colors duration-1000"
                style={{ backgroundColor: themeColor, opacity: 0.15 }}
            ></div>

            {/* Secondary Blob (Bottom Right) */}
            <div
                className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse transition-colors duration-1000"
                style={{ backgroundColor: themeColor, opacity: 0.15, animationDelay: '2s' }}
            ></div>

            {/* Center/Random Blob for extra depth */}
            <div
                className="absolute top-[40%] left-[20%] w-[300px] h-[300px] rounded-full blur-[80px] transition-colors duration-1000"
                style={{ backgroundColor: themeColor, opacity: 0.1 }}
            ></div>

            {/* Noise Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        </div>
    );
}
