import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { CheckCircle, XCircle, Clock, ShieldAlert, Flag, UserCheck, AlertTriangle, Star, BarChart2, Users, ShieldCheck, Megaphone, ChevronRight } from 'lucide-react';
import { timeAgo } from '../utils/date';
import NebulaBackground from '../components/ui/NebulaBackground';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('verifications');
    const [verifications, setVerifications] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => { fetchData(); }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'verifications') {
                const response = await api.get('/admin/verifications').catch(() => ({ data: [] }));
                setVerifications(response.data || []);
            } else if (activeTab === 'reports') {
                const response = await api.get('/content/admin/reports');
                setReports(response.data || []);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationAction = async (modelId, action) => {
        if (!confirm(`¿Estás seguro de ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} a este usuario?`)) return;
        try {
            await api.post(`/admin/verify/${modelId}`, { action });
            setVerifications(prev => prev.filter(v => v.id !== modelId));
            showToast(`Usuario ${action === 'approve' ? 'aprobado' : 'rechazado'}`, "success");
        } catch (err) {
            showToast("Error al procesar la acción.", "error");
        }
    };

    const handleReportAction = async (report, actionType) => {
        try {
            if (actionType === 'delete_post') {
                if (!confirm("¿Eliminar publicación permanentemente?")) return;
                await api.delete(`/content/posts/${report.post_id}`, { data: { reason: "Reporte validado: " + report.reason } });
            }
            await api.put(`/content/admin/reports/${report.id}`, { status: actionType === 'delete_post' ? 'resolved' : actionType });
            setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: actionType === 'delete_post' ? 'resolved' : actionType } : r));
        } catch (err) {
            showToast("Error procesando reporte", "error");
        }
    };

    if (loading && verifications.length === 0 && reports.length === 0) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-pink-500"></div></div>;
    }

    return (
        <div className="min-h-screen text-foreground p-6 md:p-12 font-sans pb-24 relative overflow-hidden">
            <NebulaBackground />
            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <ShieldAlert className="text-purple-500" />
                            Panel de Administración
                        </h1>
                        <p className="text-muted-foreground mt-2">Centro de Control de Nebula Agency.</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 flex-wrap gap-1">
                        <TabBtn id="verifications" label="Verificaciones" icon={UserCheck} active={activeTab} onClick={setActiveTab} color="purple" />
                        <TabBtn id="reports" label="Reportes" icon={Flag} active={activeTab} onClick={setActiveTab} color="red" />
                        <TabBtn id="promo" label="SFS & Promo" icon={Megaphone} active={activeTab} onClick={setActiveTab} color="pink" />
                    </div>
                </div>

                {/* Content */}
                {activeTab === 'verifications' && (
                    verifications.length === 0
                        ? <EmptyState icon={CheckCircle} title="¡Todo al día!" desc="No hay solicitudes de verificación pendientes." />
                        : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {verifications.map(model => <VerificationCard key={model.id} model={model} onAction={handleVerificationAction} />)}
                        </div>
                )}

                {activeTab === 'reports' && (
                    reports.length === 0
                        ? <EmptyState icon={CheckCircle} title="Sin Incidentes" desc="No hay reportes de contenido pendientes." />
                        : <div className="space-y-4">
                            {reports.map(report => <ReportRow key={report.id} report={report} onAction={handleReportAction} />)}
                        </div>
                )}

                {activeTab === 'promo' && <PromoAdminSection />}
            </div>
        </div>
    );
};

