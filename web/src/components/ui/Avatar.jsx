import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Avatar({ src, alt, name, size = 'md', isOnline, className }) {
    const [imgError, setImgError] = useState(false);

    // Supabase Public Storage URL base
    const STORAGE_BASE = "https://vyvntwuxzskreghxidnd.supabase.co/storage/v1/object/public/profiles/";

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-lg',
        lg: 'w-20 h-20 text-3xl',
        xl: 'w-24 h-24 text-4xl'
    };

    // Construct URL gracefully
    const getSafeUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        // Clean relative path and join with base
        const cleanPath = url.replace(/^\/+/, '');
        return `${STORAGE_BASE}${cleanPath}`;
    };

    const finalSrc = getSafeUrl(src);

    useEffect(() => {
        setImgError(false);
    }, [finalSrc]);

    const getInitials = (displayName) => {
        if (!displayName) return '?';
        const clean = displayName.replace(/^@/, '').trim();
        if (!clean) return '?';
        const parts = clean.split(/\s+/);
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const getBgColor = (text) => {
        if (!text) return 'bg-gray-700';
        const colors = [
            'from-blue-600 to-indigo-700',
            'from-purple-600 to-pink-700',
            'from-rose-600 to-pink-700',
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

    const displayName = name || alt || '?';
    const bgGradient = getBgColor(displayName);

    if (!finalSrc || imgError) {
        return (
            <div className="relative inline-block shrink-0">
                <div
                    className={twMerge(
                        'rounded-full flex items-center justify-center font-bold text-white uppercase select-none shadow-lg bg-gradient-to-br border-2 border-white/20',
                        bgGradient,
                        sizeClasses[size],
                        className
                    )}
                >
                    {getInitials(displayName)}
                </div>
                {isOnline !== undefined && (
                    <span className={clsx(
                        'absolute bottom-0 right-0 block rounded-full ring-2 ring-black',
                        isOnline ? 'bg-green-500' : 'bg-gray-500',
                        size === 'lg' || size === 'xl' ? 'w-4 h-4' : 'w-2.5 h-2.5'
                    )} />
                )}
            </div>
        );
    }

    return (
        <div className="relative inline-block shrink-0">
            <img
                src={finalSrc}
                alt={alt}
                onError={() => {
                    console.log(`[Avatar] 404/Error: Fallback trigger for ${displayName}`);
                    setImgError(true);
                }}
                className={twMerge(
                    'rounded-full object-cover border-2 border-white/10 block',
                    sizeClasses[size],
                    className
                )}
            />
            {isOnline !== undefined && (
                <span className={clsx(
                    'absolute bottom-0 right-0 block rounded-full ring-2 ring-black',
                    isOnline ? 'bg-green-500' : 'bg-gray-500',
                    size === 'lg' || size === 'xl' ? 'w-4 h-4' : 'w-2.5 h-2.5'
                )} />
            )}
        </div>
    );
}
