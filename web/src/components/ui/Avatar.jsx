import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getOptimizedUrl, IMAGE_PRESETS } from '../../utils/image';

export function Avatar({ src, alt, name, size = 'md', isOnline, isVerified, className }) {
    const [imgError, setImgError] = useState(false);

    const STORAGE_BASE = "https://vyvntwuxzskreghxidnd.supabase.co/storage/v1/object/public/profiles/";

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-lg',
        lg: 'w-20 h-20 text-3xl',
        xl: 'w-24 h-24 text-4xl'
    };

    const getSafeUrl = (url) => {
        if (!url) return null;

        // Bloquear URLs de Telegram que sabemos que fallan (404)
        if (typeof url === 'string' && (url.includes('t.me/i/userpic') || url.includes('telegram.org'))) {
            return null;
        }

        if (url.startsWith('http')) {
             return getOptimizedUrl(url, IMAGE_PRESETS.AVATAR);
        }
        const cleanPath = url.replace(/^\/+/, '');
        return getOptimizedUrl(`${STORAGE_BASE}${cleanPath}`, IMAGE_PRESETS.AVATAR);
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
        if (text) {
            for (let i = 0; i < text.length; i++) {
                hash = text.charCodeAt(i) + ((hash << 5) - hash);
            }
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const displayName = name || alt || '?';
    const bgGradient = getBgColor(displayName);

    return (
        <div className={twMerge("relative inline-block shrink-0 rounded-full", sizeClasses[size], className)}>
            <div className="w-full h-full rounded-full overflow-hidden border border-white/10 flex items-center justify-center bg-[#1a1a1a]">
                {(!finalSrc || imgError) ? (
                    <div className={twMerge("w-full h-full flex items-center justify-center bg-gradient-to-br font-bold text-white uppercase select-none", bgGradient)}>
                        {getInitials(displayName)}
                    </div>
                ) : (
                    <img
                        src={finalSrc}
                        alt={alt}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover block"
                    />
                )}
            </div>

            {isOnline !== undefined && (
                <span className={clsx(
                    'absolute bottom-[5%] right-[5%] block rounded-full ring-2 ring-black z-20',
                    isOnline ? 'bg-green-500' : 'bg-gray-500',
                    size === 'lg' || size === 'xl' ? 'w-4 h-4' : 'w-2.5 h-2.5'
                )} />
            )}

            {isVerified && (
                <div className={clsx(
                    "absolute -right-1 -bottom-1 z-30 bg-white rounded-full flex items-center justify-center p-[1px] shadow-lg",
                    size === 'lg' || size === 'xl' ? 'p-0.5' : 'p-[1px]'
                )}>
                    <svg viewBox="0 0 24 24" className={clsx(
                        size === 'lg' || size === 'xl' ? 'w-5 h-5' : 'w-3.5 h-3.5'
                    )}>
                        <path fill="#1D9BF0" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.923-3.998-.356 0-.698.05-1.024.136C14.77 2.15 13.486 1.5 12 1.5s-2.77.65-3.643 2.138c-.326-.086-.668-.136-1.024-.136-2.213 0-3.923 1.788-3.923 3.998 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.923 3.998.356 0 .698-.05 1.024-.136C9.23 21.85 10.514 22.5 12 22.5s2.77-.65 3.643-2.138c.326.086.668.136 1.024.136 2.213 0 3.923-1.788 3.923-3.998 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"></path>
                        <path fill="#FFF" d="M10.236 15.655L6.442 11.85c-.407-.406-1.066-.406-1.472 0-.407.406-.407 1.065 0 1.47l4.53 4.542c.404.406 1.063.406 1.47 0l9.31-9.33c.406-.407.406-1.066 0-1.472-.407-.407-1.065-.407-1.472 0l-8.57 8.595z"></path>
                    </svg>
                </div>
            )}
        </div>
    );
}
