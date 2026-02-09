import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
    LayoutDashboard, Users, DollarSign, CreditCard, TrendingUp,
    ShieldAlert, Search, MoreVertical, CheckCircle, XCircle,
    UserX, Plus, Trash2, Edit2, AlertTriangle, Scale, Check, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/ui/Avatar';

export default function SuperAdminDashboard() {
    const { themeColor } = useTheme();
    const [activeTab, setActiveTab] = useState('overview'); // overview, models, blacklist, disputes

    // --- MOCK DATA ---
    const kpiData = [
        { title: 'Ingresos Totales', value: '$45,230', change: '+20%', icon: <DollarSign size={24} className="text-green-400" /> },
        { title: 'Modelos Activas', value: '124', change: '+5', icon: <Users size={24} className="text-blue-400" /> },
        { title: 'Disputas Activas', value: '3', change: 'Urgen', icon: <Scale size={24} className="text-red-400" /> },
        { title: 'Créditos Circulantes', value: '1.2M', change: '-2%', icon: <CreditCard size={24} className="text-purple-400" /> },
    ];

    const modelsData = [
        { id: 1, name: 'Valentina Rose', username: '@valerose', status: 'verified', credits: 2450, earned: '$850', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' },
        { id: 2, name: 'Sarah Miller', username: '@sarahm', status: 'pending', credits: 0, earned: '$0', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb' },
        { id: 3, name: 'Jessica Jones', username: '@jessy', status: 'verified', credits: 12000, earned: '$3,200', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9' },
        { id: 4, name: 'Emily Blunt', username: '@emilyb', status: 'banned', credits: 50, earned: '$120', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1' },
    ];

    const [blacklist, setBlacklist] = useState([
        { id: 1, name: '@stalker_joe', reason: 'Acoso persistente y amenazas', date: '2023-10-24', severity: 'high' },
        { id: 2, name: '@fake_payment_guy', reason: 'Intentos de estafa con comprobantes falsos', date: '2023-11-02', severity: 'medium' },
        { id: 3, name: '@leaker_bot', reason: 'Difusión de contenido privado', date: '2023-11-15', severity: 'high' },
    ]);

    const disputesData = [
        { id: 'ORD-123', client: 'Anon_99', model: 'Sarah Miller', amount: '$50.00', reason: 'No entregó video', date: 'Hace 2h', status: 'open' },
        { id: 'ORD-125', client: 'User_X', model: 'Jessica Jones', amount: '$20.00', reason: 'Video incorrecto', date: 'Hace 5h', status: 'open' },
    ];

    // --- CHART DATA ---
    const salesData = [30, 45, 35, 60, 55, 80, 75, 90, 110, 100, 130];
    const chartPoints = salesData.map((val, i) => {
        const x = (i / (salesData.length - 1)) * 100;
        const y = 100 - (val / 150) * 100;
        return `${x},${y}`;
    }).join(' ');

    // --- HANDLERS ---
    const handleDeleteBlacklist = (id) => {
        setBlacklist(blacklist.filter(item => item.id !== id));
    };

    return (
        <div className="min-h-screen pb-20 pt-6 px-6 font-sans bg-background text-foreground">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Super Admin
                    </h1>
                    <p className="text-muted-foreground text-sm">Panel de control global de la plataforma.</p>
                </div>
                <div className="flex bg-card/50 p-1 rounded-xl border border-white/5 overflow-x-auto max-w-full">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${activeTab === 'overview' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                    >
                        Resumen
                    </button>
                    <button
                        onClick={() => setActiveTab('models')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${activeTab === 'models' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                    >
                        Modelos
                    </button>
                    <button
                        onClick={() => setActiveTab('blacklist')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${activeTab === 'blacklist' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                    >
                        Lista Negra
                    </button>
                    <button
                        onClick={() => setActiveTab('disputes')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${activeTab === 'disputes' ? 'bg-red-500/20 text-red-200 border border-red-500/20' : 'text-muted-foreground hover:text-white'}`}
                    >
                        <Scale size={14} /> Disputas (2)
                    </button>
                </div>
            </div>

            {/* OVERVIEW CONTENT */}
            {activeTab === 'overview' && (
                <div className="animate-in fade-in zoom-in duration-300">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {kpiData.map((kpi, idx) => (
                            <div key={idx} className="bg-card/40 border border-white/5 rounded-2xl p-5 flex items-start justify-between relative overflow-hidden group hover:border-white/10 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
                                    {kpi.icon}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{kpi.title}</p>
                                    <h3 className="text-2xl font-bold text-foreground mb-1">{kpi.value}</h3>
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${kpi.change.includes('+') ? 'bg-green-500/20 text-green-400' : kpi.change.includes('-') ? 'bg-red-500/20 text-red-400' : kpi.change === 'Urgen' ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {kpi.change}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chart Section */}
                    <div className="bg-card/40 border border-white/5 rounded-3xl p-6 mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-400" /> Rendimiento Global
                            </h3>
                            <select className="bg-black/20 border border-white/10 rounded-lg text-xs px-3 py-1.5 text-muted-foreground outline-none">
                                <option>Últimos 30 días</option>
                                <option>Este año</option>
                            </select>
                        </div>
                        <div className="h-64 w-full relative">
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                <defs>
                                    <linearGradient id="adminChartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={themeColor} stopOpacity="0.5" />
                                        <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d={`M0,100 ${chartPoints} L100,100 Z`} fill="url(#adminChartGradient)" className="transition-all duration-500" />
                                <polyline points={chartPoints} fill="none" stroke={themeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-500" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {/* MODELS MANAGEMENT */}
            {activeTab === 'models' && (
                <div className="bg-card/40 border border-white/5 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-5 border-b border-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-lg">Directorio de Modelos</h3>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar modelo..."
                                className="bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-white/30 w-64"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 text-xs uppercase text-muted-foreground font-semibold">
                                <tr>
                                    <th className="px-6 py-4 text-left">Modelo</th>
                                    <th className="px-6 py-4 text-left">Estado</th>
                                    <th className="px-6 py-4 text-left">Créditos</th>
                                    <th className="px-6 py-4 text-left">Ingresos</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {modelsData.map((model) => (
                                    <tr key={model.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <Avatar src={model.avatar} size="md" />
                                            <div>
                                                <div className="font-bold text-foreground">{model.name}</div>
                                                <div className="text-xs text-muted-foreground">{model.username}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${model.status === 'verified' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    model.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                {model.status === 'verified' ? 'Verificada' : model.status === 'pending' ? 'Pendiente' : 'Baneada'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono">{model.credits.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm font-mono text-green-400">{model.earned}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-foreground">
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* BLACKLIST MANAGEMENT */}
            {activeTab === 'blacklist' && (
                <div className="bg-card/40 border border-white/5 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-red-500/5">
                        <div>
                            <h3 className="font-bold text-lg text-red-200 flex items-center gap-2">
                                <UserX size={20} className="text-red-500" /> Lista Negra de Clientes
                            </h3>
                            <p className="text-xs text-red-200/60 mt-1">Gestión de usuarios vetados de la plataforma.</p>
                        </div>
                        <button
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all"
                        >
                            <Plus size={16} /> Agregar Cliente
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 text-xs uppercase text-muted-foreground font-semibold">
                                <tr>
                                    <th className="px-6 py-4 text-left">Usuario</th>
                                    <th className="px-6 py-4 text-left">Razón del Veto</th>
                                    <th className="px-6 py-4 text-left">Fecha</th>
                                    <th className="px-6 py-4 text-left">Severidad</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {blacklist.map((item) => (
                                    <tr key={item.id} className="hover:bg-red-500/5 transition-colors">
                                        <td className="px-6 py-4 font-bold text-foreground text-sm">{item.name}</td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">{item.reason}</td>
                                        <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{item.date}</td>
                                        <td className="px-6 py-4">
                                            <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md border ${item.severity === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                <AlertTriangle size={12} /> {item.severity === 'high' ? 'Alta' : 'Media'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 hover:bg-blue-500/10 rounded-lg text-muted-foreground hover:text-blue-400 transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBlacklist(item.id)}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {blacklist.length === 0 && (
                        <div className="p-10 text-center text-muted-foreground">
                            <ShieldAlert size={40} className="mx-auto mb-3 opacity-20" />
                            <p>No hay usuarios en la lista negra.</p>
                        </div>
                    )}
                </div>
            )}

            {/* DISPUTES MANAGEMENT (NEW) */}
            {activeTab === 'disputes' && (
                <div className="bg-card/40 border border-white/5 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-amber-500/5">
                        <div>
                            <h3 className="font-bold text-lg text-amber-200 flex items-center gap-2">
                                <Scale size={20} className="text-amber-500" /> Centro de Resolución
                            </h3>
                            <p className="text-xs text-amber-200/60 mt-1">Disputas activas que requieren tu intervención.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 text-xs uppercase text-muted-foreground font-semibold">
                                <tr>
                                    <th className="px-6 py-4 text-left">ID Orden</th>
                                    <th className="px-6 py-4 text-left">Partes</th>
                                    <th className="px-6 py-4 text-left">Monto</th>
                                    <th className="px-6 py-4 text-left">Problema</th>
                                    <th className="px-6 py-4 text-right">Resolución</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {disputesData.map((dispute) => (
                                    <tr key={dispute.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{dispute.id}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-red-400 font-semibold">{dispute.client}</span>
                                                <span className="text-muted-foreground text-[10px] mx-1">vs</span>
                                                <span className="text-green-400 font-semibold">{dispute.model}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-foreground">{dispute.amount}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{dispute.reason}</span>
                                                <span className="text-[10px] text-muted-foreground">{dispute.date}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold transition-colors flex items-center gap-1">
                                                    <Check size={12} /> Modelo Gana
                                                </button>
                                                <button className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors flex items-center gap-1">
                                                    <X size={12} /> Reembolsar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    );
}
