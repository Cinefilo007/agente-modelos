import React, { useState, useEffect } from 'react';
import {
    Wallet, Star, Clock, ShieldCheck, ChevronRight,
    CreditCard, ArrowUpRight, History, Settings, LogOut, Edit3, FileText
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import { isOnline as checkOnline } from '../utils/date';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

export default function ClientProfile() {
    const { themeColor } = useTheme();
    const { user, logout } = useAuth();
    const [balance, setBalance] = useState({ balance: 0, currency: 'USDT' });
    const [following, setFollowing] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [myPurchases, setMyPurchases] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [balRes, followRes, txRes, purchaseRes] = await Promise.all([
                    api.get('/wallet/balance').catch(() => ({ data: { balance: 0, currency: 'USDT' } })),
                    api.get('/interactions/following/me').catch(() => ({ data: [] })),
                    api.get('/wallet/history?page=1&limit=3').catch(() => ({ data: { transactions: [] } })),
                    api.get('/orders/my-purchases').catch(() => ({ data: [] }))
                ]);
                setBalance(balRes.data);
                setMyPurchases(purchaseRes.data || []);

                // Parse following models
                const formattedFollowing = (followRes.data || []).map(f => ({
                    id: f.model_id,
                    name: f.models?.artistic_name || f.models?.full_name || f.models?.username || "Modelo",
                    avatar: f.models?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.model_id}`,
                    is_online: f.models?.last_seen ? checkOnline(f.models.last_seen) : false,
                    username: f.models?.username
                }));
                setFollowing(formattedFollowing);

                // Parse transactions for activity
                const transactions = txRes.data?.transactions || (Array.isArray(txRes.data) ? txRes.data : []);
                setRecentActivity(transactions.slice(0, 3));

            } catch (e) {
                console.error("Error fetching client data", e);
            }
        };
        fetchData();
    }, []);

    if (!user) return null;

    const name = user.username || user.first_name || "Usuario";

    return (
        <div className="min-h-screen pb-24 bg-background text-foreground font-sans relative">

            {/* Elegant Header Background */}
            <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden pointer-events-none z-0">
                <div
                    className="w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-black opacity-80"
                    style={{
                        maskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)'
                    }}
                />
            </div>

            <div className="px-4 pt-16 relative z-10 w-full max-w-lg mx-auto">
                {/* Header / Identity with Glass Card */}
                <div className="flex flex-col items-center mb-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-2xl relative mt-4">
                    <div className="relative -mt-16 mb-4 group">
                        <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl transform group-hover:scale-110 transition-transform duration-500"></div>
                        <Avatar
                            src={user.avatar_url || user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                            name={name}
                            size="xl"
                            className="w-28 h-28 border-[3px] border-[#0f0f13] relative z-10 shadow-2xl"
                        />
                        <button className="absolute bottom-1 right-1 p-2 bg-gradient-to-r from-blue-600 to-purple-600 border border-white/20 rounded-full text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all z-20">
                            <Edit3 size={14} />
                        </button>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold tracking-tight text-white">{name}</h2>
                            <ShieldCheck size={18} className="text-blue-400" />
                        </div>
                        <div className="flex items-center gap-2 mt-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 shadow-sm">
                            <Star size={12} className="text-blue-400" />
                            <span className="font-bold text-xs text-blue-200 uppercase tracking-widest">CUENTA CLIENTE</span>
                        </div>
                    </div>
                </div>

                {/* WALLET CARD */}
                <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 rounded-3xl p-6 text-white shadow-[0_10px_40px_rgba(59,130,246,0.3)] mb-10 relative overflow-hidden border border-white/10">
                    <div className="absolute top-0 right-0 p-6 opacity-5 transform translate-x-4 -translate-y-4">
                        <Wallet size={120} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-2 opacity-80">Saldo de Billetera</p>
                        <div className="flex items-baseline gap-2 mb-6">
                            <h1 className="text-4xl font-black tracking-tighter">${Number(balance.balance).toFixed(2)}</h1>
                            <span className="text-lg font-medium opacity-70">{balance.currency}</span>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => navigate('/wallet')} className="flex-1 bg-white border-transparent text-blue-900 hover:bg-gray-100 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                                <ArrowUpRight size={18} /> Recargar
                            </button>
                            <button onClick={() => navigate('/wallet')} className="flex-1 bg-black/30 hover:bg-black/40 backdrop-blur-md border border-white/10 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                                <History size={18} /> Historial
                            </button>
                        </div>
                    </div>
                </div>

                {/* My Purchases */}
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-5 px-1">
                        <h3 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                            <FileText size={20} className="text-blue-400" /> Mis Compras
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {myPurchases.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 italic text-center bg-white/5 rounded-3xl">No has realizado compras aún.</p>
                        ) : (
                            myPurchases.map((order) => (
                                <Link
                                    key={order.id}
                                    to={`/order/${order.id}`}
                                    className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/5 group"
                                >
                                    <Avatar src={order.models?.avatar_url} size="sm" />
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate max-w-[150px]">
                                                {order.model_services?.title || "Servicio"}
                                            </h4>
                                            <span className="text-[10px] font-black text-white/50">${Number(order.amount).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={clsx(
                                                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                                                (order.status === 'COMPLETED' || order.status === 'completed') ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"
                                            )}>
                                                {order.status}
                                            </span>
                                            <span className="text-[8px] text-muted-foreground">{format(new Date(order.created_at), "d MMM", { locale: es })}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Following Models */}
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-5 px-1">
                        <h3 className="font-bold text-lg text-white tracking-tight">Siguiendo</h3>
                        <Link to="/explore" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">Ver todas</Link>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        {following.map((model) => (
                            <div key={model.id} className="flex flex-col items-center min-w-[70px]">
                                <div className="relative mb-2 cursor-pointer" onClick={() => navigate(`/${model.username}`)}>
                                    <Avatar
                                        src={model.avatar}
                                        name={model.name}
                                        size="lg"
                                        className="border-2 border-card"
                                    />
                                    {model.is_online && (
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

                {/* Recent Activity */}
                <div className="bg-card/40 border border-white/5 rounded-3xl p-5 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <History size={20} className="text-purple-400" /> Actividad Reciente
                        </h3>
                        <Link to="/wallet" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">Ver historial</Link>
                    </div>
                    <div className="space-y-4">
                        {recentActivity.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2 italic text-center">No hay transacciones recientes.</p>
                        ) : (
                            recentActivity.map((tx) => (
                                <div key={tx.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0 flex justify-between items-center">
                                    <div>
                                        <div className="font-semibold text-sm text-foreground">
                                            {tx.type === 'TIP' ? 'Tip enviado a ' + (tx.details?.to_name || 'Modelo')
                                                : tx.type === 'GIFT' ? `Regalo enviado a ${tx.details?.to_name || 'Modelo'}`
                                                    : tx.type === 'DEPOSIT' ? 'Depósito'
                                                        : tx.type}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{format(new Date(tx.created_at), "d MMM, HH:mm", { locale: es })}</span>
                                    </div>
                                    <div className={`font-bold text-sm ${['DEPOSIT'].includes(tx.type) ? 'text-green-400' : 'text-white'}`}>
                                        {['DEPOSIT'].includes(tx.type) ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Menu Links */}
                <div className="bg-card/30 backdrop-blur-md border border-white/5 rounded-[1.5rem] overflow-hidden shadow-xl">
                    <button className="w-full flex items-center justify-between p-4.5 hover:bg-white/5 transition-colors border-b border-white/5 group">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/5 rounded-xl group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                                <CreditCard size={18} className="text-muted-foreground group-hover:text-blue-400 transition-colors" />
                            </div>
                            <span className="text-sm font-semibold text-white/90">Métodos de Pago</span>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4.5 hover:bg-white/5 transition-colors border-b border-white/5 group">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
                                <Settings size={18} className="text-muted-foreground group-hover:text-white transition-colors" />
                            </div>
                            <span className="text-sm font-semibold text-white/90">Configuración</span>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-between p-4.5 hover:bg-red-500/10 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
                                <LogOut size={18} className="text-red-400" />
                            </div>
                            <span className="text-sm font-semibold text-red-400">Cerrar Sesión</span>
                        </div>
                    </button>
                </div>

            </div>
        </div>
    );
}
