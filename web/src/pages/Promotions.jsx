import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, BarChart2, Star, Send, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import Joyride, { STATUS } from 'react-joyride';

const Promotions = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('catalog'); // 'catalog', 'sent', 'received'

    // React Joyride State
    const [runTour, setRunTour] = useState(false);

    const tourSteps = [
        {
            target: '.tour-step-1',
            content: '¡Bienvenida al SFS Automatizado! Aquí podrás intercambiar publicidad con otras modelos, asegurando visualizaciones reales garantizadas.',
            disableBeacon: true,
        },
        {
            target: '.tour-step-2',
            content: 'Este es el Catálogo de canales aprobados. Todas las chicas aquí han sido verificadas en la red. Verás sus seguidores, vistas promedio y rating.',
        },
        {
            target: '.tour-step-3',
            content: 'Fíjate en el Trust Score. A mayor puntaje (🎖️ Top Partner), más confiable es la modelo y menos riesgo hay de que borre tu post anticipadamente.',
        },
        {
            target: '.tour-step-4',
            content: 'Antes de enviar tu primera propuesta, VE AL @AgenciaPromoBot EN TELEGRAM y reenvíale el mensaje publicitario (con tu foto y emojis) que quieres usar.',
        }
    ];

    useEffect(() => {
        // Lanzador del tour solo la primera vez 
        const hasSeenTour = localStorage.getItem('sfs_tour_seen');
        if (!hasSeenTour) {
            setRunTour(true);
        }
    }, []);

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(status)) {
            setRunTour(false);
            localStorage.setItem('sfs_tour_seen', 'true');
        }
    };

    // Mock Data para probar el MVP visual
    const [channels, setChannels] = useState([
        { id: '1', name: 'Canal de Euryale VIP', followers: 15400, avg_views: 3200, er: 20.7, trust_score: 98, badges: ['Top Partner'] },
        { id: '2', name: 'Secrets of Anna', followers: 8900, avg_views: 4500, er: 50.5, trust_score: 100, badges: ['Fast Reacher'] },
        { id: '3', name: 'Luna Hub', followers: 25000, avg_views: 1200, er: 4.8, trust_score: 60, badges: [] },
    ]);

    const renderCatalog = () => (
        <div className="space-y-4">
            {channels.map((channel, index) => (
                <div key={channel.id} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col space-y-4 ${index === 0 ? 'tour-step-2' : ''}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                {channel.name}
                                {channel.trust_score >= 90 && <ShieldCheck className="w-4 h-4 text-green-400" />}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {channel.followers.toLocaleString()} Subs
                                </span>
                                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full flex items-center gap-1">
                                    <BarChart2 className="w-3 h-3" /> {channel.er}% ER
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end tour-step-3">
                            <span className={`text-sm font-bold flex items-center gap-1 ${channel.trust_score >= 80 ? 'text-green-400' : 'text-yellow-500'}`}>
                                <Star className="w-4 h-4 fill-current" /> {channel.trust_score} Trust
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {channel.badges.map(badge => (
                            <span key={badge} className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs rounded-md border border-yellow-500/30">
                                🏅 {badge}
                            </span>
                        ))}
                    </div>

                    <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                        <div className="text-sm text-zinc-400">
                            Promedio: <span className="text-white font-medium">{channel.avg_views.toLocaleString()} vistas</span>
                        </div>
                        <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                            <Send className="w-4 h-4" /> Proponer SFS
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="pb-24 pt-4 px-4 max-w-lg mx-auto min-h-screen bg-black text-white tour-step-1">
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous={true}
                showSkipButton={true}
                showProgress={true}
                callback={handleJoyrideCallback}
                styles={{
                    options: {
                        arrowColor: '#18181b', // zinc-900
                        backgroundColor: '#18181b',
                        overlayColor: 'rgba(0, 0, 0, 0.8)',
                        primaryColor: '#c026d3', // fuchsia-600
                        textColor: '#ffffff',
                        zIndex: 1000,
                    },
                    tooltipContainer: {
                        textAlign: 'left',
                        fontSize: '14px',
                        padding: '10px'
                    },
                    buttonNext: {
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                    },
                    buttonBack: {
                        marginRight: 10,
                        color: '#a1a1aa' // zinc-400
                    },
                    buttonSkip: {
                        color: '#a1a1aa'
                    }
                }}
            />

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Promo Center</h1>
                <p className="text-sm text-zinc-400 mt-1">Acuerdos seguros SFS y Publicidad PXP con impacto real.</p>
            </div>

            {/* Empty State Edu - If no templates (Simulated) */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 mb-6 flex gap-4 items-start tour-step-4">
                <div className="p-3 bg-purple-500/20 rounded-full text-purple-400">
                    <Send className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-white">¿Aún no tienes un post listo?</h4>
                    <p className="text-sm text-zinc-300 mt-1 mb-3">Las modelos deben ver tu contenido antes de aceptar. Ve a Telegram y reenvíale tu mejor foto y texto a nuestro Promo Bot.</p>
                    <a href="https://t.me/AgenciaPromoBot" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300">
                        Ir al Bot 👉
                    </a>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-zinc-900 p-1 rounded-xl mb-6">
                <button
                    onClick={() => setActiveTab('catalog')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'catalog' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}
                >
                    Catálogo
                </button>
                <button
                    onClick={() => setActiveTab('sent')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'sent' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}
                >
                    Enviadas
                </button>
                <button
                    onClick={() => setActiveTab('received')}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'received' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}
                >
                    Recibidas <span className="bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">2</span>
                </button>
            </div>

            {/* Content Area */}
            <div>
                {activeTab === 'catalog' && renderCatalog()}

                {activeTab === 'sent' && (
                    <div className="text-center py-12 text-zinc-500">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No has enviado propuestas recientes.</p>
                    </div>
                )}

                {activeTab === 'received' && (
                    <div className="text-center py-12 text-zinc-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Tus propuestas recibidas aparecerán aquí.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Promotions;
