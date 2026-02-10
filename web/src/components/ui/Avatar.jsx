import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Avatar({ src, alt, size = 'md', isOnline, className }) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-20 h-20',
        xl: 'w-24 h-24'
    };

    return (
        <div className="relative inline-block">
            <img
                src={src ? src : `https://api.dicebear.com/7.x/avataaars/svg?seed=${alt || 'User'}`}
                alt={alt}
                className={twMerge(
                    'rounded-full object-cover border-2 border-white/10',
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
