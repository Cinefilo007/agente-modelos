import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ModelGrid({ models }) {
    const { themeColor } = useTheme();

    if (!models || models.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center opacity-60">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <MapPin size={32} className="text-muted-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-1">Sin resultados</h3>
                <p className="text-sm text-balance">
                    No encontramos modelos en esta categoría por ahora. ¡Intenta con otro filtro!
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3">
            {models.map((model) => (
                <Link
                    key={model.id}
                    to={`/profile/${model.username || model.id}`}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg group block bg-[#1a1a1a]"
                >
                    <img
                        src={model.avatar_url || model.avatar}
                        alt={model.artistic_name || model.username}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />

                    {/* Status Badge */}
                    <div className={clsx(
                        "absolute top-2 right-2 flex items-center gap-1.5 backdrop-blur-md px-2 py-1 rounded-lg border z-10",
                        (model.last_seen && (new Date() - new Date(model.last_seen)) < 300000)
                            ? "bg-green-500/20 border-green-500/30 text-green-400"
                            : "bg-black/40 border-white/10 text-gray-400"
                    )}>
                        <span className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            (model.last_seen && (new Date() - new Date(model.last_seen)) < 300000) ? "bg-green-500 animate-pulse" : "bg-gray-500"
                        )}></span>
                        <span className="text-[10px] uppercase font-bold tracking-wider">
                            {(model.last_seen && (new Date() - new Date(model.last_seen)) < 300000) ? 'Online' : 'Offline'}
                        </span>
                    </div>

                    {/* Info Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90">
                        <div className="absolute bottom-0 w-full p-3 text-white">
                            <div className="flex justify-between items-end">
                                <div className="flex-1 min-w-0 mr-2">
                                    <h3 className="font-bold text-lg leading-none shadow-black drop-shadow-md flex items-center gap-1.5">
                                        <span className="truncate">{model.artistic_name || model.username}</span>
                                        {model.is_verified && (
                                            <CheckCircle2 size={16} className="text-[#3897f0] fill-[#3897f0] text-white shrink-0" />
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-300 mt-1.5">
                                        <MapPin size={12} className="shrink-0" />
                                        <span className="truncate">{model.country || 'Internacional'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg shrink-0">
                                    <span className="font-bold text-sm">
                                        {(model.reputation_score !== undefined && model.reputation_score !== null)
                                            ? parseFloat(model.reputation_score).toFixed(1)
                                            : '5.0'}
                                    </span>
                                    <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
