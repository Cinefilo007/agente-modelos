import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Clock, Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export function ShopTabContent({ modelId, isOwnProfile, username }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchShop = async () => {
            if (!username) return;
            try {
                const { data } = await api.get(`/shop/shop/${username}`);
                setServices(data || []);
            } catch (err) {
                console.error("Error fetching shop:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchShop();
    }, [username]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                <p className="text-sm">Cargando tienda...</p>
            </div>
        );
    }

    if (services.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <ShoppingBag size={32} className="text-white/20" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Tienda vacía</h3>
                <p className="text-sm text-gray-400 mb-8 max-w-xs">
                    {isOwnProfile
                        ? "Configura tus servicios para empezar a recibir pedidos directos y seguros."
                        : "Esta modelo aún no ha configurado sus servicios."}
                </p>
                {isOwnProfile && (
                    <button
                        onClick={() => navigate('/shop-manager')}
                        className="px-8 py-3 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors shadow-lg active:scale-95"
                    >
                        Gestionar Servicios
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 gap-4">
                {services.map((service) => (
                    <div
                        key={service.id}
                        onClick={() => navigate(`/service/${service.id}`)}
                        className="bg-card/40 border border-white/5 rounded-3xl p-5 hover:bg-white/5 transition-all group active:scale-[0.98] cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-lg text-white group-hover:text-primary transition-colors flex items-center gap-2">
                                    {service.title}
                                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                                </h4>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                                    {service.category}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold text-white block">Desde</span>
                                <span className="text-lg font-black text-green-400">
                                    ${service.model_service_options?.[0]?.price || '0.00'}
                                </span>
                            </div>
                        </div>

                        <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                            {service.description}
                        </p>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                                <Star size={12} className="text-yellow-400" /> +{service.model_service_options?.length} Opciones
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase pl-3 border-l border-white/10">
                                <Clock size={12} className="text-blue-400" /> Entrega Rápida
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isOwnProfile && (
                <button
                    onClick={() => navigate('/shop-manager')}
                    className="w-full mt-6 py-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:text-white hover:border-white/20 transition-all active:scale-[0.98]"
                >
                    <Plus size={20} />
                    <span className="font-bold">Añadir más servicios</span>
                </button>
            )}
        </div>
    );
}
