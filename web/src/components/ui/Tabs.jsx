import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { twMerge } from 'tailwind-merge';

export function Tabs({ tabs, activeTab, onChange }) {
    const { themeColor } = useTheme();

    return (
        <div className="flex gap-6 border-b border-white/5 w-full px-5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={twMerge(
                        'pb-3 pt-1 text-sm font-bold transition-colors relative flex justify-center items-center whitespace-nowrap',
                        activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'
                    )}
                >
                    {tab.label}
                    {activeTab === tab.id && (
                        <div
                            className="absolute bottom-0 left-0 w-full h-[3px] rounded-t-full shadow-[0_-2px_10px_rgba(255,255,255,0.2)]"
                            style={{
                                backgroundColor: themeColor || '#e81cff',
                                boxShadow: `0 -2px 10px ${themeColor || '#e81cff'}80`
                            }}
                        />
                    )}
                </button>
            ))}
        </div>
    );
}
