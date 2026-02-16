import React, { useState } from 'react';
import {
    Wallet, Star, Clock, ShieldCheck, ChevronRight,
    CreditCard, ArrowUpRight, History, Settings, LogOut, Edit3
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import { useEffect } from 'react';

export default function ClientProfile() {
    const { themeColor } = useTheme();
    const { user, logout } = useAuth();
    const [balance, setBalance] = useState({ balance: 0, currency: 'USDT' });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const res = await api.get('/wallet/balance');
                setBalance(res.data);
            } catch (e) {
                console.error("Error fetching balance", e);
            }
        };
        fetchBalance();
    }, []);

    if (!user) return null;

    const name = user.artistic_name || user.full_name || user.username || "Usuario";
    const avatarUrl = user.avatar_url || user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`;

    // Mock Data
    const reviews = [
        { id: 1, model: "Valentina Rose", rating: 5, comment: "Muy amable y respetuoso. Pago inmediato.", date: "2d ago", tags: ["Generoso", "Rápido"] },
        { id: 2, model: "Sarah Miller", rating: 4, comment: "Buena comunicación.", date: "1w ago", tags: ["Comunicativo"] },
    ];

    const following = [
        { id: 1, name: "Valentina Rose", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330", status: "online" },
        { id: 2, name: "Jessica Jones", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9", status: "offline" },
        { id: 3, name: "Emily Blunt", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1", status: "online" },
    ];

    return (
        <div className="min-h-screen pb-24 pt-6 px-4 font-sans bg-background text-foreground">

            {/* Header / Identity */}
            <div className="flex flex-col items-center mb-8 relative">
                <div className="relative mb-3 group">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl transform group-hover:scale-110 transition-transform duration-500"></div>
                    <Avatar
                        src={user.avatar_url || user.avatar}
                        name={name}
                        size="xl"
                        className="w-24 h-24 border-4 border-background relative z-10"
                    />
                    <button className="absolute bottom-0 right-0 p-1.5 bg-card border border-white/10 rounded-full text-foreground hover:bg-white/10 transition-colors z-20">
                        <Edit3 size={12} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{name}</h2>
                    <Edit3 size={14} className="text-muted-foreground cursor-pointer hover:text-foreground" />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span className="font-bold text-sm">4.8</span>
                    <span className="text-xs text-muted-foreground">(12 reviews)</span>
                </div>
            </div>

            {/* WALLET CARD (Telegram Native Style) */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-2xl shadow-blue-900/40 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Wallet size={80} />
                </div>
                <div className="relative z-10">
                    <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-2">Telegram Wallet Balance</p>
                    <h1 className="text-4xl font-bold mb-6">${Number(balance.balance).toFixed(2)} <span className="text-lg opacity-70">{balance.currency}</span></h1>

                    <div className="flex gap-3">
                        <button onClick={() => navigate('/wallet')} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/10 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer">
                            <ArrowUpRight size={18} /> Recargar
                        </button>
                        <button onClick={() => navigate('/wallet')} className="flex-1 bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/5 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer">
                            <History size={18} /> Historial
                        </button>
                    </div>
                </div>
            </div>

            {/* Following Models */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Siguiendo</h3>
                    <Link to="/explore" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">Ver todas</Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {following.map((model) => (
                        <div key={model.id} className="flex flex-col items-center min-w-[70px]">
                            <div className="relative mb-2">
                                <Avatar
                                    src={model.avatar}
                                    name={model.name}
                                    size="lg"
                                    className="border-2 border-card"
                                />
                                {model.status === 'online' && (
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full"></div>
                                )}
                            </div>
                            <span className="text-xs font-medium truncate w-full text-center">{model.name.split(' ')[0]}</span>
                        </div>
                    ))}
                    <Link to="/explore" className="flex flex-col items-center justify-center min-w-[70px]">
                        <div className="w-16 h-16 rounded-full bg-card/50 border border-white/10 flex items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors mb-2">
                            <ChevronRight size={24} />
                        </div>
                        <span className="text-xs font-medium">Explorar</span>
                    </Link>
                </div>
            </div>

            {/* Reputation / Reviews */}
            <div className="bg-card/40 border border-white/5 rounded-3xl p-5 mb-8">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-green-400" /> Tu Reputación
                </h3>
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review.id} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-semibold text-sm text-foreground">{review.model}</span>
                                <span className="text-[10px] text-muted-foreground">{review.date}</span>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={10} className={i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground italic">"{review.comment}"</p>
                            <div className="flex gap-2 mt-2">
                                {review.tags.map((tag, i) => (
                                    <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-muted-foreground border border-white/5">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Menu Links */}
            <div className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden">
                <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <CreditCard size={18} className="text-muted-foreground" />
                        <span className="text-sm font-medium">Métodos de Pago</span>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                </button>
                <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Settings size={18} className="text-muted-foreground" />
                        <span className="text-sm font-medium">Configuración</span>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                </button>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors text-red-400"
                >
                    <div className="flex items-center gap-3">
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Cerrar Sesión</span>
                    </div>
                </button>
            </div>

        </div>
    );
}
