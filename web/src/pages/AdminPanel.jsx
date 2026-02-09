import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Users, DollarSign, CreditCard, TrendingUp, ArrowLeft, Save, Sparkles, Tag, Wallet, FileText, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminPanel() {
    const { themeColor } = useTheme();

    // Mock Data for Charts
    const exposureData = [40, 65, 50, 80, 75, 95, 120];
    const maxVal = Math.max(...exposureData);
    const chartPoints = exposureData.map((val, i) => {
        const x = (i / (exposureData.length - 1)) * 100;
        const y = 100 - (val / 150) * 100; // Scale to 150 max visual
        return `${x},${y}`;
    }).join(' ');

    const lastX = 100;
    const lastY = 100 - (exposureData[exposureData.length - 1] / 150) * 100;
    const areaPath = `0,100 ${chartPoints} 100,100`;

    // Form State
    const [config, setConfig] = useState({
        prices: "5 fotos x $10 | 10 fotos x $18 | Video personalizado $50",
        personality: "Soy una chica dulce pero atrevida, me gusta conversar y que me consientan...",
        physicalAspects: "Rubia, Ojos Azules, 1.70m, Athletic",
        paymentMethods: "Binance, PayPal, Transferencia"
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="min-h-screen pb-20 pt-4 px-4 font-sans">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link to="/profile" className="p-2 rounded-full bg-card/50 border border-white/5 text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Panel de Control
                </h1>
            </div>

            {/* Welcome */}
            <div className="mb-6">
                <p className="text-muted-foreground">Hola, <span className="text-foreground font-semibold">Valentina</span> 👋</p>
                <p className="text-xs text-muted-foreground/60">Aquí tienes el resumen de tu rendimiento esta semana.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 mb-8">
                {/* Visitors */}
                <div className="bg-card/40 border border-white/5 rounded-2xl p-4 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Users size={40} />
                    </div>
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Visitantes</span>
                    <span className="text-2xl font-bold text-foreground">1.2k</span>
                    <span className="text-xs text-green-400 flex items-center gap-1 mt-1">
                        <TrendingUp size={10} /> +12%
                    </span>
                </div>

                {/* Sales */}
                <div className="bg-card/40 border border-white/5 rounded-2xl p-4 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <DollarSign size={40} />
                    </div>
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Ventas</span>
                    <span className="text-2xl font-bold text-foreground">$850</span>
                    <span className="text-xs text-green-400 flex items-center gap-1 mt-1">
                        <TrendingUp size={10} /> +5%
                    </span>
                </div>

                {/* Credits */}
                <div className="bg-card/40 border border-white/5 rounded-2xl p-4 flex flex-col relative overflow-hidden col-span-2">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Créditos Disponibles</span>
                            <span className="text-3xl font-bold text-foreground" style={{ color: themeColor }}>2,450</span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-full border border-white/5">
                            <CreditCard size={24} style={{ color: themeColor }} />
                        </div>
                    </div>
                    <button className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-foreground transition-colors border border-white/5">
                        Comprar Más
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
                        <option>Este mes</option>
                    </select>
                </div>

                <div className="h-40 w-full relative">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={themeColor} stopOpacity="0.5" />
                                <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {/* Area */}
                        <path
                            d={`M0,100 ${chartPoints} L100,100 Z`}
                            fill="url(#chartGradient)"
                            className="transition-all duration-500"
                        />
                        {/* Line */}
                        <polyline
                            points={chartPoints}
                            fill="none"
                            stroke={themeColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-500"
                        />
                    </svg>

                    {/* Tooltip Overlay (simplified visual) */}
                    <div className="absolute top-0 right-10 flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] mb-1"></div>
                        <div className="bg-popover border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-foreground shadow-lg">
                            120 visitas
                        </div>
                    </div>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                    ¡Tu perfil está creciendo! Tienes un <span className="text-green-400 font-bold">12% más</span> de visitas que la semana pasada. Sigue publicando historias. 🔥
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
                        className="w-full py-4 rounded-2xl font-bold text-white shadow-lg mt-2 flex items-center justify-center gap-2 transition-transform active:scale-95"
                        style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -10px ${themeColor}60` }}
                    >
                        <Save size={18} /> Guardar Cambios
                    </button>

                </div>
            </div>

        </div>
    );
}
