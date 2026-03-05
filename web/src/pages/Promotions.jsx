import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Eye, TrendingUp, ShieldCheck, ExternalLink, Filter, Search, ChevronLeft, ChevronRight, Plus, Copy, AlertCircle, Info, MessageSquare, Loader, BarChart2, Star, Send, CheckCircle, X, Clock, Trash2, LogOut, Pencil, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Joyride, { STATUS } from 'react-joyride';
import { Modal } from '../components/ui/Modal';
import BannerCarousel from '../components/BannerCarousel';
import { sfsService } from '../api/sfs';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import SfsWalletPanel from '../components/sfs/SfsWalletPanel';
import SfsProfilePanel from '../components/sfs/SfsProfilePanel';

const Promotions = () => {
    // Auth independiente para miniapp
    const navigate = useNavigate();
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
    const [catalogCategory, setCatalogCategory] = useState(''); // '' = todas

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

    // ---- Estado modal Proponer SFS ----
    const [proposeModalOpen, setProposeModalOpen] = useState(false);
    const [proposeTarget, setProposeTarget] = useState(null);
    const [proposeMyChannels, setProposeMyChannels] = useState([]);
    const [proposeMyTemplates, setProposeMyTemplates] = useState([]);
    const [proposeSelectedChannel, setProposeSelectedChannel] = useState('');
    const [proposeSelectedTemplate, setProposeSelectedTemplate] = useState('');
    const [proposeContractType, setProposeContractType] = useState('SFS_VIEWS');
    const [proposeViewsTarget, setProposeViewsTarget] = useState(1000);
    const [proposeDurationHours, setProposeDurationHours] = useState(24);
    const [proposeFollowersTarget, setProposeFollowersTarget] = useState(100);
    const [proposeLoading, setProposeLoading] = useState(false);

    // ---- Estado editor de canal ----
    const [channelEditModalOpen, setChannelEditModalOpen] = useState(false);
    const [channelToEdit, setChannelToEdit] = useState(null);
    const [channelEditData, setChannelEditData] = useState({});
    const [channelEditLoading, setChannelEditLoading] = useState(false);

    // ---- Estado perfil propio ----
    const [myProfile, setMyProfile] = useState(null);
    const [walletModalOpen, setWalletModalOpen] = useState(false);
    const [profilePanelOpen, setProfilePanelOpen] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');

    const LIMIT = 5;

    // ---- Auth Init (3 niveles + persistencia de sesión) ----
    const telegramLoginRef = useRef(null);
    const [needsLogin, setNeedsLogin] = useState(false);

    // Helper para persistir sesión
    const SFS_SESSION_KEY = 'sfs_promo_user';
    const saveSession = (userDoc) => {
        localStorage.setItem(SFS_SESSION_KEY, JSON.stringify(userDoc));
    };
    const clearSession = () => localStorage.removeItem(SFS_SESSION_KEY);

    useEffect(() => {
        const initSfsUser = async () => {
            try {
                // Detectar usuario de Telegram WebApp primero (fuente de verdad)
                const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
                const tgTelegramId = tgUser?.id ? Number(tgUser.id) : null;

                // NIVEL 0: Sesión SFS persistida (válida solo si coincide con el usuario actual)
                const cached = localStorage.getItem(SFS_SESSION_KEY);
                if (cached) {
                    const cachedUser = JSON.parse(cached);
                    const cachedTelegramId = cachedUser?.telegram_id ? Number(cachedUser.telegram_id) : null;

                    // Si hay un usuario de Telegram y NO coincide con la caché → limpiar
                    if (cachedUser?.id && tgTelegramId && cachedTelegramId !== tgTelegramId) {
                        localStorage.removeItem(SFS_SESSION_KEY);
                    } else if (cachedUser?.id) {
                        // Coincide (o no hay Telegram WebApp) → usar caché
                        setSfsUser(cachedUser);
                        const lims = await sfsService.getUserLimits(cachedUser.id);
                        setLimits(lims);
                        setGlobalAuthLoading(false);
                        return;
                    }
                }

                // NIVEL 1: Telegram WebApp (MiniApp abierta desde el bot)
                if (tgUser) {
                    const userPayload = {
                        telegram_id: tgUser.id,
                        username: tgUser.username || "",
                        full_name: `${tgUser.first_name || ""} ${tgUser.last_name || ""}`.trim()
                    };
                    const userDoc = await sfsService.authenticateUser(userPayload);
                    setSfsUser(userDoc);
                    saveSession(userDoc);
                    const lims = await sfsService.getUserLimits(userDoc.id);
                    setLimits(lims);
                    setGlobalAuthLoading(false);
                    return;
                }

                // NIVEL 2: Sesión existente en localStorage (usuario logueado en el portal principal)
                const storedUser = localStorage.getItem('user');
                const token = localStorage.getItem('token');
                if (token && storedUser && storedUser !== "undefined" && storedUser !== "null") {
                    const parsed = JSON.parse(storedUser);
                    if (parsed?.telegram_id) {
                        const userPayload = {
                            telegram_id: parsed.telegram_id,
                            username: parsed.username || "",
                            full_name: parsed.full_name || parsed.artistic_name || ""
                        };
                        const userDoc = await sfsService.authenticateUser(userPayload);
                        setSfsUser(userDoc);
                        saveSession(userDoc);
                        const lims = await sfsService.getUserLimits(userDoc.id);
                        setLimits(lims);
                        setGlobalAuthLoading(false);
                        return;
                    }
                }

                // NIVEL 3: Sin sesión → Mostrar pantalla de login
                setNeedsLogin(true);
                setGlobalAuthLoading(false);

            } catch (err) {
                console.error("[Promo] Auth error", err);
                setNeedsLogin(true);
                setGlobalAuthLoading(false);
            }
        };
        initSfsUser();
    }, []);

    // Telegram Login Widget (solo se monta si needsLogin es true)
    useEffect(() => {
        if (!needsLogin || !telegramLoginRef.current) return;
        if (telegramLoginRef.current.innerHTML !== "") return;

        const script = document.createElement('script');
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute('data-telegram-login', 'ClubNebula_Bot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '12');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-onauth', 'onTelegramAuthPromo(user)');
        script.async = true;
        telegramLoginRef.current.appendChild(script);

        window.onTelegramAuthPromo = async (user) => {
            try {
                setGlobalAuthLoading(true);
                setNeedsLogin(false);
                const userPayload = {
                    telegram_id: user.id,
                    username: user.username || "",
                    full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim()
                };
                const userDoc = await sfsService.authenticateUser(userPayload);
                setSfsUser(userDoc);
                saveSession(userDoc);
                const lims = await sfsService.getUserLimits(userDoc.id);
                setLimits(lims);
            } catch (err) {
                console.error("[Promo] Login error", err);
                showToast("Error al iniciar sesión", "error");
                setNeedsLogin(true);
            } finally {
                setGlobalAuthLoading(false);
            }
        };

        return () => { window.onTelegramAuthPromo = undefined; };
    }, [needsLogin]);

    // ---- Carga del catálogo ----
    const fetchCatalog = useCallback(async (page = 1, category = '') => {
        setLoadingCatalog(true);
        try {
            const params = new URLSearchParams({ page, limit: LIMIT });
            if (category) params.append('category', category);
            const res = await api.get(`/promo/channels/catalog?${params.toString()}`);
            const resData = res.data;
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

    const [statsLastUpdated, setStatsLastUpdated] = useState(null);

    const openStatsModal = async (channel) => {
        setSelectedChannel(channel);
        setStatsModalOpen(true);
        setLoadingHistory(true);
        setStatsLastUpdated(null);
        try {
            const res = await api.get(`/promo/channels/my/${channel.id}/history?model_id=${sfsUser.id}`);
            const payload = res.data || {};
            const rawHistory = Array.isArray(payload.history) ? payload.history : [];
            const formatted = rawHistory.map(row => ({
                ...row,
                formattedDate: format(new Date(row.created_at), "d MMM", { locale: es }),
                followers: row.followers || 0,
                avg_views: row.avg_views || 0,
                engagement_rate: row.engagement_rate || 0,
            }));
            setChannelHistory(formatted);
            if (payload.last_updated) {
                setStatsLastUpdated(format(new Date(payload.last_updated), "d MMM yyyy, HH:mm", { locale: es }));
            }
        } catch (err) {
            console.error("Error fetching history", err);
            setChannelHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const openProposeModal = async (channel) => {
        setProposeTarget(channel);
        setProposeSelectedChannel('');
        setProposeSelectedTemplate('');
        setProposeContractType('SFS_VIEWS');
        setProposeViewsTarget(1000);
        setProposeDurationHours(24);
        setProposeFollowersTarget(100);
        setProposeModalOpen(true);
        if (sfsUser) {
            try {
                const [chs, tpls] = await Promise.all([
                    sfsService.getMyChannels(sfsUser.id),
                    sfsService.getMyTemplates(sfsUser.id)
                ]);
                setProposeMyChannels(Array.isArray(chs) ? chs.filter(c => c.status === 'active') : []);
                setProposeMyTemplates(Array.isArray(tpls) ? tpls : []);
            } catch (err) {
                console.error('Error loading propose data', err);
            }
        }
    };

    const handleLogout = () => {
        // Limpiar sesión SFS
        localStorage.removeItem(SFS_SESSION_KEY);
        // También limpiar sesión del portal principal para evitar re-login automático (NIVEL 2)
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setSfsUser(null);
        setLimits(null);
        setCatalog([]);
        setSentCampaigns([]);
        setReceivedCampaigns([]);
        setMyProfile(null);
        setNeedsLogin(true);
    };

    const submitProposeSFS = async () => {
        if (!proposeSelectedChannel || !proposeSelectedTemplate) {
            showToast('Selecciona un canal y un post plantilla', 'error');
            return;
        }
        if (!proposeTarget?.sfs_user_id && !proposeTarget?.id) {
            showToast('No se pudo identificar al destinatario', 'error');
            return;
        }
        const targetUserId = proposeTarget.sfs_user_id || proposeTarget.target_sfs_user_id;
        setProposeLoading(true);
        try {
            await sfsService.proposeSFS(sfsUser.id, {
                target_sfs_user_id: targetUserId,
                requester_channel_id: proposeSelectedChannel,
                requester_template_id: proposeSelectedTemplate,
                contract_type: proposeContractType,
                views_target: proposeContractType === 'SFS_VIEWS' ? proposeViewsTarget : undefined,
                duration_hours: proposeContractType === 'SFS_TIME' ? proposeDurationHours : undefined,
                followers_target: proposeContractType === 'SFS_FOLLOWERS' ? proposeFollowersTarget : undefined,
            });
            showToast('¡Propuesta enviada! El anunciante debe aceptarla.', 'success');
            setProposeModalOpen(false);
            fetchCampaigns();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Error al enviar la propuesta';
            showToast(msg, 'error');
        } finally {
            setProposeLoading(false);
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
        } else if (activeTab === 'profile') {
            fetchMyChannels();
            if (sfsUser && !myProfile) {
                api.get(`/promo/profile/me?sfs_user_id=${sfsUser.id}`).then(r => setMyProfile(r.data)).catch(() => { });
            }
        }
    }, [activeTab, fetchCampaigns, fetchMyChannels, sfsUser, myProfile]);

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
                {addChannelStep === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-foreground mb-1">Añadir mi Canal</h2>
                        <p className="text-xs text-muted-foreground">Sigue estos pasos para vincular tu canal al ecosistema SFS.</p>

                        <div className="bg-card/40 border border-white/10 rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-bold text-foreground mb-4">Verificación Automática</h3>
                            {[
                                ['1', 'Añade a', '@Nebula_sfs_bot', 'como Administrador de tu canal.'],
                                ['2', 'Asegúrate de darle todos los', 'permisos', '(enviar, editar, borrar e invitar).'],
                                ['3', 'El bot registrará tu canal', 'automáticamente', 'y notificará al admin.'],
                            ].map(([num, text, bold, suffix]) => (
                                <div key={num} className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">{num}</span>
                                    <p className="text-sm text-muted-foreground">{text} <span className="font-bold text-foreground">{bold}</span> {suffix}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2 items-start">
                            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-300">Una vez añadido el bot, recibirás una notificación en Telegram confirmando el registro. El canal quedará pendiente de aprobación.</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <a href="https://t.me/Nebula_sfs_bot" target="_blank" rel="noreferrer" className="flex-1 text-center py-3 rounded-xl text-sm font-bold text-white bg-purple-500 hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/25">
                                Ir al Bot
                            </a>
                            <button onClick={() => setAddChannelStep(2)} className="flex-1 py-3 rounded-xl text-sm font-bold text-foreground bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                Ya lo añadí ✓
                            </button>
                        </div>
                    </div>
                )}

                {addChannelStep === 2 && (
                    <div className="space-y-4 text-center py-2">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="font-bold text-foreground text-lg">¡Excelente!</h3>
                        <p className="text-sm text-muted-foreground">Si el bot fue añadido correctamente como admin con todos los permisos, tu canal ya debería estar registrado.</p>
                        <p className="text-xs text-muted-foreground">Revisa tu chat con <span className="font-bold text-foreground">@Nebula_sfs_bot</span> en Telegram para confirmar.</p>

                        <div className="flex gap-3 pt-3">
                            <button onClick={() => setAddChannelStep(1)} className="flex-1 py-3 rounded-xl text-sm font-bold text-foreground bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                ← Volver
                            </button>
                            <button onClick={async () => { if (sfsUser) { const ch = await sfsService.getMyChannels(sfsUser.id); setMyChannels(ch); } setAddChannelModalOpen(false); resetModal(); setActiveTab('profile'); }} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-purple-500 hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/25">
                                Ver Mis Canales
                            </button>
                        </div>
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

                {statsLastUpdated && (
                    <p className="text-[10px] text-muted-foreground/60 mb-4 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Última actualización: {statsLastUpdated}
                    </p>
                )}

                {loadingHistory ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader className="w-8 h-8 animate-spin text-purple-400" />
                    </div>
                ) : channelHistory.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-48 text-muted-foreground">
                        <BarChart2 className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">No hay datos históricos suficientes aún.</p>
                        <p className="text-xs mt-1 opacity-60">El bot analiza los canales cada 6 horas automáticamente.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="h-40 w-full bg-card/20 rounded-xl p-2 border border-white/5">
                            <h3 className="text-xs font-bold text-muted-foreground mb-1 pl-2">👁️ Vistas Promedio / Post</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={channelHistory}>
                                    <defs>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#c026d3" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#c026d3" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="formattedDate" stroke="#ffffff50" fontSize={9} tickMargin={8} minTickGap={20} />
                                    <YAxis stroke="#ffffff50" fontSize={9} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} width={32} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '11px' }} itemStyle={{ color: '#fff' }} />
                                    <Area type="monotone" dataKey="avg_views" name="Vistas" stroke="#c026d3" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="h-40 w-full bg-card/20 rounded-xl p-2 border border-white/5">
                            <h3 className="text-xs font-bold text-muted-foreground mb-1 pl-2">👥 Seguidores</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={channelHistory}>
                                    <defs>
                                        <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="formattedDate" stroke="#ffffff50" fontSize={9} tickMargin={8} minTickGap={20} />
                                    <YAxis stroke="#ffffff50" fontSize={9} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} width={32} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '11px' }} itemStyle={{ color: '#fff' }} />
                                    <Area type="monotone" dataKey="followers" name="Seguidores" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorFollowers)" />
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

    const CATEGORIES = ['Modelaje', 'Cine y Series', 'Memes', 'Cripto', 'Adultos', 'Otro'];

    const handleCategoryFilter = (cat) => {
        const next = catalogCategory === cat ? '' : cat;
        setCatalogCategory(next);
        fetchCatalog(1, next);
    };

    const CONTRACT_LABELS = { SFS_VIEWS: '👁️ Vistas', SFS_TIME: '⏱️ Tiempo', SFS_FOLLOWERS: '👥 Subs' };

    const renderCatalog = () => (
        <div className="space-y-4">
            {/* Filtro de categorías */}
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleCategoryFilter('')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${catalogCategory === '' ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 text-muted-foreground hover:bg-white/10'
                        }`}>
                    Todas
                </button>
                {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => handleCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${catalogCategory === cat ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 text-muted-foreground hover:bg-white/10'
                            }`}>
                        {cat}
                    </button>
                ))}
            </div>

            {loadingCatalog ? (
                <div className="flex items-center justify-center py-16">
                    <Loader className="w-8 h-8 animate-spin text-purple-400" />
                </div>
            ) : catalog.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No hay canales{catalogCategory ? ` en "${catalogCategory}"` : ''} aún.</p>
                </div>
            ) : (
                <>
                    {catalog.map((channel, index) => (
                        <div key={channel.id}
                            onClick={() => openStatsModal(channel)}
                            className={`bg-card/40 border border-white/5 rounded-2xl p-4 flex flex-col space-y-3 transition-all hover:bg-card/60 cursor-pointer ${index === 0 ? 'tour-step-2' : ''}`}>
                            {/* Fila superior: nombre + trust score */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        {channel.invite_link ? (
                                            <a href={channel.invite_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-purple-400 hover:underline flex items-center gap-1 transition-colors">
                                                {channel.name} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : channel.name}
                                        {channel.trust_score >= 90 && <ShieldCheck className="w-4 h-4 text-green-400" />}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full flex items-center gap-1">
                                            <Users className="w-3 h-3" /> {(channel.followers || 0).toLocaleString()}
                                        </span>
                                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full flex items-center gap-1">
                                            <BarChart2 className="w-3 h-3" /> {(channel.engagement_rate || 0).toFixed(1)}% ER
                                        </span>
                                        {channel.category && (
                                            <span className="px-2 py-0.5 bg-fuchsia-500/10 text-fuchsia-400 text-xs rounded-full">
                                                {channel.category}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className={`tour-step-3 text-sm font-bold flex items-center gap-1 ${channel.trust_score >= 80 ? 'text-green-400' : 'text-yellow-500'}`}>
                                    <Star className="w-4 h-4 fill-current" /> {channel.trust_score}
                                </div>
                            </div>

                            {/* Bio del canal */}
                            {channel.bio && (
                                <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">{channel.bio}</p>
                            )}

                            {/* Contratos aceptados */}
                            {channel.accepted_contract_types?.length > 0 && (
                                <div className="flex gap-1.5 flex-wrap">
                                    {channel.accepted_contract_types.map(ct => (
                                        <span key={ct} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                                            {CONTRACT_LABELS[ct] || ct}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Badges */}
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
                                    {channel.sfs_user_id && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); navigate(`/promotions/advertiser/${channel.sfs_user_id}`); }}
                                            className="text-[10px] text-purple-400 hover:text-purple-300 underline text-left mt-0.5 transition-colors"
                                        >
                                            Ver perfil del anunciante →
                                        </button>
                                    )}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); openProposeModal(channel); }} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95">
                                    <Send className="w-3.5 h-3.5" /> Proponer SFS
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <button onClick={() => fetchCatalog(currentPage - 1, catalogCategory)} disabled={currentPage === 1}
                                className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <ChevronLeft className="w-4 h-4" /> Anterior
                            </button>
                            <span className="text-xs text-muted-foreground">
                                Página <span className="text-foreground font-bold">{currentPage}</span> de <span className="text-foreground font-bold">{totalPages}</span>
                            </span>
                            <button onClick={() => fetchCatalog(currentPage + 1, catalogCategory)} disabled={currentPage === totalPages}
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

    const handleCampaignResponse = async (campaignId, action) => {
        try {
            await api.patch(`/promo/campaigns/${campaignId}?sfs_user_id=${sfsUser.id}&action=${action}`);
            showToast(action === 'accept' ? '¡Propuesta aceptada!' : 'Propuesta rechazada', action === 'accept' ? 'success' : 'error');
            fetchCampaigns();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Error al responder', 'error');
        }
    };

    const renderCampaignList = (campaigns, isReceived = false) => {
        if (loadingCampaigns) return <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-purple-400" /></div>;
        if (!campaigns.length) return (
            <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Sin propuestas aún.</p>
            </div>
        );
        return (
            <div className="space-y-3">
                {campaigns.map(c => {
                    const meta = isReceived ? c.requester : c.target;
                    const targetLabel = c.type === 'SFS_VIEWS'
                        ? `${(c.views_target || 0).toLocaleString()} vistas`
                        : c.type === 'SFS_TIME'
                            ? `${c.duration_hours}h de exposición`
                            : c.type === 'SFS_FOLLOWERS'
                                ? `${(c.followers_target || 0).toLocaleString()} subs nuevos`
                                : c.type;
                    return (
                        <div key={c.id} className="bg-card/40 border border-white/5 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-bold text-foreground">
                                        {c.type?.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{targetLabel}</p>
                                    {meta && (
                                        <p className="text-[11px] text-purple-300 mt-1">
                                            {isReceived ? '📨 De:' : '📤 A:'} @{meta.username || meta.full_name || '?'}
                                            <span className="text-muted-foreground ml-1">· Trust {meta.trust_score ?? 100}/100</span>
                                        </p>
                                    )}
                                </div>
                                <span className="text-xs font-bold bg-white/5 px-2 py-1 rounded-md shrink-0">
                                    {statusLabel[c.status] || c.status}
                                </span>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex gap-2">
                                {/* Aceptar / Rechazar — solo si es recibida y está pendiente */}
                                {isReceived && c.status === 'pending' && (<>
                                    <button
                                        onClick={() => handleCampaignResponse(c.id, 'accept')}
                                        className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-500 transition-all flex items-center justify-center gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5" /> Aceptar
                                    </button>
                                    <button
                                        onClick={() => handleCampaignResponse(c.id, 'reject')}
                                        className="flex-1 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5">
                                        <X className="w-3.5 h-3.5" /> Rechazar
                                    </button>
                                </>)}
                                {/* Puntuar — si la campaña está completada */}
                                {c.status === 'completed' && (
                                    <button onClick={() => openReviewModal(c)}
                                        className="w-full py-2 rounded-xl text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-1.5">
                                        <Star className="w-3.5 h-3.5 fill-current" /> Puntuar campaña
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const openChannelEdit = (ch) => {
        setChannelToEdit(ch);
        setChannelEditData({
            category: ch.category || '',
            mode: ch.mode || 'sfs',
            accepted_contract_types: ch.accepted_contract_types || ['SFS_VIEWS', 'SFS_TIME'],
            min_partner_followers: ch.min_partner_followers || 0,
            min_views_target: ch.min_views_target || 0,
            bio: ch.bio || '',
        });
        setChannelEditModalOpen(true);
    };

    const saveChannelEdit = async () => {
        if (!channelToEdit) return;
        setChannelEditLoading(true);
        try {
            await api.put(`/promo/channels/${channelToEdit.id}`, channelEditData, {
                params: { sfs_user_id: sfsUser.id }
            });
            showToast('Canal actualizado correctamente', 'success');
            setChannelEditModalOpen(false);
            fetchMyChannels();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Error al actualizar canal', 'error');
        } finally {
            setChannelEditLoading(false);
        }
    };

    const toggleContractType = (type) => {
        const current = channelEditData.accepted_contract_types || [];
        if (current.includes(type)) {
            setChannelEditData(d => ({ ...d, accepted_contract_types: current.filter(t => t !== type) }));
        } else {
            setChannelEditData(d => ({ ...d, accepted_contract_types: [...current, type] }));
        }
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
                        className="bg-card/40 border border-white/5 rounded-xl p-4 group cursor-pointer hover:bg-card/60 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-foreground flex items-center gap-2">
                                    {ch.invite_link ? (
                                        <a href={ch.invite_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-purple-400 hover:underline flex items-center gap-1 transition-colors">
                                            {ch.name} <ExternalLink className="w-3 h-3" />
                                        </a>
                                    ) : ch.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ch.status === 'active' ? 'bg-green-500/20 text-green-400' : ch.status === 'verifying' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-400'}`}>
                                        {ch.status}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{(ch.followers || 0).toLocaleString()} subs</span>
                                    {ch.mode && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold uppercase">{ch.mode === 'both' ? 'SFS+PXP' : ch.mode}</span>}
                                    {ch.category && <span className="text-[10px] text-muted-foreground/70">{ch.category}</span>}
                                </div>
                                {ch.bio && <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-1">{ch.bio}</p>}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={(e) => { e.stopPropagation(); openChannelEdit(ch); }}
                                    className="p-2 bg-white/5 text-muted-foreground rounded-xl hover:bg-white/10 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                                    title="Editar Canal"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); openDeleteModal(ch); }}
                                    className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Eliminar Canal"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        {ch.min_partner_followers > 0 && (
                            <p className="text-[10px] text-muted-foreground/50 mt-2">Mín. partner: {ch.min_partner_followers.toLocaleString()} subs</p>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderProfile = () => (
        <div className="space-y-4">
            {/* Avatar y datos */}
            <div className="bg-gradient-to-br from-purple-900/40 to-black border border-white/5 rounded-2xl p-5 flex gap-4 items-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-2xl shrink-0">
                    {(sfsUser?.username || sfsUser?.full_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                    <p className="font-black text-foreground text-lg">@{sfsUser?.username || sfsUser?.full_name || 'usuario'}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Trust: {sfsUser?.trust_score ?? 100}/100</span>
                        {sfsUser?.is_agency_model && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">Modelo Agencia</span>}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-card/30 border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-foreground">{myProfile?.channels?.filter(c => c.status === 'active').length ?? myChannels.filter(c => c.status === 'active').length}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Canales Activos</p>
                </div>
                <div className="bg-card/30 border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-foreground">{myProfile?.completed_campaigns ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">SFS Completados</p>
                </div>
            </div>

            {/* Wallet */}
            <div className="bg-card/30 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-foreground flex items-center gap-2"><Wallet className="w-4 h-4 text-purple-400" /> Mi Billetera SFS</h3>
                    <button onClick={() => setWalletModalOpen(true)}
                        className="text-xs font-bold text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-400/50 px-3 py-1.5 rounded-xl transition-all">
                        Gestionar
                    </button>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground">${parseFloat(myProfile?.wallet_balance || 0).toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground">USD</span>
                </div>
                {myProfile?.payout_address && (
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-1 truncate">TON: {myProfile.payout_address}</p>
                )}
            </div>

            {/* Mis Canales */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground text-sm">Mis Canales</h3>
                    <button onClick={() => setAddChannelModalOpen(true)}
                        className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 border border-purple-500/30 px-2.5 py-1.5 rounded-xl transition-all">
                        <Plus className="w-3 h-3" /> Añadir
                    </button>
                </div>
                {renderMyChannels()}
            </div>

            {/* Cerrar Sesión */}
            <button onClick={handleLogout}
                className="w-full py-3 rounded-xl text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 mt-4">
                <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
        </div>
    );

    // ---- Estado y autoplay del carrusel de login (DEBE estar fuera de ifs) ----
    const [loginSlide, setLoginSlide] = useState(0);
    useEffect(() => {
        if (!needsLogin) return;
        const iv = setInterval(() => setLoginSlide(s => (s + 1) % 4), 4000);
        return () => clearInterval(iv);
    }, [needsLogin]);

    if (globalAuthLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-black">
                <Loader className="w-10 h-10 animate-spin text-purple-500" />
            </div>
        );
    }

    // ---- Pantalla de Login (Sin Sesión) ----
    const loginFeatures = [
        {
            emoji: '🤝',
            gradient: 'from-purple-600 to-fuchsia-600',
            title: 'SFS Automatizado',
            desc: 'Propone acuerdos por vistas, tiempo o suscriptores nuevos. Elige canales verificados del catálogo y deja que el bot publique y monitore todo.',
            stat: 'Por Vistas · Por Tiempo · Por Subs',
            statColor: 'text-purple-300',
        },
        {
            emoji: '📊',
            gradient: 'from-fuchsia-600 to-pink-600',
            title: 'Métricas + Categorías',
            desc: 'Cada canal muestra suscriptores reales, vistas/post y ER. Filtra por categoría: Modelaje, Memes, Cripto y más.',
            stat: 'ER • Vistas • Subs • Categoría',
            statColor: 'text-pink-300',
        },
        {
            emoji: '🛡️',
            gradient: 'from-pink-600 to-rose-600',
            title: 'Trust Score P2P',
            desc: 'Puntaje basado en reviews reales. El bot detecta fraudes automáticamente y penaliza a quienes borren posts antes de tiempo.',
            stat: 'Reviews verificadas en tiempo real',
            statColor: 'text-rose-300',
        },
        {
            emoji: '⚡',
            gradient: 'from-rose-600 to-orange-600',
            title: 'Límites Diarios Justos',
            desc: 'Plan Básico: 2 SFS/día · 1 canal. Modelos de agencia: 6 SFS/día. Planes Pro para mayor volumen próximamente.',
            stat: 'Free: 2 SFS/día · Agencia: 6/día',
            statColor: 'text-orange-300',
        },
    ];

    if (needsLogin) {
        const feat = loginFeatures[loginSlide];
        return (
            <div className="min-h-screen bg-[#030014] flex flex-col justify-between px-5 pt-10 pb-8 relative overflow-hidden">
                {/* Efectos de fondo */}
                <div className="absolute top-[-15%] left-[-15%] w-[450px] h-[450px] bg-purple-900/25 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-pink-900/20 rounded-full blur-[100px] pointer-events-none" style={{ animationDelay: '2s' }} />

                <div className="relative z-10 max-w-sm w-full mx-auto flex flex-col gap-6">
                    {/* Header compacto */}
                    <div className="flex items-center gap-3 justify-center">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.4)]">
                            <Send className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-xl font-black text-white leading-none">Promo Center</h1>
                            <p className="text-[11px] text-purple-300 mt-0.5">by Nebula Agency</p>
                        </div>
                    </div>

                    {/* Carrusel de features — altura fija, swipe táctil */}
                    <div className="relative"
                        onTouchStart={e => {
                            const touchStartX = e.touches[0].clientX;
                            e.currentTarget.dataset.touchStartX = touchStartX;
                        }}
                        onTouchEnd={e => {
                            const startX = parseFloat(e.currentTarget.dataset.touchStartX || 0);
                            const endX = e.changedTouches[0].clientX;
                            const diff = startX - endX;
                            if (Math.abs(diff) > 40) {
                                if (diff > 0) setLoginSlide(s => (s + 1) % loginFeatures.length);
                                else setLoginSlide(s => (s - 1 + loginFeatures.length) % loginFeatures.length);
                            }
                        }}
                    >
                        <div className="overflow-hidden rounded-3xl border border-white/10"
                            style={{ backdropFilter: 'blur(20px)' }}>
                            <div className="h-[220px] flex flex-col justify-between p-6"
                                style={{ background: 'linear-gradient(135deg, rgba(88,28,135,0.6) 0%, rgba(126,34,206,0.4) 100%)' }}>

                                {/* Patrón de fondo */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none rounded-3xl"
                                    style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 60%)' }} />

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="text-4xl mb-2 select-none">{feat.emoji}</div>
                                    <h2 className="text-base font-black text-white mb-1 leading-tight">{feat.title}</h2>
                                    <p className="text-xs text-white/75 leading-relaxed flex-1">{feat.desc}</p>
                                    <div className={`text-[10px] font-bold ${feat.statColor} uppercase tracking-wide mt-2`}>
                                        ✦ {feat.stat}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dots */}
                    <div className="flex justify-center gap-1.5">
                        {loginFeatures.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setLoginSlide(i)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === loginSlide ? 'w-6 bg-purple-400' : 'w-1.5 bg-white/20'}`}
                            />
                        ))}
                    </div>

                    {/* Widget de login */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <p className="text-xs text-gray-400 text-center mb-4">Inicia sesión para acceder al catálogo completo</p>
                        <div ref={telegramLoginRef} className="flex items-center justify-center" />
                        <p className="text-[10px] text-gray-600 mt-4 uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <ShieldCheck className="w-3 h-3" /> Acceso seguro vía Telegram
                        </p>
                    </div>

                    <p className="text-[11px] text-gray-700 text-center">
                        Al iniciar sesión, aceptas los términos del ecosistema.
                    </p>
                </div>
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
            {/* Modal Proponer SFS — 3 tipos de contrato */}
            <Modal isOpen={proposeModalOpen} onClose={() => setProposeModalOpen(false)}>
                <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <h2 className="text-lg font-black text-foreground">Proponer SFS</h2>

                    {/* Info canal destino */}
                    {proposeTarget && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 items-center">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-lg shrink-0">
                                {proposeTarget.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">{proposeTarget.name}</p>
                                <p className="text-xs text-muted-foreground">{(proposeTarget.followers || 0).toLocaleString()} subs · {(proposeTarget.engagement_rate || 0).toFixed(1)}% ER</p>
                            </div>
                        </div>
                    )}

                    {/* Tipo de contrato */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Tipo de Contrato</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'SFS_VIEWS', emoji: '👁️', label: 'Por Vistas', desc: 'Finaliza al alcanzar una meta de vistas' },
                                { id: 'SFS_TIME', emoji: '⏱️', label: 'Por Tiempo', desc: 'Dura una cantidad de horas fija' },
                                { id: 'SFS_FOLLOWERS', emoji: '👥', label: 'Por Subs', desc: 'Finaliza al ganar N seguidores' },
                            ].map(ct => (
                                <button key={ct.id} onClick={() => setProposeContractType(ct.id)}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${proposeContractType === ct.id ? 'border-purple-500 bg-purple-500/20 text-foreground' : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
                                    <span className="text-xl">{ct.emoji}</span>
                                    <span className="text-[10px] font-bold leading-tight">{ct.label}</span>
                                </button>
                            ))}
                        </div>
                        {/* Descripción contextual y ayuda ER */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 space-y-1">
                            {proposeContractType === 'SFS_VIEWS' && <>
                                <p>👁️ El post se eliminará automáticamente cuando alcance la meta de vistas acordada.</p>
                                {proposeTarget?.engagement_rate > 0 && proposeTarget?.avg_views > 0 && (
                                    <p className="text-blue-200">📊 Este canal promedia <strong>{(proposeTarget.avg_views || 0).toLocaleString()}</strong> vistas/post con {proposeTarget.engagement_rate}% ER.</p>
                                )}
                                {proposeViewsTarget > (proposeTarget?.avg_views || 0) * 2 && (
                                    <p className="text-amber-300">⚠️ La meta es alta para este canal. Considera bajarla.</p>
                                )}
                            </>}
                            {proposeContractType === 'SFS_TIME' && <>
                                <p>⏱️ Los posts permanecen publicados por el tiempo acordado, independientemente de las vistas.</p>
                            </>}
                            {proposeContractType === 'SFS_FOLLOWERS' && <>
                                <p>👥 El contrato finaliza cuando tu canal gana los seguidores acordados.</p>
                                {proposeTarget?.followers > 0 && (
                                    <p className="text-blue-200">📈 Con conversión típica del 5%, un post aquí puede generar ~<strong>{Math.round((proposeTarget.avg_views || 0) * 0.05)}</strong> nuevos subs.</p>
                                )}
                                {proposeFollowersTarget > (proposeTarget?.followers || 0) * 0.2 && (
                                    <p className="text-amber-300">⚠️ Meta alta respecto al tamaño del canal. Considera bajarla.</p>
                                )}
                            </>}
                        </div>
                    </div>

                    {/* Selector dinámico según tipo */}
                    <div className="space-y-3">
                        {proposeContractType === 'SFS_VIEWS' && (() => {
                            const maxViews = Math.max(500, Math.round(proposeTarget?.avg_views || 500));
                            const minViews = Math.min(100, Math.floor(maxViews * 0.1));
                            return (
                                <>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Meta de Vistas</label>
                                        <span className="text-lg font-black text-foreground">{(proposeViewsTarget || minViews).toLocaleString()}</span>
                                    </div>
                                    <input type="range"
                                        className="sfs-slider"
                                        min={minViews}
                                        max={maxViews}
                                        step={Math.max(50, Math.floor(maxViews / 20))}
                                        value={proposeViewsTarget || minViews}
                                        onChange={e => setProposeViewsTarget(parseInt(e.target.value))}
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground/60">
                                        <span>{minViews.toLocaleString()}</span>
                                        <span>máx. {maxViews.toLocaleString()} vistas</span>
                                    </div>
                                </>
                            );
                        })()}
                        {proposeContractType === 'SFS_TIME' && (
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Duración del Post</label>
                                    <span className="text-lg font-black text-foreground">
                                        {proposeDurationHours < 24 ? `${proposeDurationHours}h` : `${proposeDurationHours / 24}d`}
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[6, 12, 24, 48, 72, 96].map(h => (
                                        <button key={h}
                                            onClick={() => setProposeDurationHours(h)}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${proposeDurationHours === h ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
                                            {h < 24 ? `${h}h` : `${h / 24}d`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {proposeContractType === 'SFS_FOLLOWERS' && (() => {
                            const maxFollowers = Math.max(10, Math.round((proposeTarget?.followers || 1000) * 0.5));
                            const minFollowers = Math.min(5, Math.floor(maxFollowers * 0.02));
                            return (
                                <>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Meta de Seguidores</label>
                                        <span className="text-lg font-black text-foreground">{(proposeFollowersTarget || minFollowers).toLocaleString()}</span>
                                    </div>
                                    <input type="range"
                                        className="sfs-slider"
                                        min={minFollowers}
                                        max={maxFollowers}
                                        step={Math.max(1, Math.floor(maxFollowers / 20))}
                                        value={proposeFollowersTarget || minFollowers}
                                        onChange={e => setProposeFollowersTarget(parseInt(e.target.value))}
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground/60">
                                        <span>{minFollowers.toLocaleString()}</span>
                                        <span>máx. {maxFollowers.toLocaleString()} subs ({(proposeTarget?.followers || 0).toLocaleString()} total × 50%)</span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Tu canal */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Tu Canal</label>
                        {proposeMyChannels.length === 0 ? (
                            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">No tienes canales activos. Añade y espera la aprobación del admin.</p>
                        ) : (
                            <select value={proposeSelectedChannel} onChange={e => setProposeSelectedChannel(e.target.value)}
                                className="w-full bg-card/40 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-purple-500">
                                <option value="">— Selecciona un canal —</option>
                                {proposeMyChannels.map(ch => (
                                    <option key={ch.id} value={ch.id}>{ch.name} ({(ch.followers || 0).toLocaleString()} subs)</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Post plantilla */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Post a Publicar</label>
                        {proposeMyTemplates.length === 0 ? (
                            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                No tienes posts guardados. Reenvía un post a <span className="font-bold">@Nebula_sfs_bot</span> en Telegram para guardarlo como plantilla.
                            </p>
                        ) : (
                            <select value={proposeSelectedTemplate} onChange={e => setProposeSelectedTemplate(e.target.value)}
                                className="w-full bg-card/40 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-purple-500">
                                <option value="">— Selecciona una plantilla —</option>
                                {proposeMyTemplates.map((tpl, i) => (
                                    <option key={tpl.id} value={tpl.id}>
                                        {tpl.title ? `📝 ${tpl.title}` : `Post del ${tpl.created_at ? format(new Date(tpl.created_at), 'd MMM yyyy', { locale: es }) : `#${i + 1}`}`}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2 items-start">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300">El anunciante recibirá tu propuesta y deberá aceptarla. Una vez aceptada, el bot publicará los posts automáticamente.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setProposeModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-foreground bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                            Cancelar
                        </button>
                        <button onClick={submitProposeSFS} disabled={proposeLoading || !proposeSelectedChannel || !proposeSelectedTemplate}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                            {proposeLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {proposeLoading ? 'Enviando...' : 'Enviar Propuesta'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Editar Canal */}
            <Modal isOpen={channelEditModalOpen} onClose={() => setChannelEditModalOpen(false)}>
                <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <h2 className="text-lg font-black text-foreground">Editar Canal</h2>
                    {channelToEdit && <p className="text-xs text-muted-foreground -mt-2">{channelToEdit.name}</p>}

                    {/* Categoría */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Categoría</label>
                        <select value={channelEditData.category || ''} onChange={e => setChannelEditData(d => ({ ...d, category: e.target.value }))}
                            className="w-full bg-card/40 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-purple-500">
                            <option value="">Sin categoría</option>
                            {['Modelaje', 'Cine y Series', 'Memes', 'Cripto', 'Adultos', 'Otro'].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Modo */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Modo de Participación</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'sfs', emoji: '🤝', label: 'Solo SFS' },
                                { id: 'pxp', emoji: '💰', label: 'Solo PXP' },
                                { id: 'both', emoji: '✨', label: 'Ambos' },
                            ].map(m => (
                                <button key={m.id} onClick={() => setChannelEditData(d => ({ ...d, mode: m.id }))}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center ${channelEditData.mode === m.id ? 'border-purple-500 bg-purple-500/20 text-foreground' : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
                                    <span className="text-xl">{m.emoji}</span>
                                    <span className="text-[10px] font-bold">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tipos de contrato aceptados */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Contratos Aceptados</label>
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { id: 'SFS_VIEWS', label: 'Por Vistas' },
                                { id: 'SFS_TIME', label: 'Por Tiempo' },
                                { id: 'SFS_FOLLOWERS', label: 'Por Subs' },
                            ].map(ct => {
                                const active = (channelEditData.accepted_contract_types || []).includes(ct.id);
                                return (
                                    <button key={ct.id} onClick={() => toggleContractType(ct.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 text-muted-foreground hover:bg-white/10'}`}>
                                        {ct.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Límites mínimos */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Mín. Subs del Partner</label>
                            <input type="number" min="0"
                                value={channelEditData.min_partner_followers || 0}
                                onChange={e => setChannelEditData(d => ({ ...d, min_partner_followers: parseInt(e.target.value) || 0 }))}
                                className="w-full bg-card/40 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-purple-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Mín. Vistas Meta</label>
                            <input type="number" min="0"
                                value={channelEditData.min_views_target || 0}
                                onChange={e => setChannelEditData(d => ({ ...d, min_views_target: parseInt(e.target.value) || 0 }))}
                                className="w-full bg-card/40 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-purple-500" />
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Descripción del Canal</label>
                        <textarea rows={3} value={channelEditData.bio || ''} onChange={e => setChannelEditData(d => ({ ...d, bio: e.target.value }))}
                            placeholder="Cuéntanos sobre tu canal..."
                            className="w-full bg-card/40 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-purple-500 resize-none" />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setChannelEditModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-foreground bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                            Cancelar
                        </button>
                        <button onClick={saveChannelEdit} disabled={channelEditLoading}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {channelEditLoading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            {channelEditLoading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Wallet SFS */}
            <Modal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)}>
                <div className="p-6">
                    <h2 className="text-lg font-black text-foreground mb-4">Mi Billetera SFS</h2>
                    {sfsUser && <SfsWalletPanel sfsUser={{ ...sfsUser, wallet_balance: myProfile?.wallet_balance || 0 }}
                        onBalanceUpdate={(newBal) => setMyProfile(p => ({ ...p, wallet_balance: newBal }))} />}
                </div>
            </Modal>

            {renderStatsModal()}
            {renderReviewModal()}

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Promo Center</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Acuerdos seguros SFS y Publicidad PXP.</p>
                </div>
                <button
                    onClick={() => setProfilePanelOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-card/50 border border-white/10 rounded-xl text-xs font-bold text-foreground hover:bg-card/70 transition-all active:scale-95"
                >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-[10px] font-black">
                        {(sfsUser?.username || sfsUser?.full_name || '?')[0].toUpperCase()}
                    </div>
                    <span className="hidden sm:block">@{sfsUser?.username || sfsUser?.full_name || 'usuario'}</span>
                </button>
            </div>

            {/* Barra de acciones */}
            <div className="flex items-center justify-between mb-5 gap-3">
                <button onClick={() => setAddChannelModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-card/40 border border-white/10 text-foreground rounded-xl text-xs font-bold hover:bg-card/60 transition-all active:scale-95">
                    <Plus className="w-3.5 h-3.5" /> Añadir Canal
                </button>
                {limits && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        <span>SFS hoy:</span>
                        <span className="text-foreground">{limits.used ?? (limits.limit - limits.remaining)}/{limits.limit}</span>
                    </div>
                )}
            </div>

            {/* Carrusel de Banners */}
            <BannerCarousel sfsUser={sfsUser} />

            {/* Tabs */}
            <div className="flex bg-card/40 border border-white/5 p-1 rounded-xl mb-5 gap-0.5">
                {[['catalog', 'Catálogo'], ['sent', 'Enviadas'], ['received', 'Recibidas']].map(([tab, label]) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
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
                {activeTab === 'received' && renderCampaignList(receivedCampaigns, true)}
            </div>

            {/* Panel de Perfil SFS */}
            <SfsProfilePanel
                isOpen={profilePanelOpen}
                onClose={() => setProfilePanelOpen(false)}
                sfsUser={sfsUser}
                myProfile={myProfile}
                onLoadProfile={() => api.get(`/promo/profile/me?sfs_user_id=${sfsUser?.id}`).then(r => setMyProfile(r.data)).catch(() => { })}
                onLogout={handleLogout}
                onOpenAddChannel={() => { setProfilePanelOpen(false); setAddChannelModalOpen(true); }}
                onOpenChannelEdit={(ch) => { setProfilePanelOpen(false); openChannelEdit(ch); }}
                onOpenDeleteChannel={(ch) => { setProfilePanelOpen(false); setChannelToDelete(ch); setDeleteModalOpen(true); }}
            />
        </div>
    );
};

export default Promotions;
