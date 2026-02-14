import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Avatar({ src, alt, size = 'md', isOnline, className }) {
    const [imgError, setImgError] = useState(false);

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-20 h-20',
        xl: 'w-24 h-24'
    };

    // Default silhouette
    const fallbackSrc = `https://api.dicebear.com/7.x/initials/svg?seed=${alt || 'User'}&backgroundColor=1a1a1a&fontFamily=Inter&fontWeight=700`;

    return (
        <div className="relative inline-block shrink-0">
            <img
                src={(!src || imgError) ? fallbackSrc : src}
                alt={alt}
                onError={() => setImgError(true)}
                className={twMerge(
                    'rounded-full object-cover border-2 border-white/10 bg-[#1a1a1a]',
                    sizeClasses[size],
                    className
                )}
            />
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
