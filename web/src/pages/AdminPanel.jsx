import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Users, DollarSign, CreditCard, TrendingUp, ArrowLeft, Save, Sparkles, Tag, Wallet, FileText, ShieldAlert, AlertTriangle, ShieldCheck, ShoppingBag, Loader, X, Gamepad2, Plus, Coins, BarChart2, Settings, Calendar, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import clsx from 'clsx';
import WalletPanel from '../components/wallet/WalletPanel';
import PostCalendar from '../components/posts/PostCalendar';
import ShopManager from '../components/shop/ShopManager';
import CasinoPrizeManager from '../components/admin/CasinoPrizeManager';

export default function AdminPanel() {
    const { themeColor } = useTheme();
    const [stats, setStats] = useState({ visitors: 0, sales_count: 0, revenue: 0, credits: 0, conversion_rate: 0, visitors_growth: 0, sales_growth: 0 });
    const [exposure, setExposure] = useState([0, 0, 0, 0, 0, 0, 0]);
    const [activeTab, setActiveTab] = useState('analytics'); // analytics, bot, calendar, shop, wallet, casino
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();
    const [config, setConfig] = useState({
        prices: "",
        personality: "",
        physicalAspects: "",
        paymentMethods: ""
    });

    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [summaryRes, exposureRes, profileRes] = await Promise.all([
                    api.get('/analytics/model/summary'),
                    api.get('/analytics/model/exposure'),
                    api.get('/profile/me')
                ]);

                setStats(summaryRes.data);
                setExposure(exposureRes.data);

                if (profileRes.data) {
                    const physicalAspects = profileRes.data.physical_aspects || "";
                    setConfig({
                        prices: profileRes.data.prices || "",
                        personality: profileRes.data.personality || "",
                        physicalAspects: physicalAspects,
                        paymentMethods: profileRes.data.payment_methods || ""
                    });

                    if (physicalAspects) {
                        setTags(physicalAspects.split(',').map(t => t.trim()).filter(Boolean));
                    }
                }
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
            e.preventDefault();
            const value = tagInput.trim();
            if (value && !tags.includes(value)) {
                const newTags = [...tags, value];
                setTags(newTags);
                setConfig(prev => ({ ...prev, physicalAspects: newTags.join(', ') }));
                setTagInput("");
            }
        }
    };

    const removeTag = (tagToRemove) => {
        const newTags = tags.filter(tag => tag !== tagToRemove);
        setTags(newTags);
        setConfig(prev => ({ ...prev, physicalAspects: newTags.join(', ') }));
    };

    const handleSaveBotConfig = async () => {
        setSaving(true);
        try {
            await api.put('/profile/me', {
                prices: config.prices,
                personality: config.personality,
                physical_aspects: config.physicalAspects,
                payment_methods: config.paymentMethods
            });
            showToast("Configuración guardada correctamente", "success");
        } catch (err) {
            showToast("Error al guardar la configuración", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
                <Loader className="w-10 h-10 text-primary animate-spin mb-4" style={{ color: themeColor }} />
                <p className="text-muted-foreground animate-pulse">Cargando panel administrativo...</p>
            </div>
        );
    }

    const tabs = [
        { id: 'analytics', label: 'Métricas', icon: BarChart2 },
        { id: 'bot', label: 'Bot Config', icon: Settings },
        { id: 'calendar', label: 'Calendario', icon: Calendar },
        { id: 'shop', label: 'Mi Tienda', icon: ShoppingBag },
        { id: 'wallet', label: 'Billetera', icon: Wallet },
        { id: 'casino', label: 'Casino', icon: Trophy },
    ];

    const renderAnalytics = () => (
        <div className="animate-in fade-in duration-500">
            <div className="mb-6 px-1">
                <p className="text-muted-foreground">Hola, <span className="text-foreground font-semibold">{stats.model_name || 'Modelo'}</span> 👋</p>
                <p className="text-xs text-muted-foreground/60">Aquí tienes el resumen de tu rendimiento esta semana.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-card/40 border border-white/5 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:bg-card/60 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Users size={48} />
                    </div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold mb-2 opacity-80">Visitas</span>
                    <span className="text-3xl font-bold text-white leading-none">{stats.visitors.toLocaleString()}</span>
                    <div className={clsx(
                        "flex items-center gap-1.5 mt-2 w-fit px-2 py-0.5 rounded-full",
                        stats.visitors_growth >= 0 ? "bg-green-500/10" : "bg-red-500/10"
                    )}>
                        <TrendingUp size={12} className={stats.visitors_growth >= 0 ? "text-green-400" : "text-red-400"} />
                        <span className={clsx("text-[10px] font-bold", stats.visitors_growth >= 0 ? "text-green-400" : "text-red-400")}>
                            {stats.visitors_growth > 0 ? '+' : ''}{stats.visitors_growth}%
                        </span>
                    </div>
                </div>

                <div className="bg-card/40 border border-white/5 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:bg-card/60 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <DollarSign size={48} />
                    </div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold mb-2 opacity-80">Ventas</span>
                    <span className="text-3xl font-bold text-white leading-none">${stats.revenue.toLocaleString()}</span>
                    <div className={clsx(
                        "flex items-center gap-1.5 mt-2 w-fit px-2 py-0.5 rounded-full",
                        stats.sales_growth >= 0 ? "bg-green-500/10" : "bg-red-500/10"
                    )}>
                        <TrendingUp size={12} className={stats.sales_growth >= 0 ? "text-green-400" : "text-red-400"} />
                        <span className={clsx("text-[10px] font-bold", stats.sales_growth >= 0 ? "text-green-400" : "text-red-400")}>
                            {stats.sales_growth > 0 ? '+' : ''}{stats.sales_growth}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-card/40 border border-white/5 rounded-3xl p-6 mb-8 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-400" /> Exposición
                    </h3>
                </div>

                <div className="h-48 w-full relative mt-4">
                    {(() => {
                        const maxVal = Math.max(...exposure, 5);
                        const width = 100;
                        const height = 100;
                        const points = exposure.map((val, i) => {
                            const x = (i / (exposure.length - 1)) * width;
                            const y = height - (val / maxVal) * height;
                            return { x, y };
                        });

                        const pathStr = points.map(p => `${p.x},${p.y}`).join(' ');
                        const areaPath = `M 0,${height} ` + points.map(p => `L ${p.x},${p.y}`).join(' ') + ` L ${width},${height} Z`;
                        const lastPoint = points[points.length - 1];

                        return (
                            <div className="absolute inset-0">
                                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={themeColor} stopOpacity="0.3" />
                                            <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path d={areaPath} fill="url(#chartGradient)" />
                                    <polyline points={pathStr} fill="none" stroke={themeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div className="absolute transform -translate-x-1/2 -translate-y-full" style={{ left: `${lastPoint.x}%`, top: `${lastPoint.y}%`, marginTop: '-12px' }}>
                                    <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white">
                                        {exposure[exposure.length - 1]} visitas hoy
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );

    const renderBotConfig = () => (
        <div className="animate-in fade-in duration-500 space-y-5">
            <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles size={24} style={{ color: themeColor }} /> Configuración del Bot</h2>
            <div className="bg-card/40 border border-white/5 rounded-3xl p-6">
                <label className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2"><DollarSign size={16} /> Lista de Precios</label>
                <textarea name="prices" value={config.prices} onChange={handleInputChange} rows={4} className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:border-white/30" />
            </div>
            <div className="bg-card/40 border border-white/5 rounded-3xl p-6">
                <label className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2"><FileText size={16} /> Personalidad</label>
                <textarea name="personality" value={config.personality} onChange={handleInputChange} rows={5} className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:border-white/30" />
            </div>
            <button onClick={handleSaveBotConfig} disabled={saving} className="w-full py-5 rounded-3xl font-bold text-white flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50" style={{ backgroundColor: themeColor }}>
                {saving ? <Loader className="animate-spin" /> : <Save size={20} />}
                {saving ? 'Guardando...' : 'Guardar Entrenamiento'}
            </button>
        </div>
    );

    return (
        <div className="min-h-screen pb-20 pt-4 px-4 font-sans max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link to="/profile" className="p-2 rounded-full bg-card/50 border border-white/5 text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Panel de Control</h1>
            </div>

            <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 whitespace-nowrap",
                            activeTab === tab.id ? "bg-white text-black shadow-xl" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="pb-10">
                {activeTab === 'analytics' && renderAnalytics()}
                {activeTab === 'bot' && renderBotConfig()}
                {activeTab === 'calendar' && <PostCalendar />}
                {activeTab === 'shop' && <ShopManager />}
                {activeTab === 'wallet' && <WalletPanel />}
                {activeTab === 'casino' && <CasinoPrizeManager themeColor={themeColor} />}
            </div>
        </div>
    );
}
