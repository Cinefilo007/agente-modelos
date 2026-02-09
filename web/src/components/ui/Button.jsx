import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { twMerge } from 'tailwind-merge';

export function Button({ children, variant = 'primary', className, ...props }) {
    const { themeColor } = useTheme();

    const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 flex items-center justify-center gap-2';

    const variants = {
        primary: {
            backgroundColor: themeColor,
            color: 'white',
            boxShadow: `0 4px 14px 0 ${themeColor}66` // Colored shadow
        },
        secondary: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            backdropFilter: 'blur(10px)'
        },
        ghost: {
            backgroundColor: 'transparent',
            color: 'white/70',
            hover: 'bg-white/5'
        }
    };

    const style = variant === 'primary' ? variants.primary : {};
    const variantClass = variant !== 'primary' ? 'bg-white/10 text-white backdrop-blur-md' : '';

    return (
        <button
            className={twMerge(baseStyles, variantClass, className)}
            style={style}
            {...props}
        >
            {children}
        </button>
    );
}
