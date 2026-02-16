import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Users, DollarSign, CreditCard, TrendingUp, ArrowLeft, Save, Sparkles, Tag, Wallet, FileText, ShieldAlert, AlertTriangle, ShieldCheck, ShoppingBag, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function AdminPanel() {
    const { themeColor } = useTheme();
    const [stats, setStats] = useState({ visitors: 0, sales_count: 0, revenue: 0, credits: 0, conversion_rate: 0 });
    const [exposure, setExposure] = useState([0, 0, 0, 0, 0, 0, 0]);
    const [activeTab, setActiveTab] = useState('analytics'); // analytics, bot, shop

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
                    setConfig({
                        prices: profileRes.data.prices || "",
                        personality: profileRes.data.personality || "",
                        physicalAspects: profileRes.data.physical_aspects || "",
                        paymentMethods: profileRes.data.payment_methods || ""
                    });
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

    const handleSaveBotConfig = async () => {
        try {
            // Update profile with bot config fields
            await api.put('/profile/me', {
                prices: config.prices,
                personality: config.personality,
                physical_aspects: config.physicalAspects,
                payment_methods: config.paymentMethods
            });
            alert("Configuración guardada correctamente");
        } catch (err) {
            alert("Error al guardar la configuración");
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
                        <div className="bg-card/40 border border-white/5 rounded-3xl p-5 mb-8 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-foreground flex items-center gap-2">
                                    <TrendingUp size={16} className="text-blue-400" /> Exposición
                                </h3>
                                <select className="bg-black/20 border border-white/10 rounded-lg text-[10px] px-2 py-1 text-muted-foreground outline-none">
                                    <option>Últimos 7 días</option>
                                </select>
                            </div>

                            <div className="h-40 w-full relative">
                                {(() => {
                                    const maxVal = Math.max(...exposure, 10);
                                    const points = exposure.map((val, i) => {
                                        const x = (i / (exposure.length - 1)) * 100;
                                        const y = 100 - (val / maxVal) * 100;
                                        return `${x},${y}`;
                                    }).join(' ');

                                    return (
                                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                            <defs>
                                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={themeColor} stopOpacity="0.5" />
                                                    <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <path
                                                d={`M0,100 ${points} L100,100 Z`}
                                                fill="url(#chartGradient)"
                                                className="transition-all duration-500"
                                            />
                                            <polyline
                                                points={points}
                                                fill="none"
                                                stroke={themeColor}
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="transition-all duration-500"
                                            />
                                        </svg>
                                    );
                                })()}

                                {/* Tooltip Overlay */}
                                <div className="absolute top-0 right-10 flex flex-col items-center">
                                    <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] mb-1"></div>
                                    <div className="bg-popover border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-foreground shadow-lg">
                                        {exposure[exposure.length - 1]} visitas hoy
                                    </div>
                                </div>
                            </div>
                            <p className="text-center text-xs text-muted-foreground mt-2">
                                Estadísticas basadas en visitas únicas a tu perfil durante la última semana.
                            </p>
                        </div>

                        {/* DISPUTES SECTION (ACTIVE) */}
                        <div className="bg-card/40 border border-white/5 rounded-2xl p-5 mb-8">
                            <h3 className="font-bold text-amber-400 flex items-center gap-2 mb-4">
                                <div className="p-1 bg-amber-500/10 rounded-md"><AlertTriangle size={16} /></div>
                                Disputas en Curso
                            </h3>
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-foreground">Orden #ORDER-123</span>
                                    <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">Revisión Admin</span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">Cliente: <span className="text-foreground">Anon_99</span> reportó "No entregó video".</p>
                                <button className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
                                    <ShieldCheck size={14} /> Subir Evidencia de Entrega
                                </button>
                            </div>
                        </div>

                        {/* BLACKLIST SECTION (READ ONLY) */}
                        <div className="bg-card/40 border border-white/5 rounded-2xl p-5 mb-8">
                            <h3 className="font-bold text-red-400 flex items-center gap-2 mb-4">
                                <div className="p-1 bg-red-500/10 rounded-md"><ShieldAlert size={16} /></div>
                                Lista Negra de Clientes
                            </h3>
                            <div className="overflow-hidden rounded-xl border border-white/5">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 text-xs uppercase text-muted-foreground font-semibold">
                                        <tr>
                                            <th className="px-4 py-3">Usuario</th>
                                            <th className="px-4 py-3">Razón</th>
                                            <th className="px-4 py-3 text-right">Gravedad</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {[
                                            { name: '@stalker_joe', reason: 'Acoso persistente', severity: 'high' },
                                            { name: '@fake_payment_guy', reason: 'Estafas', severity: 'medium' },
                                        ].map((item, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs">{item.reason}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${item.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                                        }`}>
                                                        {item.severity === 'high' ? 'Alta' : 'Media'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 opacity-60">
                                * Si detectas a uno de estos usuarios, bloquéalo inmediatamente.
                            </p>
                        </div>

                        {/* SHOP MANAGEMENT SECTION */}
                        <div className="mb-10">
                            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                                <ShoppingBag size={20} style={{ color: themeColor }} /> Servicios y Tienda
                            </h2>
                            <div className="bg-gradient-to-br from-primary/20 to-purple-500/10 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <ShoppingBag size={80} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-lg font-bold text-white mb-2">Tu Mostrador Digital</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
                                        Configura tus packs, videollamadas y servicios personalizados con pagos seguros.
                                    </p>
                                    <Link
                                        to="/shop-manager"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95 shadow-xl"
                                    >
                                        <Sparkles size={18} /> Gestionar Tienda
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* BOT CONFIGURATION SECTION */}
                        <div className="mb-20">
                            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                                <Sparkles size={20} style={{ color: themeColor }} /> Configuración del Bot
                            </h2>

                            <div className="flex flex-col gap-4">

                                {/* Prices */}
                                <div className="bg-card/40 border border-white/5 rounded-2xl p-5">
                                    <label className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                        <DollarSign size={14} /> Lista de Precios
                                    </label>
                                    <textarea
                                        name="prices"
                                        value={config.prices}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-white/30 transition-colors resize-none"
                                        placeholder="Ej: Pack 5 fotos - $10..."
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-2 opacity-60">Describe tus menús y precios claramente.</p>
                                </div>

                                {/* Personality */}
                                <div className="bg-card/40 border border-white/5 rounded-2xl p-5">
                                    <label className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                        <FileText size={14} /> Personalidad (Prompt)
                                    </label>
                                    <textarea
                                        name="personality"
                                        value={config.personality}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-white/30 transition-colors resize-none"
                                        placeholder="Describe cómo debe comportarse tu IA..."
                                    />
                                </div>

                                {/* Physical Aspects (Tags) */}
                                <div className="bg-card/40 border border-white/5 rounded-2xl p-5">
                                    <label className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                        <Tag size={14} /> Aspectos Físicos (Tags)
                                    </label>
                                    <input
                                        type="text"
                                        name="physicalAspects"
                                        value={config.physicalAspects}
                                        onChange={handleInputChange}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-white/30 transition-colors mb-3"
                                        placeholder="Rubia, Alta, Ojos Azules..."
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {config.physicalAspects.split(',').filter(t => t.trim() !== '').map((tag, i) => (
                                            <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-secondary/50 text-secondary-foreground border border-white/5">
                                                #{tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment Methods */}
                                <div className="bg-card/40 border border-white/5 rounded-2xl p-5">
                                    <label className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                        <Wallet size={14} /> Métodos de Pago
                                    </label>
                                    <input
                                        type="text"
                                        name="paymentMethods"
                                        value={config.paymentMethods}
                                        onChange={handleInputChange}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-white/30 transition-colors"
                                        placeholder="Binance, PayPal..."
                                    />
                                </div>

                                <button
                                    onClick={handleSaveBotConfig}
                                    className="w-full py-4 rounded-2xl font-bold text-white shadow-lg mt-2 flex items-center justify-center gap-2 transition-transform active:scale-95 hover:brightness-110"
                                    style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -10px ${themeColor}60` }}
                                >
                                    <Save size={18} /> Guardar Cambios en el Bot
                                </button>

                            </div>
                        </div>
                    </div>
            </div>
            );
}
