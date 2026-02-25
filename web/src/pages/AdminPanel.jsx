import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Users, DollarSign, CreditCard, TrendingUp, ArrowLeft, Save, Sparkles, Tag, Wallet, FileText, ShieldAlert, AlertTriangle, ShieldCheck, ShoppingBag, Loader, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import clsx from 'clsx';
import WalletPanel from '../components/wallet/WalletPanel';

export default function AdminPanel() {
    const { themeColor } = useTheme();
    const [stats, setStats] = useState({ visitors: 0, sales_count: 0, revenue: 0, credits: 0, conversion_rate: 0 });
    const [exposure, setExposure] = useState([0, 0, 0, 0, 0, 0, 0]);
    const [activeTab, setActiveTab] = useState('analytics'); // analytics, bot, shop
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();
    const [config, setConfig] = useState({
        prices: "",
        personality: "",
        physicalAspects: "",
        paymentMethods: ""
    });

    // Tag Input State
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

                // Set Bot Config from profile data (assuming these fields exist in model profile)
                if (profileRes.data) {
                    const physicalAspects = profileRes.data.physical_aspects || "";
                    setConfig({
                        prices: profileRes.data.prices || "",
                        personality: profileRes.data.personality || "",
                        physicalAspects: physicalAspects,
                        paymentMethods: profileRes.data.payment_methods || ""
                    });

                    // Initialize tags from string
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

    // Tag Handlers
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
            // Update profile with bot config fields
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

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={clsx(
                "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 whitespace-nowrap",
                activeTab === id
                    ? "bg-white text-black shadow-xl"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
            )}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="min-h-screen pb-20 pt-4 px-4 font-sans bg-transparent">
            {/* Centered container for Desktop */}
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link to="/profile" className="p-2 rounded-full bg-card/50 border border-white/5 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Panel de Control
                    </h1>
                </div>

                {/* Tabs Selector */}
                <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
                    <TabButton id="analytics" label="Analíticas" icon={TrendingUp} />
                    <TabButton id="bot" label="Bot IA" icon={Sparkles} />
                    <TabButton id="shop" label="Tienda y Seguridad" icon={ShoppingBag} />
                    <TabButton id="wallet" label="Billetera" icon={Wallet} />
                </div>

                {activeTab === 'analytics' && (
                    <>
                        {/* Welcome */}
                        <div className="mb-6 px-1">
                            <p className="text-muted-foreground">Hola, <span className="text-foreground font-semibold">{stats.model_name || 'Modelo'}</span> 👋</p>
                            <p className="text-xs text-muted-foreground/60">Aquí tienes el resumen de tu rendimiento esta semana.</p>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {/* Visits */}
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

                            {/* Sales */}
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

                            {/* Conversion Rate */}
                            <div className="bg-card/40 border border-white/5 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:bg-card/60 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                    <Sparkles size={48} />
                                </div>
                                <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold mb-2 opacity-80">Conversión</span>
                                <span className="text-3xl font-bold text-white leading-none">{stats.conversion_rate}%</span>
                                <div className="flex items-center gap-1.5 mt-2 bg-blue-500/10 w-fit px-2 py-0.5 rounded-full">
                                    <Sparkles size={12} className="text-blue-400" />
                                    <span className="text-[10px] text-blue-400 font-bold">Visitas a Ventas</span>
                                </div>
                            </div>

                            {/* Credits */}
                            <div className="bg-card/40 border border-white/5 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:bg-card/60 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                    <CreditCard size={48} />
                                </div>
                                <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold mb-2 opacity-80">Créditos IA</span>
                                <span className="text-3xl font-bold text-white leading-none" style={{ color: themeColor }}>{stats.credits.toLocaleString()}</span>
                                <div className="flex items-center gap-1.5 mt-2 bg-white/5 w-fit px-2 py-0.5 rounded-full border border-white/5">
                                    <Wallet size={10} className="text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground font-bold">Saldo Actual</span>
                                </div>
                            </div>

                            {/* Persuasive Banner */}
                            <div className="col-span-2 bg-gradient-to-r from-primary/20 via-purple-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-6 flex items-center justify-between gap-6 shadow-xl">
                                <div className="flex-1">
                                    <p className="text-base font-bold text-white mb-1 flex items-center gap-2">
                                        Potencia tus Ganancias 🚀
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                                        {stats.conversion_rate < 5 ?
                                            "Tu conversión está por debajo del promedio. Activa las respuestas automáticas del Bot para no perder ninguna venta." :
                                            "¡Excelente ritmo! Estás convirtiendo más que el promedio. Sigue así para maximizar tus ingresos."
                                        }
                                    </p>
                                </div>
                                <button onClick={() => setActiveTab('bot')} className="px-5 py-3 bg-white text-black font-bold text-xs rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(255,255,255,0.2)] whitespace-nowrap">
                                    Configurar Bot
                                </button>
                            </div>
                        </div>

                        {/* Exposure Chart */}
                        <div className="bg-card/40 border border-white/5 rounded-3xl p-6 mb-8 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-foreground flex items-center gap-2">
                                    <TrendingUp size={18} className="text-blue-400" /> Exposición
                                </h3>
                                <div className="text-[10px] text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                    Últimos 7 días
                                </div>
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
                                                <path
                                                    d={areaPath}
                                                    fill="url(#chartGradient)"
                                                    className="transition-all duration-700 ease-in-out"
                                                />
                                                <polyline
                                                    points={pathStr}
                                                    fill="none"
                                                    stroke={themeColor}
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="transition-all duration-700 ease-in-out"
                                                />
                                            </svg>

                                            <div
                                                className="absolute transform -translate-x-1/2 -translate-y-full"
                                                style={{
                                                    left: `${lastPoint.x}%`,
                                                    top: `${lastPoint.y}%`,
                                                    marginTop: '-12px'
                                                }}
                                            >
                                                <div className="relative flex flex-col items-center">
                                                    <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white shadow-2xl whitespace-nowrap">
                                                        {exposure[exposure.length - 1]} visitas hoy
                                                    </div>
                                                    <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,1)] border-2 border-black/50 mt-1"></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="flex justify-between items-center text-[10px] text-muted-foreground/60 mt-8 px-1">
                                <span>Hace 7 días</span>
                                <span>Hoy</span>
                            </div>
                            <p className="text-center text-[11px] text-muted-foreground/40 mt-4 leading-relaxed">
                                Estadísticas en tiempo real basadas en la actividad de los usuarios.
                            </p>
                        </div>
                    </>
                )}

                {activeTab === 'shop' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                        {/* Commercial Management */}
                        <div className="mb-10">
                            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                                <ShoppingBag size={24} style={{ color: themeColor }} /> Gestión Comercial
                            </h2>
                            <div className="bg-gradient-to-br from-primary/30 to-purple-600/20 border border-white/10 rounded-[32px] p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-all duration-700">
                                    <ShoppingBag size={120} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xl font-bold text-white mb-3">Tu Tienda Digital</h3>
                                    <p className="text-sm text-white/70 mb-8 max-w-[300px] leading-relaxed">
                                        Configura tus packs exclusivos, videollamadas y servicios personalizados para tus fans.
                                    </p>
                                    <Link to="/shop-manager" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-all active:scale-95 shadow-2xl">
                                        <Sparkles size={20} /> Editar Servicios
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Promotions SFS */}
                        <div className="mb-8">
                            <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/10 border border-pink-500/20 rounded-[32px] p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-all duration-700">
                                    <Sparkles size={120} className="text-pink-500" />
                                </div>
                                <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                            SFS & Promociones <span className="text-[10px] bg-pink-500 text-white px-2 py-0.5 rounded-full font-black uppercase">Nuevo</span>
                                        </h3>
                                        <p className="text-sm text-white/70 max-w-[300px] leading-relaxed">
                                            Intercambia publicidad con otras modelos, aumenta tus vistas y gana reputación en el ecosistema.
                                        </p>
                                    </div>
                                    <Link to="/promotions" className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold rounded-2xl hover:scale-105 transition-all active:scale-95 shadow-[0_10px_20px_rgba(236,72,153,0.3)] text-center whitespace-nowrap">
                                        Ir al Catálogo SFS
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Security */}
                        <div className="bg-card/40 border border-white/5 rounded-[32px] p-8 mb-8">
                            <h3 className="font-bold text-amber-400 flex items-center gap-3 mb-6">
                                <div className="p-2 bg-amber-500/10 rounded-xl"><AlertTriangle size={20} /></div>
                                Seguridad y Disputas
                            </h3>
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-foreground">Casos Pendientes (0)</span>
                                    <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-1 rounded-full font-bold">Todo en orden</span>
                                </div>
                                <p className="text-xs text-muted-foreground/60">No tienes disputas activas.</p>
                            </div>
                        </div>

                        {/* Blacklist */}
                        <div className="bg-card/40 border border-white/5 rounded-[32px] p-8">
                            <h3 className="font-bold text-red-400 flex items-center gap-3 mb-6">
                                <div className="p-2 bg-red-500/10 rounded-xl"><ShieldAlert size={20} /></div>
                                Usuarios Restringidos
                            </h3>
                            <div className="overflow-hidden rounded-2xl border border-white/5">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 text-[10px] uppercase text-muted-foreground font-bold tracking-widest leading-none">
                                        <tr>
                                            <th className="px-5 py-4">Usuario</th>
                                            <th className="px-5 py-4">Motivo</th>
                                            <th className="px-5 py-4 text-right">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {[{ name: '@stalker_joe', reason: 'Acoso', status: 'Baneado' }].map((item, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-5 py-4 font-bold text-foreground text-xs">{item.name}</td>
                                                <td className="px-5 py-4 text-muted-foreground text-xs opacity-60">{item.reason}</td>
                                                <td className="px-5 py-4 text-right">
                                                    <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/20">
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bot' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20">
                        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                            <Sparkles size={24} style={{ color: themeColor }} /> Entrenamiento de tu Bot
                        </h2>

                        <div className="flex flex-col gap-5">
                            <div className="bg-card/40 border border-white/5 rounded-3xl p-6">
                                <label className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                                    <DollarSign size={16} /> Lista de Precios y Servicios
                                </label>
                                <textarea
                                    name="prices"
                                    value={config.prices}
                                    onChange={handleInputChange}
                                    rows={4}
                                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:border-white/30 transition-all resize-none"
                                    placeholder="Ej: Chat caliente: $10..."
                                />
                            </div>

                            <div className="bg-card/40 border border-white/5 rounded-3xl p-6">
                                <label className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                                    <FileText size={16} /> Personalidad (Tu Prompt)
                                </label>
                                <textarea
                                    name="personality"
                                    value={config.personality}
                                    onChange={handleInputChange}
                                    rows={5}
                                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:border-white/30 transition-all resize-none"
                                    placeholder="Ej: Eres amable pero coqueta..."
                                />
                            </div>

                            <div className="bg-card/40 border border-white/5 rounded-3xl p-6">
                                <label className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                                    <Tag size={16} /> Tus Atributos (Tags)
                                </label>
                                <div className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 min-h-[60px] flex flex-wrap gap-2 focus-within:border-white/30 transition-all mb-4">
                                    {tags.map((tag, index) => (
                                        <div key={index} className="bg-white/10 border border-white/10 rounded-full px-3 py-1 text-xs font-bold text-white flex items-center gap-2 animate-in zoom-in duration-200">
                                            <span>{tag}</span>
                                            <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        className="bg-transparent text-sm text-foreground focus:outline-none flex-1 min-w-[120px]"
                                        placeholder={tags.length === 0 ? "Ojos verdes, Piel canela..." : ""}
                                    />
                                </div>
                            </div>

                            <div className="bg-card/40 border border-white/5 rounded-3xl p-6">
                                <label className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                                    <Wallet size={16} /> Métodos de Pago
                                </label>
                                <input
                                    type="text"
                                    name="paymentMethods"
                                    value={config.paymentMethods}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:border-white/30 transition-all"
                                    placeholder="Binance, PayPal..."
                                />
                            </div>

                            <button
                                onClick={handleSaveBotConfig}
                                disabled={saving}
                                className="w-full py-5 rounded-3xl font-bold text-white shadow-2xl mt-4 flex items-center justify-center gap-3 transition-all active:scale-95 hover:brightness-110 disabled:opacity-50"
                                style={{ backgroundColor: themeColor, boxShadow: `0 15px 40px -10px ${themeColor}80` }}
                            >
                                {saving ? <Loader className="animate-spin" /> : <Save size={20} />}
                                {saving ? 'Guardando...' : 'Guardar Entrenamiento'}
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'wallet' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20">
                        <WalletPanel />
                    </div>
                )}
            </div>
        </div>
    );
}
