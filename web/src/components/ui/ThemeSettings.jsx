import React, { useState } from 'react';
import { Settings, Moon, Sun, Palette, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeSettings() {
    const { themeColor, changeThemeColor } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const colors = [
        '#8B5CF6', // Purple
        '#EC4899', // Pink
        '#EF4444', // Red
        '#F59E0B', // Amber
        '#10B981', // Emerald
        '#3B82F6', // Blue
        '#06b6d4', // Cyan
    ];

    return (
        <div
            className={`fixed right-0 top-1/2 -translate-y-1/2 z-[60] flex items-center transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%-12px)] hover:translate-x-[calc(100%-24px)]'}`}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {/* Handle / Trigger */}
            <div
                className="w-12 h-14 bg-card/80 backdrop-blur-xl border-y border-l border-white/20 rounded-l-2xl flex items-center justify-center cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:w-14 transition-all group"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? (
                    <ChevronRight size={28} className="text-white group-hover:text-pink-500 transition-colors" />
                ) : (
                    <Palette size={28} className="text-white animate-pulse group-hover:text-pink-500 transition-colors" />
                )}
            </div>

            {/* Panel Content */}
            <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-l-2xl shadow-2xl p-4 w-64 h-auto flex flex-col gap-3 origin-right">

                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Palette size={14} /> Apariencia
                </h3>

                {/* Color Picker */}
                <div>
                    <span className="text-xs font-semibold block mb-2 text-foreground">Color de Acento</span>
                    <div className="grid grid-cols-7 gap-2">
                        {colors.map((color) => (
                            <button
                                key={color}
                                onClick={() => changeThemeColor(color)}
                                className={`w-6 h-6 rounded-full transition-all active:scale-90 ${themeColor === color ? 'ring-2 ring-[var(--text-primary)] scale-110' : 'hover:scale-110'}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
