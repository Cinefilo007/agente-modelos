import { Link } from 'react-router-dom';

export function ModelGrid({ models }) {
    const { themeColor } = useTheme();

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3">
            {models.map((model) => (
                <Link
                    key={model.id}
                    to={`/profile/${model.id}`}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg group block"
                >
                    <img
                        src={model.avatar_url || model.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${model.username}`}
                        alt={model.artistic_name || model.username}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />

                    {/* Online Indicator */}
                    {model.is_online && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-green-500/30">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] uppercase font-bold text-white tracking-wider">Online</span>
                        </div>
                    )}

                    {/* Info Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90">
                        <div className="absolute bottom-0 w-full p-3 text-white">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="font-bold text-lg leading-none shadow-black drop-shadow-md">
                                        {model.artistic_name || model.username}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-300 mt-1">
                                        <MapPin size={12} />
                                        <span>Medellín</span> {/* Placeholder or fetch from model if available */}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg">
                                    <span className="font-bold text-sm">4.9</span>
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
