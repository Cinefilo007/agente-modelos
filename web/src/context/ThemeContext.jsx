import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [themeColor, setThemeColor] = useState('#8B5CF6'); // Default Purple
    // const [themeMode, setThemeMode] = useState('dark'); // 'light' | 'dark' - Mode is now always dark

    // Cargar configuración guardada
    useEffect(() => {
        const savedColor = localStorage.getItem('profile_theme_color');
        // const savedMode = localStorage.getItem('profile_theme_mode'); // Mode is now always dark

        const initialColor = savedColor || '#8B5CF6';
        // const initialMode = savedMode || 'dark'; // Mode is now always dark

        setThemeColor(initialColor);
        // setThemeMode(initialMode); // No longer needed as mode is hardcoded

        // Initial application - Force Dark
        applyTheme(initialColor, 'dark');
    }, []);

    const applyTheme = (color, mode = 'dark') => { // Default to dark
        const root = document.documentElement;

        // Always add Dark Mode Class
        root.classList.add('dark');
        // No need to remove 'dark' class as we are always in dark mode.

        // Semantic Tailwind Vars (Dynamic Accent)
        root.style.setProperty('--primary-color', color);

        // Background Vibrante Dynamic - Enhanced Intensity for Dark Mode
        // Increased opacity from 0.4/0.2 to 0.6/0.3 for more punch
        const gradient = `
               radial-gradient(circle at 50% 0%, ${color}75 0%, transparent 70%),
               radial-gradient(circle at 85% 30%, ${color}45 0%, transparent 50%),
               radial-gradient(circle at 15% 50%, ${color}45 0%, transparent 50%),
               linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)
            `;

        root.style.setProperty('--bg-gradient', gradient);

        // Glass border dynamic adjustment is now handled by CSS var(--glass-border) inside .dark class in index.css
        // But if needed for inline styles:
        // root.style.setProperty('--glass-border', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');
    };

    const changeThemeColor = (color) => {
        setThemeColor(color);
        localStorage.setItem('profile_theme_color', color);
        applyTheme(color, 'dark'); // Always apply with dark mode
    };

    // toggleThemeMode function removed as we are Dark Mode only now.

    return (
        <ThemeContext.Provider value={{ themeColor, changeThemeColor }}>
            {children}
        </ThemeContext.Provider>
    );
};
