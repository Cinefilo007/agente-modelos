import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Eye, TrendingUp, ShieldCheck, ExternalLink, Filter, Search, ChevronLeft, ChevronRight, Plus, Copy, AlertCircle, Info, MessageSquare, Loader, BarChart2, Star, Send, CheckCircle, X, Clock } from 'lucide-react';
import Joyride, { STATUS } from 'react-joyride';
import { Modal } from '../components/ui/Modal';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const Promotions = () => {
    const { user } = useAuth();
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

    const LIMIT = 5;

    // ---- Carga del catálogo ----
    const fetchCatalog = useCallback(async (page = 1) => {
        setLoadingCatalog(true);
        try {
            const res = await api.get(`/promo/channels/catalog?page=${page}&limit=${LIMIT}`);
            setCatalog(res.data.data || []);
            setTotalPages(res.data.total_pages || 1);
            setCurrentPage(page);
        } catch (err) {
            console.error('[Promo] Error cargando catálogo:', err);
        } finally {
            setLoadingCatalog(false);
        }
    }, []);

    // ---- Carga de campañas ----
    const fetchCampaigns = useCallback(async () => {
        if (!user?.id) return;
        setLoadingCampaigns(true);
        try {
            const [sentRes, recvRes] = await Promise.all([
                api.get(`/promo/campaigns/sent?model_id=${user.id}`),
                api.get(`/promo/campaigns/received?model_id=${user.id}`),
            ]);
            setSentCampaigns(sentRes.data || []);
            setReceivedCampaigns(recvRes.data || []);
        } catch (err) {
            console.error('[Promo] Error cargando campañas:', err);
        } finally {
            setLoadingCampaigns(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchCatalog(1);
        const hasSeenTour = localStorage.getItem('sfs_tour_seen');
        if (!hasSeenTour) setRunTour(true);
    }, [fetchCatalog]);

    useEffect(() => {
        if (activeTab === 'sent' || activeTab === 'received') {
            fetchCampaigns();
        }
    }, [activeTab, fetchCampaigns]);

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
                            <h3 className="text-sm font-bold text-foreground mb-4">Verificación Rápida y Segura</h3>
                            {[
                                ['1', 'Añade a', '@Nebula_sfs_bot', 'como Administrador de tu canal.'],
                                ['2', 'Dale', 'permisos exclusivos', 'para Publicar y Borrar mensajes.'],
                                ['3', 'Copia el siguiente código dando click y', 'envíalo como mensaje', 'en tu canal.'],
                            ].map(([num, text, bold, suffix]) => (
                                <div key={num} className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">{num}</span>
                                    <p className="text-sm text-muted-foreground">{text} <span className="font-bold text-foreground">{bold}</span> {suffix}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-black/50 border border-purple-500/30 rounded-xl p-4 flex flex-col items-center justify-center gap-2 relative group cursor-pointer"
                            onClick={() => {
                                const code = `/link_${user?.id?.replace(/-/g, '') || 'vincular'}`;
                                navigator.clipboard.writeText(code);
                                showToast("¡Código copiado al portapapeles!", "success");
                            }}>
                            <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">Tu código secreto</span>
                            <code className="text-xl font-mono text-white tracking-widest bg-white/5 py-1 px-3 rounded-lg border border-white/10">
                                /link_{user?.id?.replace(/-/g, '').substring(0, 8)}...
                            </code>
                            <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <span className="text-sm font-bold text-white flex items-center gap-2"><Copy className="w-4 h-4" /> Copiar Código</span>
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2 items-start">
                            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-300">Este método es <span className="font-bold text-amber-400">100% privado</span>. El bot detectará tu código, guardará el canal a tu nombre y borrará el mensaje al instante para que nadie más lo vea.</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setAddChannelModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-foreground bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                Cancelar
                            </button>
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
                        <div key={channel.id} className={`bg-card/40 border border-white/5 rounded-2xl p-4 flex flex-col space-y-4 transition-all hover:bg-card/60 ${index === 0 ? 'tour-step-2' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        {channel.name}
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
                                <span className="text-xs text-muted-foreground">
                                    ~<span className="text-foreground font-medium">{(channel.avg_views || 0).toLocaleString()}</span> vistas/post
                                </span>
                                <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95">
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
                            <span className="text-xs font-bold">{statusLabel[c.status] || c.status}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

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

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Promo Center</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Acuerdos seguros SFS y Publicidad PXP.</p>
                </div>
                <button onClick={() => setAddChannelModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-card/40 border border-white/10 text-foreground rounded-xl text-xs font-bold hover:bg-card/60 transition-all active:scale-95">
                    <Plus className="w-3.5 h-3.5" /> Añadir Canal
                </button>
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

            {/* Tabs */}
            <div className="flex bg-card/40 border border-white/5 p-1 rounded-xl mb-5">
                {[['catalog', 'Catálogo'], ['sent', 'Enviadas'], ['received', 'Recibidas']].map(([tab, label]) => (
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
            </div>
        </div>
    );
};

export default Promotions;
