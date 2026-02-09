import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { twMerge } from 'tailwind-merge';

export function Tabs({ tabs, activeTab, onChange }) {
    const { themeColor } = useTheme();

    return (
        <div className="flex border-b border-white/10 w-full">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={twMerge(
                        'flex-1 py-3 text-sm font-medium transition-colors relative flex justify-center items-center',
                        activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    {tab.label}
                    {activeTab === tab.id && (
                        <div
                            className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full"
                            style={{ backgroundColor: themeColor }}
                        />
                    )}
                </button>
            ))}
        </div>
    );
}
