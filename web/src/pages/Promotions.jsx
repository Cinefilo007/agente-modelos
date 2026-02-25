import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, BarChart2, Star, Send, ShieldCheck, Clock, CheckCircle, Plus, ChevronLeft, ChevronRight, X, AlertCircle, Loader } from 'lucide-react';
import Joyride, { STATUS } from 'react-joyride';
import { Modal } from '../components/ui/Modal';

const CHANNELS_PER_PAGE = 5;

const Promotions = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('catalog');
    const [runTour, setRunTour] = useState(false);
    const [showAddChannelModal, setShowAddChannelModal] = useState(false);
    const [addChannelStep, setAddChannelStep] = useState(1); // 1: instrucciones, 2: verificar, 3: resultado
    const [channelInput, setChannelInput] = useState('');
    const [verifyStatus, setVerifyStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [verifyMessage, setVerifyMessage] = useState('');

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [channels] = useState([
        { id: '1', name: 'Canal de Euryale VIP', followers: 15400, avg_views: 3200, er: 20.7, trust_score: 98, badges: ['Top Partner'] },
        { id: '2', name: 'Secrets of Anna', followers: 8900, avg_views: 4500, er: 50.5, trust_score: 100, badges: ['Fast Reacher'] },
        { id: '3', name: 'Luna Hub', followers: 25000, avg_views: 1200, er: 4.8, trust_score: 60, badges: [] },
        { id: '4', name: 'Dark Rose Premium', followers: 12300, avg_views: 2100, er: 17.1, trust_score: 84, badges: [] },
        { id: '5', name: 'Celestia Exclusivo', followers: 5600, avg_views: 890, er: 15.9, trust_score: 92, badges: ['Top Partner'] },
        { id: '6', name: 'NightBloom VIP', followers: 9100, avg_views: 1400, er: 15.4, trust_score: 77, badges: [] },
    ]);

    const totalPages = Math.ceil(channels.length / CHANNELS_PER_PAGE);
    const paginatedChannels = channels.slice((currentPage - 1) * CHANNELS_PER_PAGE, currentPage * CHANNELS_PER_PAGE);

    const tourSteps = [
        { target: '.tour-step-1', content: '¡Bienvenida al SFS Automatizado! Intercambia publicidad con otras modelos con visualizaciones reales garantizadas.', disableBeacon: true },
        { target: '.tour-step-2', content: 'Catálogo de canales verificados. Verás seguidores reales, vistas promedio y la calificación de calidad.' },
        { target: '.tour-step-3', content: 'El Trust Score indica qué tan confiable es la modelo. A más alto, menor riesgo de que borre tu post antes de tiempo.' },
        { target: '.tour-step-4', content: 'Antes de proponer un SFS, reenvíale tu post publicitario (foto + texto + emojis) directamente a @Nebula_sfs_bot en Telegram.' },
    ];

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('sfs_tour_seen');
        if (!hasSeenTour) setRunTour(true);
    }, []);

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTour(false);
            localStorage.setItem('sfs_tour_seen', 'true');
        }
    };

    const handleVerifyChannel = async () => {
        if (!channelInput.trim()) return;
        setVerifyStatus('loading');
        // TODO: Conectar al endpoint real /api/promo/channels/verify
        setTimeout(() => {
            // Mock: simular respuesta del servidor
            if (channelInput.includes('error')) {
                setVerifyStatus('error');
                setVerifyMessage('No se pudo confirmar que @Nebula_sfs_bot sea administrador de ese canal. Asegúrate de haberlo añadido con permisos para publicar y borrar mensajes.');
            } else {
                setVerifyStatus('success');
                setVerifyMessage('¡Canal verificado! Quedará en revisión hasta que nuestro equipo lo apruebe. Te notificaremos por Telegram.');
            }
            setAddChannelStep(3);
        }, 1500);
    };

    const resetModal = () => {
        setAddChannelStep(1);
        setChannelInput('');
        setVerifyStatus(null);
        setVerifyMessage('');
    };

    // ----------- RENDER DEL MODAL ----------
    const renderAddChannelModal = () => (
        <Modal isOpen={showAddChannelModal} onClose={() => { setShowAddChannelModal(false); resetModal(); }}>
            <div className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-1">Añadir mi Canal</h2>
                <p className="text-xs text-muted-foreground mb-5">Paso {addChannelStep} de 3</p>

                {/* Barra de progreso */}
                <div className="flex gap-1 mb-6">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${addChannelStep >= s ? 'bg-primary' : 'bg-white/10'}`} style={{ backgroundColor: addChannelStep >= s ? 'hsl(var(--primary))' : undefined }} />
                    ))}
                </div>

                {/* Paso 1: Instrucciones */}
                {addChannelStep === 1 && (
                    <div className="space-y-4">
                        <div className="bg-card/40 border border-white/10 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-black">1</span>
                                <p className="text-sm text-foreground">Abre Telegram y busca <span className="font-bold text-primary">@Nebula_sfs_bot</span></p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-black">2</span>
                                <p className="text-sm text-foreground">Ve a tu canal → Configuración → Administradores → Añadir admininstrador</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-black">3</span>
                                <p className="text-sm text-foreground">Activa los permisos de <span className="font-bold">Publicar mensajes</span> y <span className="font-bold">Borrar mensajes</span>.</p>
                            </div>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2 items-start">
                            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-300">Para <span className="font-bold">canales privados</span> (sin @username), puedes usar el link de invitación privado o el ID numérico del canal (obtenible con <span className="font-bold">@userinfobot</span>).</p>
                        </div>
                        <button onClick={() => setAddChannelStep(2)} className="w-full py-3 rounded-xl text-sm font-bold text-foreground bg-primary/10 border border-white/10 hover:bg-primary/20 transition-all">
                            Ya lo añadí → Continuar
                        </button>
                    </div>
                )}

                {/* Paso 2: Verificar */}
                {addChannelStep === 2 && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-muted-foreground mb-2 block">@username del canal, ID numérico o link de invitación privado</label>
                            <input
                                type="text"
                                value={channelInput}
                                onChange={e => setChannelInput(e.target.value)}
                                placeholder="@micanal | -1001234567890 | t.me/+xyz"
                                className="w-full bg-card/40 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-white/30 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleVerifyChannel}
                            disabled={!channelInput.trim() || verifyStatus === 'loading'}
                            className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                        >
                            {verifyStatus === 'loading' ? <><Loader className="w-4 h-4 animate-spin" /> Verificando...</> : 'Verificar Canal'}
                        </button>
                    </div>
                )}

                {/* Paso 3: Resultado */}
                {addChannelStep === 3 && (
                    <div className="space-y-4 text-center">
                        {verifyStatus === 'success' ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                </div>
                                <p className="font-bold text-foreground">¡Solicitud enviada!</p>
                                <p className="text-sm text-muted-foreground">{verifyMessage}</p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                                    <X className="w-8 h-8 text-red-400" />
                                </div>
                                <p className="font-bold text-foreground">Verificación fallida</p>
                                <p className="text-sm text-muted-foreground">{verifyMessage}</p>
                                <button onClick={() => setAddChannelStep(2)} className="w-full py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10">
                                    Intentar de nuevo
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );

    // ----------- RENDER DEL CATÁLOGO -----------
    const renderCatalog = () => (
        <div className="space-y-4">
            {paginatedChannels.map((channel, index) => (
                <div key={channel.id} className={`bg-card/40 border border-white/5 rounded-2xl p-4 flex flex-col space-y-4 transition-all hover:bg-card/60 ${index === 0 ? 'tour-step-2' : ''}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                {channel.name}
                                {channel.trust_score >= 90 && <ShieldCheck className="w-4 h-4 text-green-400" />}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {channel.followers.toLocaleString()}
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

                    {channel.badges.length > 0 && (
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
                            ~<span className="text-foreground font-medium">{channel.avg_views.toLocaleString()}</span> vistas/post
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
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>
                    <span className="text-xs text-muted-foreground">
                        Página <span className="text-foreground font-bold">{currentPage}</span> de <span className="text-foreground font-bold">{totalPages}</span>
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        Siguiente <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto min-h-screen tour-step-1">
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous showSkipButton showProgress
                callback={handleJoyrideCallback}
                styles={{
                    options: {
                        arrowColor: 'hsl(240 10% 5%)',
                        backgroundColor: 'hsl(240 10% 5%)',
                        overlayColor: 'rgba(0,0,0,0.75)',
                        primaryColor: '#c026d3',
                        textColor: 'hsl(0 0% 98%)',
                        zIndex: 1000,
                    },
                    buttonNext: { borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' },
                    buttonBack: { marginRight: 10, color: '#a1a1aa' },
                    buttonSkip: { color: '#a1a1aa' },
                }}
            />

            {renderAddChannelModal()}

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Promo Center</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Acuerdos seguros SFS y Publicidad PXP.</p>
                </div>
                <button
                    onClick={() => setShowAddChannelModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-white/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all active:scale-95"
                >
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
                    <p className="text-xs text-muted-foreground mt-0.5 mb-2">Reenvíale tu mejor foto/video con emojis a <span className="font-bold text-foreground">@Nebula_sfs_bot</span> en Telegram. Él lo guardará para usar en tus campañas.</p>
                    <a href="https://t.me/Nebula_sfs_bot" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300">
                        Ir al Bot @Nebula_sfs_bot 👉
                    </a>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-card/40 border border-white/5 p-1 rounded-xl mb-5">
                {['catalog', 'sent', 'received'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                    >
                        {tab === 'catalog' && 'Catálogo'}
                        {tab === 'sent' && 'Enviadas'}
                        {tab === 'received' && (<>Recibidas <span className="bg-pink-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">2</span></>)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div>
                {activeTab === 'catalog' && renderCatalog()}

                {activeTab === 'sent' && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No has enviado propuestas recientes.</p>
                    </div>
                )}

                {activeTab === 'received' && (
                    <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Tus propuestas recibidas aparecerán aquí.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Promotions;
