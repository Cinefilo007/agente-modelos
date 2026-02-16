import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, MapPin } from 'lucide-react';
import { ModelGrid } from '../components/explore/ModelGrid';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';

function Explore() {
    const { themeColor } = useTheme();
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');

    const filters = [
        { id: 'all', label: 'Todas' },
        { id: 'new', label: 'Nuevas' },
        { id: 'top', label: 'Top Rated' },
        { id: 'near', label: 'Cerca de ti' }
    ];

    useEffect(() => {
        const fetchModels = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/profile/models/explore?filter=${activeFilter}`);
                setModels(data || []);
            } catch (err) {
                console.error("Error fetching models:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchModels();
    }, [activeFilter]);

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
                    {filters.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${activeFilter === f.id
                                    ? 'bg-white text-black border-white'
                                    : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                    <p className="text-sm">Buscando modelos...</p>
                </div>
            ) : (
                <ModelGrid models={models} />
            )}
        </div>
    );
}

export default Explore;
