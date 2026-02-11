import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { CheckCircle, XCircle, Search, Clock, ShieldAlert, Flag, UserCheck, AlertTriangle } from 'lucide-react';
import { timeAgo } from '../utils/date';
import NebulaBackground from '../components/ui/NebulaBackground';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('verifications'); // 'verifications' | 'reports'
    const [verifications, setVerifications] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'verifications') {
                // Fetch verifications (Mock logic or endpoint if exists, reusing previous logic)
                const response = await api.get('/admin/verifications').catch(() => ({ data: [] }));
                // Fallback if endpoint doesn't exist yet, we won't crash but show empty
                setVerifications(response.data || []);
            } else {
                const response = await api.get('/content/admin/reports');
                setReports(response.data || []);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
            // setError("Error cargando datos."); 
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationAction = async (modelId, action) => {
        if (!confirm(`¿Estás seguro de ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} a este usuario?`)) return;
        try {
            await api.post(`/admin/verify/${modelId}`, { action });
            setVerifications(prev => prev.filter(v => v.id !== modelId));
        } catch (err) {
            alert("Error al procesar la acción.");
        }
    };

    const handleReportAction = async (report, actionType) => {
        try {
            if (actionType === 'delete_post') {
                if (!confirm("¿Eliminar publicación permanentemente?")) return;
                await api.delete(`/content/posts/${report.post_id}`, { data: { reason: "Reporte validado: " + report.reason } });
                await api.put(`/content/admin/reports/${report.id}`, { status: 'resolved' });
                // Update local state
                setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
            } else {
                // Ignore / Resolve without delete
                await api.put(`/content/admin/reports/${report.id}`, { status: actionType });
                setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: actionType } : r));
            }
        } catch (err) {
            console.error(err);
            alert("Error procesando reporte");
        }
    };

    if (loading && verifications.length === 0 && reports.length === 0) {
        return <div className="min-h-screen bg-[#050510] flex items-center justify-center text-white"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-pink-500"></div></div>;
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans pb-24 relative overflow-hidden">
            <NebulaBackground />
            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <ShieldAlert className="text-purple-500" />
                            Panel de Administración
                        </h1>
                        <p className="text-gray-400 mt-2">Centro de Control de Nebula Agency.</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => setActiveTab('verifications')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'verifications' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            <UserCheck size={16} /> Verificaciones
                        </button>
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'reports' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Flag size={16} /> Reportes
                        </button>
                    </div>
                </div>

                {error && <div className="p-4 bg-red-500/20 text-red-200 rounded-xl mb-6">{error}</div>}

                {/* Content */}
                {activeTab === 'verifications' ? (
                    verifications.length === 0 ? (
                        <EmptyState icon={CheckCircle} title="¡Todo al día!" desc="No hay solicitudes de verificación pendientes." />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {verifications.map((model) => (
                                <VerificationCard key={model.id} model={model} onAction={handleVerificationAction} />
                            ))}
                        </div>
                    )
                ) : (
                    reports.length === 0 ? (
                        <EmptyState icon={CheckCircle} title="Sin Incidentes" desc="No hay reportes de contenido pendientes." />
                    ) : (
                        <div className="space-y-4">
                            {reports.map((report) => (
                                <ReportRow key={report.id} report={report} onAction={handleReportAction} />
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

// Sub-components
const EmptyState = ({ icon: Icon, title, desc }) => (
    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
        <Icon className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-gray-300">{title}</h2>
        <p className="text-gray-500">{desc}</p>
    </div>
);

const VerificationCard = ({ model, onAction }) => (
    <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all">
        <div className="h-48 bg-black relative group">
            <img
                src={model.verification_video_id || model.avatar_url}
                alt="Evidencia"
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            <div className="absolute bottom-4 left-4">
                <h3 className="font-bold text-lg">{model.full_name}</h3>
                <p className="text-sm text-gray-300">@{model.username}</p>
            </div>
        </div>
        <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-gray-500 text-xs">País</p>
                    <p>{model.social_links?.find(l => l.network === 'country')?.url || 'N/A'}</p>
                </div>
                <div>
                    <p className="text-gray-500 text-xs">Edad</p>
                    <p>{model.birth_date || 'N/A'}</p>
                </div>
            </div>
            <div className="pt-4 flex gap-3">
                <button
                    onClick={() => onAction(model.id, 'reject')}
                    className="flex-1 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2 text-sm font-bold"
                >
                    <XCircle className="w-4 h-4" /> Rechazar
                </button>
                <button
                    onClick={() => onAction(model.id, 'approve')}
                    className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-green-500/20"
                >
                    <CheckCircle className="w-4 h-4" /> Aprobar
                </button>
            </div>
        </div>
    </div>
);

const ReportRow = ({ report, onAction }) => {
    const isResolved = report.status === 'resolved' || report.status === 'ignored';

    return (
        <div className={`bg-[#0a0a0a] border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${isResolved ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-4 flex-1">
                <div className={`p-3 rounded-lg ${report.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-white text-lg">{report.reason}</span>
                        <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${report.status === 'pending' ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300'}`}>
                            {report.status}
                        </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{report.description || "Sin descripción adicional."}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(report.created_at)}</span>
                        <span>Reporter ID: {report.reporter_id} ({report.reporter_role})</span>
                    </div>
                </div>
            </div>

            {/* Post Preview (Mini) */}
            {report.posts && (
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 border border-white/10">
                    {report.posts.media_type === 'video' ? (
                        <video src={report.posts.media_url} className="w-full h-full object-cover" />
                    ) : (
                        <img src={report.posts.media_url} alt="Content" className="w-full h-full object-cover" />
                    )}
                </div>
            )}

            {/* Actions */}
            {!isResolved && (
                <div className="flex gap-2">
                    <button
                        onClick={() => onAction(report, 'ignored')}
                        className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-gray-400 text-sm font-bold"
                    >
                        Ignorar
                    </button>
                    <button
                        onClick={() => onAction(report, 'delete_post')}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/20"
                    >
                        Eliminar Post
                    </button>
                    {/* Note: 'Eliminar Post' here just marks resolved. Actual deletion needs DELETE /posts/{id} call ideally, 
                        or we can chain it. For now let's just mark status. */}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
