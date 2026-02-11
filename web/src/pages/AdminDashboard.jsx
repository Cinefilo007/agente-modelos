import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { CheckCircle, XCircle, Search, Clock, ShieldAlert } from 'lucide-react';

const AdminDashboard = () => {
    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchVerifications();
    }, []);

    const fetchVerifications = async () => {
        try {
            // We need an endpoint to list verifications.
            // Using a new endpoint logic or reusing existing explore with 'verifying' filter?
            // Let's assume we create/use GET /admin/verifications or similar.
            // For now, let's try to fetch models with status 'verifying' 
            // Since we don't have a dedicated endpoint yet in previous steps, 
            // I will implement fetching logic on frontend if specific endpoint is missing
            // But ideally we should have: GET /admin/verifications

            // Temporary: We might need to implement this endpoint in backend 'admin.py' first.
            // Assuming it exists for the sake of this file creation.
            const response = await api.get('/admin/verifications');
            setVerifications(response.data);
        } catch (err) {
            console.error("Error fetching verifications:", err);
            setError("No se pudieron cargar las verificaciones.");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (modelId, action) => {
        if (!confirm(`¿Estás seguro de ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} a este usuario?`)) return;

        try {
            // Reusing the logic from telegram callback but via API
            await api.post(`/admin/verify/${modelId}`, { action });

            // Remove from list locally
            setVerifications(prev => prev.filter(v => v.id !== modelId));
        } catch (err) {
            alert("Error al procesar la acción.");
        }
    };

    if (loading) return <div className="min-h-screen bg-[#050510] flex items-center justify-center text-white">Cargando...</div>;

    return (
        <div className="min-h-screen bg-[#050510] text-white p-6 md:p-12 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <ShieldAlert className="text-purple-500" />
                            Panel de Administración
                        </h1>
                        <p className="text-gray-400 mt-2">Gestión de solicitudes de verificación de creadores.</p>
                    </div>
                    <div className="bg-gray-900 px-4 py-2 rounded-xl border border-white/10 text-sm">
                        Pendientes: <span className="text-purple-400 font-bold">{verifications.length}</span>
                    </div>
                </div>

                {error && <div className="p-4 bg-red-500/20 text-red-200 rounded-xl mb-6">{error}</div>}

                {verifications.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
                        <h2 className="text-xl font-bold text-gray-300">¡Todo al día!</h2>
                        <p className="text-gray-500">No hay solicitudes pendientes de revisión.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {verifications.map((model) => (
                            <div key={model.id} className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all">
                                <div className="h-48 bg-black relative group">
                                    {/* Verification Photo Preview (Selfie with ID) */}
                                    <img
                                        src={model.verification_video_id || model.avatar_url} // Fallback
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

                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">Bio</p>
                                        <p className="text-sm text-gray-300 line-clamp-2">{model.bio_short || "Sin biografía"}</p>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button
                                            onClick={() => handleAction(model.id, 'reject')}
                                            className="flex-1 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2 text-sm font-bold"
                                        >
                                            <XCircle className="w-4 h-4" /> Rechazar
                                        </button>
                                        <button
                                            onClick={() => handleAction(model.id, 'approve')}
                                            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-green-500/20"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Aprobar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
