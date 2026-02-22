import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import { isOnline as checkOnline } from '../../utils/date';

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
            {models.map((model) => {
                const isOnline = checkOnline(model.last_seen);
                return (
                    <Link
                        key={model.id}
                        to={`/${model.username || model.id}`}
                        className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg group block bg-[#1a1a1a]"
                    >
                        <img
                            src={model.avatar_url || model.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${model.username}`}
                            alt={model.artistic_name || model.username}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />

                        {/* Status Badge (Top Right) */}
                        <div className={cn(
                            "absolute top-2 right-2 flex items-center gap-1.5 backdrop-blur-md bg-black/40 border border-white/10 h-7 px-2.5 rounded-lg z-10",
                            isOnline ? "text-green-400" : "text-gray-400"
                        )}>
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isOnline ? "bg-green-500 animate-pulse" : "bg-gray-500"
                            )}></span>
                            <span className="text-[10px] uppercase font-bold tracking-wider leading-none">
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>

                        {/* Rating Badge (Top Left) */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 backdrop-blur-md bg-black/40 border border-white/10 h-7 px-2.5 rounded-lg z-10">
                            <span className="font-bold text-[10px] text-white leading-none">
                                {(model.reputation_score !== undefined && model.reputation_score !== null)
                                    ? parseFloat(model.reputation_score).toFixed(1)
                                    : '5.0'}
                            </span>
                            <Star size={10} className="fill-yellow-400 text-yellow-400" />
                        </div>

                        {/* Info Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90">
                            <div className="absolute bottom-0 w-full p-3 text-white">
                                <div className="flex flex-col gap-1">
                                    <h3 className="font-bold text-lg leading-tight shadow-black drop-shadow-md flex items-center gap-1.5">
                                        <span className="truncate">{model.artistic_name || model.username}</span>
                                        {model.is_verified && (
                                            <CheckCircle2 size={16} className="text-[#3897f0] fill-[#3897f0] text-white shrink-0" />
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-300">
                                        <MapPin size={12} className="shrink-0" />
                                        <span className="truncate">{model.country || 'Internacional'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
