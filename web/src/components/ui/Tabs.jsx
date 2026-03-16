import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { twMerge } from 'tailwind-merge';

export function Tabs({ tabs, activeTab, onChange }) {
    const { themeColor } = useTheme();

    return (
        <div className="mt-6">
            <div className="flex justify-center border-b border-white/5 gap-8 overflow-x-auto no-scrollbar w-full px-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={twMerge(
                            'pb-3 text-sm font-semibold transition-colors relative flex justify-center items-center whitespace-nowrap px-2',
                            activeTab === tab.id
                                ? 'text-white font-bold'
                                : 'text-slate-500 hover:text-slate-300'
                        )}
                        style={activeTab === tab.id ? { borderBottom: `2px solid ${themeColor || '#e81cff'}` } : {}}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