// ---- NUEVO: Sección SFS inline ----
const PromoAdminSection = () => {
    const { showToast } = useToast();
    const [pendingChannels, setPendingChannels] = useState([]);
    const [loadingChannels, setLoadingChannels] = useState(true);
    const [fraudCampaigns, setFraudCampaigns] = useState([]);

    useEffect(() => {
        // Mock data mientras conectamos al API real
        setPendingChannels([
            { id: 'c1', name: 'Canal VIP de Maria', followers: 12000, telegram_chat_id: '-100123456', model_username: '@mariavip', created_at: new Date().toISOString() },
            { id: 'c2', name: 'Secretos de Luna (Privado)', followers: 5400, telegram_chat_id: '-100789012', model_username: '@lunasecrets', created_at: new Date().toISOString() },
        ]);
        setFraudCampaigns([
            { id: 'f1', requester: '@mariavip', target: '@lunasecrets', reason: 'Post borrado antes de alcanzar 5,000 vistas' }
        ]);
        setLoadingChannels(false);
    }, []);

    const handleChannelAction = async (channelId, action) => {
        // TODO: Conectar a /api/admin/promo/channels/{id}/approve|reject
        setPendingChannels(prev => prev.filter(c => c.id !== channelId));
        showToast(`Canal ${action === 'approve' ? 'aprobado' : 'rechazado'}`, action === 'approve' ? 'success' : 'error');
    };

    return (
        <div className="space-y-10">
            {/* Canales Pendientes */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-pink-400" /> Canales Pendientes de Aprobación
                    <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full">{pendingChannels.length}</span>
                </h2>
                {loadingChannels ? (
                    <div className="text-muted-foreground text-sm">Cargando...</div>
                ) : pendingChannels.length === 0 ? (
                    <EmptyState icon={CheckCircle} title="Sin pendientes" desc="No hay canales esperando aprobación." />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingChannels.map(ch => (
                            <div key={ch.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-foreground">{ch.name}</h3>
                                        <p className="text-xs text-muted-foreground">Solicitado por {ch.model_username}</p>
                                    </div>
                                    <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">Pendiente</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full flex items-center gap-1">
                                        <Users className="w-3 h-3" /> {ch.followers.toLocaleString()} subs
                                    </span>
                                    <span className="text-muted-foreground font-mono">{ch.telegram_chat_id}</span>
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button onClick={() => handleChannelAction(ch.id, 'reject')} className="flex-1 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold flex items-center justify-center gap-1">
                                        <XCircle className="w-3.5 h-3.5" /> Rechazar
                                    </button>
                                    <button onClick={() => handleChannelAction(ch.id, 'approve')} className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-lg shadow-green-500/20">
                                        <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Denuncias de Fraude */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" /> Denuncias de Fraude SFS
                </h2>
                {fraudCampaigns.length === 0 ? (
                    <EmptyState icon={CheckCircle} title="Sin Fraudes" desc="No hay campañas reportadas como fraudulentas." />
                ) : (
                    <div className="space-y-3">
                        {fraudCampaigns.map(f => (
                            <div key={f.id} className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-foreground">{f.requester} ↔ {f.target}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{f.reason}</p>
                                </div>
                                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">Fraude</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ---- Sub-components ----
const TabBtn = ({ id, label, icon: Icon, active, onClick, color }) => {
    const colors = { purple: 'bg-purple-600', red: 'bg-red-600', pink: 'bg-pink-600' };
    return (
        <button
            onClick={() => onClick(id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${active === id ? `${colors[color]} text-white shadow-lg` : 'text-muted-foreground hover:text-foreground'}`}
        >
            <Icon size={14} /> {label}
        </button>
    );
};

const EmptyState = ({ icon: Icon, title, desc }) => (
    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
        <Icon className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-muted-foreground">{title}</h2>
        <p className="text-muted-foreground/60 text-sm">{desc}</p>
    </div>
);

const VerificationCard = ({ model, onAction }) => (
    <div className="bg-card/40 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all">
        <div className="h-48 bg-black relative group">
            <img src={model.verification_video_id || model.avatar_url} alt="Evidencia" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4">
                <h3 className="font-bold text-lg text-foreground">{model.full_name}</h3>
                <p className="text-sm text-muted-foreground">@{model.username}</p>
            </div>
        </div>
        <div className="p-5 space-y-3">
            <div className="flex gap-2">
                <button onClick={() => onAction(model.id, 'reject')} className="flex-1 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-1 text-sm font-bold">
                    <XCircle className="w-4 h-4" /> Rechazar
                </button>
                <button onClick={() => onAction(model.id, 'approve')} className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white flex items-center justify-center gap-1 text-sm font-bold">
                    <CheckCircle className="w-4 h-4" /> Aprobar
                </button>
            </div>
        </div>
    </div>
);

const ReportRow = ({ report, onAction }) => {
    const isResolved = report.status === 'resolved' || report.status === 'ignored';
    return (
        <div className={`bg-card/40 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${isResolved ? 'opacity-40' : ''}`}>
            <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-lg ${report.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                    <AlertTriangle size={18} />
                </div>
                <div>
                    <p className="font-bold text-foreground">{report.reason}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{report.description || "Sin descripción."}</p>
                    <p className="text-xs text-muted-foreground/40 mt-1 flex items-center gap-1"><Clock size={10} /> {timeAgo(report.created_at)}</p>
                </div>
            </div>
            {!isResolved && (
                <div className="flex gap-2 shrink-0">
                    <button onClick={() => onAction(report, 'ignored')} className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-muted-foreground text-xs font-bold">Ignorar</button>
                    <button onClick={() => onAction(report, 'delete_post')} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold">Eliminar Post</button>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
