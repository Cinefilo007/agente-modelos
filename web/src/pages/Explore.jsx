import React, { useState } from 'react';
import { Search, SlidersHorizontal, MapPin } from 'lucide-react';
import { ModelGrid } from '../components/explore/ModelGrid';
import { CURRENT_USER } from '../data/dummy'; // We'll reuse user as a model template
import { useTheme } from '../context/ThemeContext';

function Explore() {
    const { themeColor } = useTheme();

    // Dummy data generator for grid
    const models = Array(10).fill(CURRENT_USER).map((u, i) => ({
        ...u,
        id: `model_${i}`,
        name: i % 2 === 0 ? 'Valentina Rose' : 'Sofia Star',
        isOnline: i % 3 !== 0 // Some offline
    }));

    return (
        <div className="pb-24 pt- safe-top">
            {/* Header / Search */}
            <div className="px-4 py-3 sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <h1 className="text-xl font-bold mb-3">Descubrir</h1>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar modelos..."
                            className="w-full bg-white/10 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 transition-all"
                        />
                    </div>
                    <button
                        className="bg-white/10 border border-white/10 rounded-xl w-11 flex items-center justify-center hover:bg-white/20 transition-colors active:scale-95"
                        style={{ color: themeColor }}
                    >
                        <SlidersHorizontal size={20} />
                    </button>
                </div>

                {/* Quick Filters */}
                <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
                    {['Todas', 'Nuevas', 'Top Rated', 'Cerca de ti'].map((filter, i) => (
                        <button
                            key={filter}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${i === 0 ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            <ModelGrid models={models} />
        </div>
    );
}

export default Explore;
