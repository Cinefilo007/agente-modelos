import React from 'react';
import { clsx } from 'clsx';
import { useTheme } from '../../context/ThemeContext';

export function FeedFilter({ currentFilter, onFilterChange }) {
    const { themeColor } = useTheme();

    const filters = [
        { id: 'recent', label: 'Recientes' },
        { id: 'top', label: 'Top' },
        { id: 'following', label: 'Siguiendo' }
    ];

    return (
        <div className="flex items-center justify-center pt-2 pb-2 sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border w-full">
            <div className="flex bg-secondary/50 rounded-full p-1 border border-border/50 shadow-2xl">
                {filters.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => onFilterChange(filter.id)}
                        className={clsx(
                            'px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300',
                            currentFilter === filter.id
                                ? 'text-primary-foreground shadow-lg'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                        style={{
                            backgroundColor: currentFilter === filter.id ? themeColor : 'transparent'
                        }}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
