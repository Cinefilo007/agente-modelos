import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Avatar({ src, alt, name, size = 'md', isOnline, className }) {
    const [imgError, setImgError] = useState(false);

    // Reset error state if src changes
    useEffect(() => {
        setImgError(false);
    }, [src]);

    const sizeClasses = {
        sm: 'w-8 h-8 text-[10px]',
        md: 'w-12 h-12 text-sm',
        lg: 'w-20 h-20 text-xl',
        xl: 'w-24 h-24 text-2xl'
    };

    const getInitials = (displayName) => {
        if (!displayName) return '?';
        const parts = displayName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const renderPlaceholder = () => {
        const initials = getInitials(name || alt);
        return (
            <div
                className={twMerge(
                    'rounded-full border-2 border-white/10 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden font-bold text-gray-300 uppercase select-none',
                    sizeClasses[size],
                    className
                )}
            >
                {initials}
            </div>
        );
    };

    return (
        <div className="relative inline-block shrink-0">
            {(!src || imgError) ? (
                renderPlaceholder()
            ) : (
                <img
                    src={src}
                    alt={alt}
                    onError={() => {
                        console.warn(`[Avatar] Failed to load: ${src}`);
                        setImgError(true);
                    }}
                    className={twMerge(
                        'rounded-full object-cover border-2 border-white/10 bg-[#1a1a1a]',
                        sizeClasses[size].split(' ')[0], // Only take width/height classes for img
                        className
                    )}
                />
            )}

            {/* Online Status Indicator */}
            {isOnline !== undefined && (
                <span
                    className={clsx(
                        'absolute bottom-0 right-0 block rounded-full ring-2 ring-black',
                        isOnline ? 'bg-green-500' : 'bg-gray-500',
                        size === 'lg' || size === 'xl' ? 'w-4 h-4' : 'w-2.5 h-2.5'
                    )}
                />
            )}
        </div>
    );
}
