import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Avatar({ src, alt, size = 'md', isOnline, className }) {
    const [imgError, setImgError] = useState(false);

    // Reset error state if src changes
    useEffect(() => {
        setImgError(false);
    }, [src]);

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-20 h-20',
        xl: 'w-24 h-24'
    };

    const renderPlaceholder = () => (
        <div
            className={twMerge(
                'rounded-full border-2 border-white/10 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden',
                sizeClasses[size],
                className
            )}
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-1/2 h-1/2 text-gray-500"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        </div>
    );

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
                        sizeClasses[size],
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
