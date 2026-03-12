import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Users, DollarSign, CreditCard, TrendingUp, ArrowLeft, Save, Sparkles, Tag, Wallet, FileText, ShieldAlert, AlertTriangle, ShieldCheck, ShoppingBag, Loader, X, Gamepad2, Plus, Coins, BarChart2, Settings, Calendar, Trophy, Clock, Eye, ChevronLeft, ChevronRight, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import clsx from 'clsx';
import WalletPanel from '../components/wallet/WalletPanel';
import PostCalendar from '../components/posts/PostCalendar';
import ShopManager from './ShopManager';
import CasinoPrizeManager from '../components/admin/CasinoPrizeManager';
import NebulaCoachPanel from '../components/coach/NebulaCoachPanel';

export default function AdminPanel() {
    const { themeColor } = useTheme();
    const [stats, setStats] = useState({ visitors: 0, sales_count: 0, revenue: 0, credits: 0, conversion_rate: 0, visitors_growth: 0, sales_growth: 0 });
    const [exposure, setExposure] = useState([0, 0, 0, 0, 0, 0, 0]);
    const [activeTab, setActiveTab] = useState('analytics'); // analytics, bot, calendar, shop, wallet, casino
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showVisitorsModal, setShowVisitorsModal] = useState(false);
    const [visitors, setVisitors] = useState([]);
    const [loadingVisitors, setLoadingVisitors] = useState(false);

    // Date Filtering
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const { showToast } = useToast();
    const [config, setConfig] = useState({
        prices: "",
        personality: "",
        physicalAspects: "",
        paymentMethods: ""
    });

    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const params = { month: selectedMonth, year: selectedYear };
            const [summaryRes, exposureRes, profileRes] = await Promise.all([
                api.get('/analytics/model/summary', { params }),
                api.get('/analytics/model/exposure', { params }),
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

    const fetchVisitors = async () => {
        setLoadingVisitors(true);
        try {
            const res = await api.get('/analytics/model/visitors');
            setVisitors(res.data);
        } catch (err) {
            console.error("Error fetching visitors:", err);
        } finally {
            setLoadingVisitors(false);
        }
    };

    const handleOpenVisitors = () => {
        setShowVisitorsModal(true);
        fetchVisitors();
    };

    useEffect(() => {
        fetchDashboardData();
    }, [selectedMonth, selectedYear]);

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
        { id: 'coach', label: 'Mi Coach', icon: Brain },
        { id: 'bot', label: 'Bot Config', icon: Settings },
        { id: 'calendar', label: 'Calendario', icon: Calendar },
        { id: 'shop', label: 'Mi Tienda', icon: ShoppingBag },
        { id: 'wallet', label: 'Billetera', icon: Wallet },
        { id: 'casino', label: 'Casino', icon: Trophy },
    ];

    const changeMonth = (delta) => {
        const d = new Date(selectedYear, selectedMonth - 1 + delta, 1);
        setSelectedMonth(d.getMonth() + 1);
        setSelectedYear(d.getFullYear());
    };

    const getMonthName = (m) => {
        const names = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        return names[m - 1];
    };

    const renderAnalytics = () => (
        <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8 px-1">
                <div>
                    <p className="text-muted-foreground">Hola, <span className="text-foreground font-semibold">{stats.model_name || 'Modelo'}</span> 👋</p>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-black mt-1">Panel de Control Premium</p>
                </div>

                <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 active:scale-90">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="text-center px-2 min-w-[100px]">
                        <span className="block text-[9px] uppercase tracking-tighter font-black text-blue-400 leading-none">{selectedYear}</span>
                        <span className="block text-sm font-bold text-white capitalize">{getMonthName(selectedMonth)}</span>
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 active:scale-90">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div onClick={handleOpenVisitors} className="bg-card/40 border border-white/5 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:bg-card/60 transition-colors cursor-pointer">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Users size={48} />
                    </div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold mb-2 opacity-80">Visitas ({stats.period_title})</span>
                    <span className="text-3xl font-bold text-white leading-none">{stats.visitors.toLocaleString()}</span>
                    <div className="flex items-center gap-1.5 mt-2 w-fit px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-400">
                        <Users size={10} /> +Detalle
                    </div>
                </div>

                <div className="bg-card/40 border border-white/5 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:bg-card/60 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <DollarSign size={48} />
                    </div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold mb-2 opacity-80">Ventas ({stats.period_title})</span>
                    <span className="text-3xl font-bold text-white leading-none">${stats.revenue.toLocaleString()}</span>
                    <div className="flex items-center gap-1.5 mt-2 w-fit px-2 py-0.5 rounded-full bg-green-500/10 text-[10px] font-bold text-green-400">
                        <TrendingUp size={10} /> {stats.sales_count} órdenes
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-card/30 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
                    <span className="text-[9px] uppercase tracking-tighter text-gray-500 font-black mb-1">Billetera</span>
                    <span className="text-lg font-bold text-white">${stats.wallet_balance}</span>
                </div>
                <div className="bg-card/30 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
                    <span className="text-[9px] uppercase tracking-tighter text-gray-500 font-black mb-1">IA Créditos</span>
                    <span className="text-lg font-bold text-purple-400">{stats.credits}</span>
                </div>
                <div className="bg-card/30 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
                    <span className="text-[9px] uppercase tracking-tighter text-gray-500 font-black mb-1">Conversión</span>
                    <span className="text-lg font-bold text-blue-400">{stats.conversion_rate}%</span>
                </div>
            </div>

            <div className="bg-card/40 border border-white/5 rounded-3xl p-6 mb-8 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-400" /> Rendimiento Dual
                    </h3>
                    <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1.5 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-400" /> Visitas</span>
                        <span className="flex items-center gap-1.5 text-green-400"><div className="w-2 h-2 rounded-full bg-green-400" /> Ingresos</span>
                    </div>
                </div>

                <div className="h-64 w-full relative mt-4">
                    {exposure && exposure.views && exposure.views.length > 0 ? (() => {
                        const views = exposure.views;
                        const revenue = exposure.revenue;
                        const labels = exposure.labels || [];

                        const maxViews = Math.max(...views, 5);
                        const maxRevenue = Math.max(...revenue, 10);

                        const width = 100;
                        const height = 85; // Reserve space for labels

                        const getPoints = (data, max) => data.map((val, i) => ({
                            x: (i / (data.length - 1)) * width,
                            y: height - (val / max) * height
                        }));

                        const viewPoints = getPoints(views, maxViews);
                        const revenuePoints = getPoints(revenue, maxRevenue);

                        const getPath = (pts) => pts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
                        const getArea = (pts) => `${getPath(pts)} L ${width},${height} L 0,${height} Z`;

                        // Sample labels to show (e.g., every 5 days or every day for week)
                        const labelStep = views.length > 10 ? Math.floor(views.length / 6) : 1;

                        return (
                            <div className="absolute inset-0">
                                <svg viewBox={`0 0 ${width} 100`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                    <defs>
                                        <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.1" />
                                            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.05" />
                                            <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>

                                    {/* Grid Lines (Minimalist) */}
                                    {[0, 25, 50, 75, 100].map(v => (
                                        <line key={v} x1="0" y1={v * height / 100} x2={width} y2={v * height / 100} stroke="white" strokeOpacity="0.03" strokeWidth="0.2" />
                                    ))}

                                    {/* Areas */}
                                    <path d={getArea(viewPoints)} fill="url(#viewGrad)" />
                                    <path d={getArea(revenuePoints)} fill="url(#revGrad)" />

                                    {/* Lines - Minimalist Fine Lines */}
                                    <path d={getPath(viewPoints)} fill="none" stroke="#60A5FA" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d={getPath(revenuePoints)} fill="none" stroke="#4ADE80" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 2" />

                                    {/* Peak Values - Elegant & Small */}
                                    {viewPoints.map((p, i) => {
                                        const val = views[i];
                                        // Show if it's a "peak" (higher than neighbors) and > 0
                                        const isPeak = val > 0 && (i === 0 || val >= views[i - 1]) && (i === views.length - 1 || val >= views[i + 1]);
                                        if (!isPeak) return null;
                                        return (
                                            <text key={`v-${i}`} x={p.x} y={p.y - 3} textAnchor="middle" fill="#60A5FA" style={{ fontSize: '3px', fontWeight: '400', fontFamily: "'Inter', sans-serif" }}>
                                                {val}
                                            </text>
                                        );
                                    })}

                                    {/* Revenue Values on Peaks */}
                                    {revenuePoints.map((p, i) => {
                                        const val = revenue[i];
                                        const isPeak = val > 0 && (i === 0 || val >= revenue[i - 1]) && (i === revenue.length - 1 || val >= revenue[i + 1]);
                                        if (!isPeak) return null;
                                        return (
                                            <text key={`r-${i}`} x={p.x} y={p.y - 3} textAnchor="middle" fill="#4ADE80" style={{ fontSize: '3px', fontWeight: '400', fontFamily: "'Inter', sans-serif" }}>
                                                ${val}
                                            </text>
                                        );
                                    })}

                                    {/* X-Axis Labels - Concordant Font */}
                                    {labels.map((label, i) => {
                                        if (i % labelStep !== 0 && i !== labels.length - 1) return null;
                                        const x = (i / (labels.length - 1)) * width;
                                        const day = label.split('-')[2];
                                        return (
                                            <text key={i} x={x} y={98} textAnchor="middle" fill="white" fillOpacity="0.3" style={{ fontSize: '3.5px', fontWeight: '400', fontFamily: "'Inter', sans-serif", letterSpacing: '0.05em' }}>
                                                {day}
                                            </text>
                                        );
                                    })}
                                </svg>
                            </div>
                        );
                    })() : (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 gap-3 grayscale">
                            <Loader className="animate-spin" size={24} />
                            <span className="text-[10px] uppercase tracking-widest font-black">Cargando Analíticas Duales...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Visitantes */}
            {showVisitorsModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowVisitorsModal(false)} />
                    <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[85vh] flex flex-col">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Users className="text-blue-400" size={20} /> Detalle de Visitantes
                                </h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">Últimas 50 interacciones</p>
                            </div>
                            <button onClick={() => setShowVisitorsModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                            {loadingVisitors ? (
                                <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                                    <Loader className="animate-spin text-white mb-4" />
                                    <p className="text-xs text-gray-400">Cargando visitantes...</p>
                                </div>
                            ) : visitors.length === 0 ? (
                                <div className="text-center py-20 opacity-40">
                                    <Users size={48} className="mx-auto mb-4" />
                                    <p className="text-sm">Aún no hay visitas registradas.</p>
                                </div>
                            ) : (
                                visitors.map((v, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center text-lg font-bold border border-white/5">
                                                {v.username.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{v.username}</p>
                                                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                    <Clock size={10} /> {new Date(v.viewed_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {v.country_code ? (
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5">
                                                    <span className="text-xs font-bold text-gray-300">{v.country_code}</span>
                                                    <img
                                                        src={`https://flagcdn.com/w40/${v.country_code.toLowerCase()}.png`}
                                                        alt={v.country_code}
                                                        className="w-5 h-auto rounded-sm border border-white/10"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-600 font-bold uppercase">Desconocido</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderBotConfig = () => (
        <div className="animate-in fade-in duration-500 space-y-5">
            <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles size={24} style={{ color: themeColor }} /> Configuración del Bot</h2>

            <div className="bg-card/40 border border-white/5 rounded-3xl p-6">
                <label className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2"><DollarSign size={16} /> Lista de Precios</label>
                <textarea name="prices" value={config.prices} onChange={handleInputChange} rows={4} placeholder="Ej: Fotos: $10, Videos: $25..." className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:border-white/30" />
            </div>

            <div className="bg-card/40 border border-white/5 rounded-3xl p-6">
                <label className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2"><FileText size={16} /> Personalidad</label>
                <textarea name="personality" value={config.personality} onChange={handleInputChange} rows={5} placeholder="Describe la personalidad del bot..." className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:border-white/30" />
            </div>

            <div className="bg-card/40 border border-white/5 rounded-3xl p-6">
                <label className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2"><Sparkles size={16} /> Rasgos Físicos</label>
                <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-white/10 bg-white/5 text-white/80">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors ml-1 leading-none">&times;</button>
                        </span>
                    ))}
                </div>
                <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Escribe un rasgo y presiona Enter..."
                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-white/30"
                />
                <p className="text-[10px] text-muted-foreground/50 mt-2">Presiona Enter, coma o espacio para agregar un rasgo.</p>
            </div>

            <div className="bg-card/40 border border-white/5 rounded-3xl p-6">
                <label className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2"><CreditCard size={16} /> Métodos de Pago</label>
                <textarea name="paymentMethods" value={config.paymentMethods} onChange={handleInputChange} rows={4} placeholder="Ej: PayPal, Zelle, Binance..." className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:border-white/30" />
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

            <div className="relative mb-8 group flex items-center">
                <button
                    onClick={() => { document.getElementById('admin-tabs').scrollBy({ left: -200, behavior: 'smooth' }); }}
                    className="absolute left-0 z-10 p-2 bg-black/80 rounded-full border border-white/10 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity -ml-4"
                >
                    <ChevronLeft size={16} />
                </button>
                <div id="admin-tabs" className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mx-1 flex-1 relative scroll-smooth">
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
                <button
                    onClick={() => { document.getElementById('admin-tabs').scrollBy({ left: 200, behavior: 'smooth' }); }}
                    className="absolute right-0 z-10 p-2 bg-black/80 rounded-full border border-white/10 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity -mr-4"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="pb-10">
                {activeTab === 'analytics' && renderAnalytics()}
                {activeTab === 'coach' && <NebulaCoachPanel />}
                {activeTab === 'bot' && renderBotConfig()}
                {activeTab === 'calendar' && <PostCalendar />}
                {activeTab === 'shop' && <ShopManager />}
                {activeTab === 'wallet' && <WalletPanel />}
                {activeTab === 'casino' && <CasinoPrizeManager />}
            </div>
        </div>
    );
}
