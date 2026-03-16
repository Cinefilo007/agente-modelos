import React, { useState, useEffect } from 'react';
import {
    Wallet, Star, Clock, ShieldCheck, ChevronRight,
    CreditCard, ArrowUpRight, History, Settings, LogOut, Edit3, FileText
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { isOnline as checkOnline } from '../utils/date';

export default function ClientProfile() {
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const [balance, setBalance] = useState({ balance: 0, currency: 'USDT' });
    const [following, setFollowing] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [myPurchases, setMyPurchases] = useState([]);
    const navigate = useNavigate();

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'avatar');

        try {
            showToast("Subiendo avatar...", "info");
            const { data } = await api.post('/profile/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Actualizar en la base de datos del cliente
            await api.put('/profile/me', { avatar_url: data.url });

            showToast("Avatar actualizado con éxito", "success");
            window.location.reload();
        } catch (err) {
            console.error("Error uploading avatar:", err);
            showToast("Error al subir el avatar", "error");
        }
    };

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
        <div className="min-h-screen pb-24 bg-[#0a060e] text-white font-sans relative overflow-x-hidden">

            {/* fondo unificado con el perfil de modelo */}
            <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute top-[10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full"></div>
            </div>

            <div className="px-4 pt-12 relative z-10 w-full max-w-lg mx-auto">

                {/* 1. IDENTITY SECTION (Glassmorphism) */}
                <div className="flex flex-col items-center mb-8 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative">
                    <div className="relative -mt-20 mb-6 group">
                        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-3xl transform group-hover:scale-125 transition-all duration-700 opacity-50"></div>

                        <div className="relative p-1 rounded-full bg-gradient-to-tr from-purple-500 via-blue-500 to-pink-500 shadow-[0_0_30px_rgba(184,41,227,0.3)]">
                            <Avatar
                                src={user.avatar_url || user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                                name={name}
                                size="xl"
                                className="w-28 h-28 border-4 border-[#0a060e] relative z-10"
                            />
                        </div>

                        <label className="absolute bottom-1 right-1 p-2.5 bg-white text-black rounded-full shadow-xl hover:scale-110 transition-transform z-20 cursor-pointer">
                            <Edit3 size={14} strokeWidth={3} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                    </div>

                    <div className="text-center">
                        <h2 className="text-3xl font-black tracking-tight text-white mb-2">{name}</h2>
                        <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                                <ShieldCheck size={12} className="text-blue-400" />
                                <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em]">Verified Fan</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. STATS ROW (Real Data) */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 flex flex-col items-center justify-center text-center text-glow-purple">
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Reputación</span>
                        <div className="text-lg font-black text-white">{user.global_reputation || 0}</div>
                        <div className="text-[8px] font-bold text-purple-400 mt-1 uppercase tracking-tight">Exp Points</div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Invertido</span>
                        <div className="text-lg font-black text-white text-glow">${myPurchases.reduce((acc, curr) => acc + Number(curr.amount), 0).toFixed(0)}</div>
                        <div className="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-tight">Nebula USD</div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Favoritas</span>
                        <div className="text-lg font-black text-white">{following.length}</div>
                        <div className="text-[8px] font-bold text-blue-400 mt-1 uppercase tracking-tight">Modelos</div>
                    </div>
                </div>

                {/* 3. PREMIUM WALLET CARD */}
                <div className="bg-gradient-to-br from-[#121215] to-black rounded-[2.5rem] p-8 text-white shadow-2xl mb-8 relative overflow-hidden border border-white/5 group">
                    {/* Decorative Elements */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/20 transition-all"></div>
                    <div className="absolute top-4 right-8 opacity-20 group-hover:opacity-40 transition-all">
                        <Star size={40} className="text-blue-400" />
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-6 opacity-60">
                            <Wallet size={16} className="text-blue-400" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Nebula Digital Card</span>
                        </div>

                        <div className="mb-8">
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Available Credits</p>
                            <div className="flex items-baseline gap-2">
                                <h1 className="text-5xl font-black tracking-tighter text-glow">${Number(balance.balance).toFixed(2)}</h1>
                                <span className="text-sm font-bold opacity-40 uppercase tracking-widest">{balance.currency}</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => navigate('/wallet')}
                                className="flex-1 bg-white text-black hover:bg-gray-200 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
                            >
                                <ArrowUpRight size={16} strokeWidth={3} /> Añadir Fondos
                            </button>
                            <button
                                onClick={() => navigate('/wallet')}
                                className="px-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                            >
                                <History size={20} className="opacity-60" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4. ESCROW SERVICES SECTION (New) */}
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="font-black text-sm uppercase tracking-[0.2em] text-white/80">Servicios Escrow Activos</h3>
                        <div className="bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20 text-[10px] font-black text-yellow-500 uppercase tracking-widest">Protegido</div>
                    </div>

                    <div className="space-y-3">
                        {myPurchases.filter(p => !['COMPLETED', 'completed', 'REJECTED', 'rejected'].includes(p.status)).length === 0 ? (
                            <div className="p-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic">No hay servicios en curso</p>
                            </div>
                        ) : (
                            myPurchases.filter(p => !['COMPLETED', 'completed', 'REJECTED', 'rejected'].includes(p.status)).map((order) => (
                                <Link
                                    key={order.id}
                                    to={`/order/${order.id}`}
                                    className="flex items-center gap-4 p-5 bg-white/[0.03] border border-white/5 rounded-3xl hover:bg-white/[0.06] transition-all group"
                                >
                                    <Avatar src={order.models?.avatar_url} size="md" className="w-12 h-12" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-[11px] font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-widest truncate max-w-[120px]">
                                                {order.model_services?.title || "Servicio Premium"}
                                            </h4>
                                            <span className="text-[11px] font-black text-white/70">${Number(order.amount).toFixed(0)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                                    {order.status}
                                                </span>
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-600 uppercase italic">
                                                {format(new Date(order.created_at), "d MMM", { locale: es })}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-white/20 group-hover:translate-x-1 transition-all" />
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* 5. FOLLOWING LIST (Slider) */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h3 className="font-black text-sm uppercase tracking-[0.2em] text-white/80">Mis Favoritas</h3>
                        <Link to="/explore" className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400">Descubrir</Link>
                    </div>
                    <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
                        {following.length === 0 ? (
                            <div className="w-full py-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Aún no sigues a nadie</p>
                            </div>
                        ) : (
                            following.map((model) => (
                                <div key={model.id} className="flex flex-col items-center min-w-[76px] group">
                                    <div className="relative mb-3 cursor-pointer" onClick={() => navigate(`/${model.username}`)}>
                                        <div className={`p-[2px] rounded-full ${model.is_online ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-white/10'}`}>
                                            <Avatar
                                                src={model.avatar}
                                                name={model.name}
                                                size="lg"
                                                className="w-16 h-16 border-2 border-[#0a0a0c] group-hover:scale-105 transition-transform"
                                            />
                                        </div>
                                        {model.is_online && (
                                            <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-4 border-[#0a0a0c] rounded-full"></div>
                                        )}
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-blue-400 transition-colors truncate w-full text-center">
                                        {model.name?.split(' ')[0]}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 5. PURCHASES & ACTIVITY (Glass Lists) */}
                <div className="space-y-4 mb-12">
                    <h3 className="font-black text-sm uppercase tracking-[0.2em] text-white/80 px-1 mb-6">Actividad Reciente</h3>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">
                        {recentActivity.length === 0 ? (
                            <div className="p-10 text-center text-white/30 text-[10px] font-black tracking-widest uppercase">Sin movimientos</div>
                        ) : (
                            recentActivity.map((tx, idx) => (
                                <div key={tx.id} className={`p-5 flex items-center gap-4 ${idx !== recentActivity.length - 1 ? 'border-b border-white/5' : ''}`}>
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {tx.type === 'DEPOSIT' ? <ArrowUpRight size={18} /> : <CreditCard size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <h4 className="text-[11px] font-black text-white/90 uppercase tracking-widest">
                                                {tx.type === 'TIP' ? 'TIP ENVIADO'
                                                    : tx.type === 'GIFT' ? 'REGALO ENVIADO'
                                                        : tx.type === 'DEPOSIT' ? 'DEPÓSITO EXITOSO'
                                                            : tx.type}
                                            </h4>
                                            <span className={`text-xs font-black ${tx.type === 'DEPOSIT' ? 'text-green-500' : 'text-white'}`}>
                                                {tx.type === 'DEPOSIT' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase">{tx.details?.to_name || 'System'}</span>
                                            <span className="w-1 h-1 rounded-full bg-white/10"></span>
                                            <span className="text-[9px] font-bold text-gray-600 uppercase italic">{format(new Date(tx.created_at), "d MMM", { locale: es })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 7. EXIT MENU */}
                <div className="space-y-3 px-2">
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-between p-6 bg-red-500/5 border border-red-500/10 rounded-3xl hover:bg-red-500/10 transition-all group"
                    >
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-red-500/10 rounded-2xl text-red-500/40 group-hover:text-red-500 transition-all">
                                <LogOut size={18} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-red-500/60 group-hover:text-red-500 transition-colors">Finalizar Sesión</span>
                        </div>
                        <ChevronRight size={14} className="text-red-500/20 group-hover:text-red-500 transition-all" />
                    </button>
                </div>

            </div>
        </div>
    );
}
