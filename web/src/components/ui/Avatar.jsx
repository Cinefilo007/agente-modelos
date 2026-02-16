import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Avatar({ src, alt, name, size = 'md', isOnline, className }) {
    const [imgError, setImgError] = useState(false);

    // Supabase Public Storage URL if needed
    const SUPABASE_STORAGE_URL = "https://vyvntwuxzskreghxidnd.supabase.co/storage/v1/object/public/profiles/";

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-lg',
        lg: 'w-20 h-20 text-3xl',
        xl: 'w-24 h-24 text-4xl'
    };

    // Construct full URL if relative
    const getFullUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        // Assume it's an avatar in the profiles bucket
        return `${SUPABASE_STORAGE_URL}${url}`;
    };

    const fullSrc = getFullUrl(src);

    // Reset error state if src changes
    useEffect(() => {
        setImgError(false);
    }, [fullSrc]);

    const getInitials = (displayName) => {
        if (!displayName) return '?';
        const cleanName = displayName.replace(/^@/, '').trim();
        if (!cleanName) return '?';
        const parts = cleanName.split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const getBgColor = (text) => {
        if (!text) return 'from-gray-700 to-gray-800';
        const colors = [
            'from-blue-600 to-indigo-700',
            'from-purple-600 to-pink-700',
            'from-pink-600 to-rose-700',
            'from-indigo-600 to-blue-700',
            'from-cyan-600 to-blue-700',
            'from-emerald-600 to-teal-700',
            'from-amber-600 to-orange-700'
        ];
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = text.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const renderPlaceholder = () => {
        const displayName = name || alt || '?';
        const initials = getInitials(displayName);
        const bgGradient = getBgColor(displayName);

        return (
            <div
                className={twMerge(
                    'rounded-full border-2 border-white/20 flex items-center justify-center overflow-hidden font-bold text-white uppercase select-none shadow-md bg-gradient-to-br',
                    bgGradient,
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
            {(imgError || !fullSrc) ? (
                renderPlaceholder()
            ) : (
                <img
                    src={fullSrc}
                    alt={alt}
                    onError={() => {
                        console.warn(`[Avatar] Failed to load: ${fullSrc}`);
                        setImgError(true);
                    }}
                    className={twMerge(
                        'rounded-full object-cover border-2 border-white/10 bg-[#1a1a1a] shadow-sm',
                        sizeClasses[size],
                        className
                    )}
                />
            )}

            {/* Online Status Indicator */}
            {isOnline !== undefined && (
                <span
                    className={clsx(
                        'absolute bottom-0 right-0 block rounded-full ring-2 ring-black z-10',
                        isOnline ? 'bg-green-500' : 'bg-gray-500',
                        size === 'lg' || size === 'xl' ? 'w-4 h-4' : 'w-2.5 h-2.5'
                    )}
                />
            )}
        </div>
    );
}
