import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Eye, TrendingUp, ShieldCheck, ExternalLink, Filter, Search, ChevronLeft, ChevronRight, Plus, Copy, AlertCircle, Info, MessageSquare, Loader, BarChart2, Star, Send, CheckCircle, X, Clock, Trash2 } from 'lucide-react';
import Joyride, { STATUS } from 'react-joyride';
import { Modal } from '../components/ui/Modal';
import { sfsService } from '../api/sfs';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Promotions = () => {
    // Auth independiente para miniapp
    const [sfsUser, setSfsUser] = useState(null);
    const [limits, setLimits] = useState(null);
    const [globalAuthLoading, setGlobalAuthLoading] = useState(true);

    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('catalog');
    const [runTour, setRunTour] = useState(false);
    const [addChannelModalOpen, setAddChannelModalOpen] = useState(false);
    const [addChannelStep, setAddChannelStep] = useState(1);
    const [verifyStatus, setVerifyStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [verifyMessage, setVerifyMessage] = useState('');

    // Catálogo con paginación
    const [catalog, setCatalog] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingCatalog, setLoadingCatalog] = useState(true);

    // Propuestas
    const [sentCampaigns, setSentCampaigns] = useState([]);
    const [receivedCampaigns, setReceivedCampaigns] = useState([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);

    // Mis Canales
    const [myChannels, setMyChannels] = useState([]);
    const [loadingMyChannels, setLoadingMyChannels] = useState(false);

    // Modales de UI
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [channelToDelete, setChannelToDelete] = useState(null);

    // Gráficos e Historial
    const [statsModalOpen, setStatsModalOpen] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [channelHistory, setChannelHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Sistema de Reviews
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewCampaign, setReviewCampaign] = useState(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');

    const LIMIT = 5;

    // ---- Auth Init ----
    useEffect(() => {
        const initSfsUser = async () => {
            try {
                // Fricción Cero con initDataUnsafe
                let tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
                if (!tgUser) {
                    // Fallback para pruebas locales
                    tgUser = { id: 11234567, username: 'demo_user', first_name: 'Demo', last_name: 'User' };
                }

                const userPayload = {
                    telegram_id: tgUser.id,
                    username: tgUser.username || "",
                    full_name: `${tgUser.first_name || ""} ${tgUser.last_name || ""}`.trim()
                };

                const userDoc = await sfsService.authenticateUser(userPayload);
                setSfsUser(userDoc);

                // Fetch Limits
                const lims = await sfsService.getUserLimits(userDoc.id);
                setLimits(lims);
            } catch (err) {
                console.error("[Promo] Auth error", err);
                showToast("Error de conexión", "error");
            } finally {
                setGlobalAuthLoading(false);
            }
        };
        initSfsUser();
    }, []);

    // ---- Carga del catálogo ----
    const fetchCatalog = useCallback(async (page = 1) => {
        setLoadingCatalog(true);
        try {
            const resData = await sfsService.getCatalog(null, page, LIMIT);
            setCatalog(resData || []);
            setTotalPages(Math.max(1, Math.ceil((resData?.length || 0) / LIMIT)));
            setCurrentPage(page);
        } catch (err) {
            console.error('[Promo] Error cargando catálogo:', err);
        } finally {
            setLoadingCatalog(false);
        }
    }, []);

    // ---- Carga de campañas ----
    const fetchCampaigns = useCallback(async () => {
        if (!sfsUser?.id) return;
        setLoadingCampaigns(true);
        try {
            const [sentRes, recvRes] = await Promise.all([
                api.get(`/promo/campaigns/sent?model_id=${sfsUser.id}`), // Actualizar endopoint posterior
                api.get(`/promo/campaigns/received?model_id=${sfsUser.id}`),
            ]);
            setSentCampaigns(sentRes.data || []);
            setReceivedCampaigns(recvRes.data || []);
        } catch (err) {
            console.error('[Promo] Error cargando campañas:', err);
        } finally {
            setLoadingCampaigns(false);
        }
    }, [sfsUser?.id]);

    // ---- Carga de mis canales ----
    const fetchMyChannels = useCallback(async () => {
        if (!sfsUser?.id) return;
        setLoadingMyChannels(true);
        try {
            const resData = await sfsService.getMyChannels(sfsUser.id);
            setMyChannels(resData || []);
        } catch (err) {
            console.error('[Promo] Error cargando mis canales:', err);
        } finally {
            setLoadingMyChannels(false);
        }
    }, [sfsUser?.id]);

    const openDeleteModal = (channel) => {
        setChannelToDelete(channel);
        setDeleteModalOpen(true);
    };

    const confirmDeleteChannel = async () => {
        if (!channelToDelete || !sfsUser?.id) return;
        try {
            await api.delete(`/promo/channels/my/${channelToDelete.id}?model_id=${sfsUser.id}`);
            showToast("Canal eliminado", "success");
            setDeleteModalOpen(false);
            setChannelToDelete(null);
            fetchMyChannels();
            fetchCatalog(1);
        } catch (err) {
            showToast("Error eliminando canal", "error");
        }
    };

    const openStatsModal = async (channel) => {
        setSelectedChannel(channel);
        setStatsModalOpen(true);
        setLoadingHistory(true);
        try {
            const res = await api.get(`/promo/channels/my/${channel.id}/history?model_id=${sfsUser.id}`);
            const formatted = (res.data || []).map(row => ({
                ...row,
                formattedDate: format(new Date(row.created_at), "d MMM, HH:mm", { locale: es })
            }));
            setChannelHistory(formatted);
        } catch (err) {
            console.error("Error fetching history", err);
            showToast("No se pudo cargar el historial", "error");
        } finally {
            setLoadingHistory(false);
        }
    };

    const openReviewModal = (campaign) => {
        setReviewCampaign(campaign);
        setReviewRating(5);
        setReviewComment('');
        setReviewModalOpen(true);
    };

    const submitReview = async () => {
        if (!reviewCampaign || !sfsUser?.id) return;
        try {
            const targetId = reviewCampaign.requester_id === sfsUser.id ? reviewCampaign.target_id : reviewCampaign.requester_id;
            await sfsService.submitReview(sfsUser.id, {
                promo_campaign_id: reviewCampaign.id,
                target_id: targetId,
                rating: reviewRating,
                comment: reviewComment
            });
            showToast("Calificación enviada correctamente", "success");
            setReviewModalOpen(false);
        } catch (err) {
            showToast(err.response?.data?.detail || "Error enviando calificación", "error");
        }
    };

    useEffect(() => {
        fetchCatalog(1);
        const hasSeenTour = localStorage.getItem('sfs_tour_seen');
        if (!hasSeenTour) setRunTour(true);
    }, [fetchCatalog]);

    useEffect(() => {
        if (activeTab === 'sent' || activeTab === 'received') {
            fetchCampaigns();
        } else if (activeTab === 'my_channels') {
            fetchMyChannels();
        }
    }, [activeTab, fetchCampaigns, fetchMyChannels]);

    const handleJoyrideCallback = (data) => {
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(data.status)) {
            setRunTour(false);
            localStorage.setItem('sfs_tour_seen', 'true');
        }
    };

    // handleVerifyChannel remoto ya no es necesario dado el sistema de códigos únicos

    const resetModal = () => {
        setAddChannelStep(1);
        setVerifyStatus(null);
        setVerifyMessage('');
    };

    const tourSteps = [
        { target: '.tour-step-1', content: '¡Bienvenida al SFS Automatizado! Intercambia publicidad con otras modelos con visualizaciones reales garantizadas.', disableBeacon: true },
        { target: '.tour-step-2', content: 'Catálogo de canales verificados. Verás seguidores reales, vistas promedio y la calificación de calidad.' },
        { target: '.tour-step-3', content: 'El Trust Score indica qué tan confiable es la modelo. A más alto, menor riesgo de que borre tu post antes de tiempo.' },
        { target: '.tour-step-4', content: 'Antes de proponer un SFS, reenvíale tu post publicitario (foto + texto + emojis) directamente a @Nebula_sfs_bot en Telegram.' },
    ];

    // ----------- MODAL AÑADIR CANAL -----------
    const renderAddChannelModal = () => (
        <Modal isOpen={addChannelModalOpen} onClose={() => { setAddChannelModalOpen(false); resetModal(); }}>
            <div className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-1">Añadir mi Canal</h2>
                <p className="text-xs text-muted-foreground mb-5">Paso {addChannelStep} de 3</p>
                <div className="flex gap-1 mb-6">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${addChannelStep >= s ? 'bg-purple-500' : 'bg-white/10'}`} />
                    ))}
                </div>

                {addChannelStep === 1 && (
                    <div className="space-y-4">
                        <div className="bg-card/40 border border-white/10 rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-bold text-foreground mb-4">Verificación Automática</h3>
                            {[
                                ['1', 'Añade a', '@Nebula_sfs_bot', 'como Administrador de tu canal.'],
                                ['2', 'Asegúrate de darle todos los', 'permisos', '(enviar, editar, borrar e invitar).'],
                                ['3', 'El bot registrará tu canal', 'automáticamente', 'en tu perfil.'],
                            ].map(([num, text, bold, suffix]) => (
                                <div key={num} className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">{num}</span>
                                    <p className="text-sm text-muted-foreground">{text} <span className="font-bold text-foreground">{bold}</span> {suffix}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2 items-start">
                            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-300">Este método es instantáneo. Una vez añadido y confirmado, cierra esta ventana y tu canal aparecerá en estado pendiente.</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setAddChannelModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-foreground bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                Cerrar Ventana
                            </button>
                            <a href="https://t.me/Nebula_sfs_bot" target="_blank" rel="noreferrer" className="flex-1 text-center py-3 rounded-xl text-sm font-bold text-white bg-purple-500 hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/25">
                                Ir al Bot
                            </a>
                        </div>
                    </div>
                )}

                {/* Step 2 Removido - La validación manual ya no es necesaria */}
                {addChannelStep === 3 && (
                    <div className="space-y-4 text-center py-2">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${verifyStatus === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            {verifyStatus === 'success' ? <CheckCircle className="w-8 h-8 text-green-400" /> : <X className="w-8 h-8 text-red-400" />}
                        </div>
                        <p className="font-bold text-foreground">{verifyStatus === 'success' ? '¡Solicitud enviada!' : 'Verificación fallida'}</p>
                        <p className="text-sm text-muted-foreground">{verifyMessage}</p>
                        {verifyStatus === 'error' && (
                            <button onClick={() => setAddChannelStep(2)} className="w-full py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10">Intentar de nuevo</button>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );

    // ----------- MODAL ELIMINAR -----------
    const renderDeleteModal = () => (
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
            <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-black text-foreground mb-2">Eliminar Canal</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    ¿Estás segurísima que deseas eliminar el canal <span className="text-foreground font-bold">{channelToDelete?.name}</span>?<br /><br />
                    Esto borrará permanentemente todo su historial de métricas y ya no recibirás propuestas de publicidad SFS.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-foreground bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        Cancelar
                    </button>
                    <button onClick={confirmDeleteChannel} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-lg shadow-red-500/25">
                        Sí, eliminar
                    </button>
                </div>
            </div>
        </Modal>
    );

    // ----------- MODAL ESTADÍSTICAS -----------
    const renderStatsModal = () => (
        <Modal isOpen={statsModalOpen} onClose={() => setStatsModalOpen(false)}>
            <div className="p-6">
                <h2 className="text-xl font-black text-foreground mb-1">{selectedChannel?.name}</h2>
                <p className="text-xs text-muted-foreground mb-6 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" /> Rendimiento histórico (cada 6h)
                </p>

                {loadingHistory ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader className="w-8 h-8 animate-spin text-purple-400" />
                    </div>
                ) : channelHistory.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-48 text-muted-foreground">
                        <BarChart2 className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">No hay datos históricos suficientes aún.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="h-48 w-full bg-card/20 rounded-xl p-2 border border-white/5">
                            <h3 className="text-xs font-bold text-muted-foreground mb-2 pl-2">Vistas por Post (Avg)</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={channelHistory}>
                                    <defs>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#c026d3" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#c026d3" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="formattedDate" stroke="#ffffff50" fontSize={10} tickMargin={10} minTickGap={20} />
                                    <YAxis stroke="#ffffff50" fontSize={10} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} width={35} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="avg_views" name="Vistas Promedio" stroke="#c026d3" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                <button onClick={() => setStatsModalOpen(false)} className="w-full mt-6 py-3 rounded-xl text-sm font-bold text-foreground bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                    Cerrar
                </button>
            </div>
        </Modal>
    );

    // ----------- MODAL REVIEW -----------
    const renderReviewModal = () => (
        <Modal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)}>
            <div className="p-6">
                <h2 className="text-xl font-black text-foreground mb-1">Calificar SFS</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Evalúa tu experiencia con la campaña. Esto afecta el Trust Score.
                </p>

                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setReviewRating(star)} className="focus:outline-none transition-transform hover:scale-110 active:scale-95">
                            <Star className={`w-10 h-10 ${reviewRating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground opacity-30'}`} />
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Cuentanos tu experiencia (Opcional)</label>
                        <textarea
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                            placeholder="¿Cumplió con lo acordado? ¿Borró el post antes de tiempo?"
                            rows={3}
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setReviewModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-foreground bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                            Cancelar
                        </button>
                        <button onClick={submitReview} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-purple-500 hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/25">
                            Enviar
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );

    // ----------- RENDER CATÁLOGO -----------
    const renderCatalog = () => (
        <div className="space-y-4">
            {loadingCatalog ? (
                <div className="flex items-center justify-center py-16">
                    <Loader className="w-8 h-8 animate-spin text-purple-400" />
                </div>
            ) : catalog.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No hay canales aprobados aún. ¡Sé la primera en añadir el tuyo!</p>
                </div>
            ) : (
                <>
                    {catalog.map((channel, index) => (
                        <div key={channel.id}
                            onClick={() => openStatsModal(channel)}
                            className={`bg-card/40 border border-white/5 rounded-2xl p-4 flex flex-col space-y-4 transition-all hover:bg-card/60 cursor-pointer ${index === 0 ? 'tour-step-2' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        {channel.invite_link ? (
                                            <a href={channel.invite_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-purple-400 hover:underline flex items-center gap-1 transition-colors">
                                                {channel.name} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : (
                                            channel.name
                                        )}
                                        {channel.trust_score >= 90 && <ShieldCheck className="w-4 h-4 text-green-400" />}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full flex items-center gap-1">
                                            <Users className="w-3 h-3" /> {(channel.followers || 0).toLocaleString()}
                                        </span>
                                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full flex items-center gap-1">
                                            <BarChart2 className="w-3 h-3" /> {channel.er}% ER
                                        </span>
                                    </div>
                                </div>
                                <div className={`tour-step-3 text-sm font-bold flex items-center gap-1 ${channel.trust_score >= 80 ? 'text-green-400' : 'text-yellow-500'}`}>
                                    <Star className="w-4 h-4 fill-current" /> {channel.trust_score}
                                </div>
                            </div>

                            {channel.badges?.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    {channel.badges.map(badge => (
                                        <span key={badge} className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-lg border border-yellow-500/20">
                                            🏅 {badge}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">
                                        ~<span className="text-foreground font-medium">{(channel.avg_views || 0).toLocaleString()}</span> vistas/post
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/60">(últimos 10 posts)</span>
                                </div>
                                <button onClick={(e) => e.stopPropagation()} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95">
                                    <Send className="w-3.5 h-3.5" /> Proponer SFS
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <button onClick={() => fetchCatalog(currentPage - 1)} disabled={currentPage === 1}
                                className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <ChevronLeft className="w-4 h-4" /> Anterior
                            </button>
                            <span className="text-xs text-muted-foreground">
                                Página <span className="text-foreground font-bold">{currentPage}</span> de <span className="text-foreground font-bold">{totalPages}</span>
                            </span>
                            <button onClick={() => fetchCatalog(currentPage + 1)} disabled={currentPage === totalPages}
                                className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                Siguiente <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    const statusLabel = { accepted: '⏳ Aceptada', active: '🟢 Activa', completed: '✅ Completada', cancelled_fraud: '🚨 Fraude', pending: '🕐 Pendiente' };

    const renderCampaignList = (campaigns) => {
        if (loadingCampaigns) return <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-purple-400" /></div>;
        if (!campaigns.length) return (
            <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Sin propuestas aún.</p>
            </div>
        );
        return (
            <div className="space-y-3">
                {campaigns.map(c => (
                    <div key={c.id} className="bg-card/40 border border-white/5 rounded-xl p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-foreground capitalize">{c.type?.replace('_', ' ')}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {c.duration_hours ? `${c.duration_hours}h` : `${c.target_views?.toLocaleString()} vistas`}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-xs font-bold bg-white/5 px-2 py-1 rounded-md">{statusLabel[c.status] || c.status}</span>
                                {c.status === 'completed' && (
                                    <button onClick={() => openReviewModal(c)} className="text-[10px] bg-yellow-500/20 text-yellow-400 font-bold px-2 py-1 rounded shadow-sm hover:bg-yellow-500/30 transition-colors">
                                        ⭐ Puntuar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderMyChannels = () => {
        if (loadingMyChannels) return <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-purple-400" /></div>;
        if (!myChannels.length) return (
            <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No has añadido ningún canal todavía.</p>
                <button onClick={() => setAddChannelModalOpen(true)} className="mt-4 text-xs font-bold text-purple-400 hover:text-purple-300">Añadir uno ahora</button>
            </div>
        );
        return (
            <div className="space-y-3">
                {myChannels.map(ch => (
                    <div key={ch.id}
                        onClick={() => openStatsModal(ch)}
                        className="bg-card/40 border border-white/5 rounded-xl p-4 flex justify-between items-center group cursor-pointer hover:bg-card/60 transition-all">
                        <div>
                            <h3 className="font-bold text-foreground flex items-center gap-2">
                                {ch.invite_link ? (
                                    <a href={ch.invite_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-purple-400 hover:underline flex items-center gap-1 transition-colors">
                                        {ch.name} <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : (
                                    ch.name
                                )}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ch.status === 'active' ? 'bg-green-500/20 text-green-400' : ch.status === 'verifying' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-400'}`}>
                                    {ch.status}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {(ch.followers || 0).toLocaleString()} subs
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); openDeleteModal(ch); }}
                            className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Eliminar Canal"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    if (globalAuthLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-black">
                <Loader className="w-10 h-10 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto min-h-screen tour-step-1">
            <Joyride steps={[
                { target: '.tour-step-1', content: '¡Bienvenida al SFS Automatizado! Intercambia publicidad con otras modelos con visualizaciones reales garantizadas.', disableBeacon: true },
                { target: '.tour-step-2', content: 'Catálogo de canales verificados. Verás seguidores reales, vistas promedio y la calificación de calidad.' },
                { target: '.tour-step-3', content: 'El Trust Score indica qué tan confiable es la modelo. A más alto, menor riesgo de que borre tu post antes de tiempo.' },
                { target: '.tour-step-4', content: 'Antes de proponer un SFS, reenvíale tu post publicitario (foto + texto + emojis) directamente a @Nebula_sfs_bot en Telegram.' },
            ]} run={runTour} continuous showSkipButton showProgress callback={handleJoyrideCallback}
                styles={{ options: { arrowColor: 'hsl(240 10% 5%)', backgroundColor: 'hsl(240 10% 5%)', overlayColor: 'rgba(0,0,0,0.75)', primaryColor: '#c026d3', textColor: 'hsl(0 0% 98%)', zIndex: 1000 }, buttonNext: { borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }, buttonBack: { marginRight: 10, color: '#a1a1aa' }, buttonSkip: { color: '#a1a1aa' } }} />

            {renderAddChannelModal()}
            {renderDeleteModal()}
            {renderStatsModal()}
            {renderReviewModal()}

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Promo Center</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Acuerdos seguros SFS y Publicidad PXP.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <button onClick={() => setAddChannelModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-card/40 border border-white/10 text-foreground rounded-xl text-xs font-bold hover:bg-card/60 transition-all active:scale-95">
                        <Plus className="w-3.5 h-3.5" /> Añadir Canal
                    </button>
                    {limits && (
                        <div className="text-[10px] font-bold px-2 py-1 rounded-md bg-purple-500/20 text-purple-400">
                            SFS Restantes Hoy: {limits.remaining}/{limits.limit}
                        </div>
                    )}
                </div>
            </div>

            {/* Banner Bot */}
            <div className="bg-card/40 border border-white/5 rounded-2xl p-4 mb-5 flex gap-3 items-start tour-step-4">
                <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-400 shrink-0">
                    <Send className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-foreground text-sm">Prepara tu post primero</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-2">Reenvíale tu mejor foto/video con emojis a <span className="font-bold text-foreground">@Nebula_sfs_bot</span> en Telegram.</p>
                    <a href="https://t.me/Nebula_sfs_bot" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300">
                        Ir al Bot @Nebula_sfs_bot 👉
                    </a>
                </div>
            </div>

            {/* Banner Upsell Agencia — Solo para NO modelos */}
            {sfsUser && !sfsUser.is_agency_model && (
                <div className="relative overflow-hidden rounded-2xl mb-5 group">
                    {/* Fondo animado */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 opacity-90" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

                    <div className="relative p-5 flex gap-4 items-center">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                            <span className="text-3xl">🔥</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-white text-sm leading-tight">¿Eres Creadora de Contenido?</h4>
                            <p className="text-[11px] text-white/80 mt-1 leading-relaxed">
                                Automatiza tus ventas en DMs con nuestro <span className="font-bold text-white">Bot de IA</span>. Accede a SFS ilimitados, analíticas PRO y gana dinero en piloto automático.
                            </p>
                            <a
                                href="https://t.me/ClubNebula_Bot"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-white text-purple-700 rounded-xl text-xs font-black hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-black/20"
                            >
                                Aplica Ahora — Es Gratis
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex bg-card/40 border border-white/5 p-1 rounded-xl mb-5">
                {[['catalog', 'Catálogo'], ['sent', 'Enviadas'], ['received', 'Recibidas'], ['my_channels', 'Mis Canales']].map(([tab, label]) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                        {label}
                        {tab === 'received' && receivedCampaigns.length > 0 && (
                            <span className="bg-pink-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{receivedCampaigns.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div>
                {activeTab === 'catalog' && renderCatalog()}
                {activeTab === 'sent' && renderCampaignList(sentCampaigns)}
                {activeTab === 'received' && renderCampaignList(receivedCampaigns)}
                {activeTab === 'my_channels' && renderMyChannels()}
            </div>
        </div>
    );
};

export default Promotions;
