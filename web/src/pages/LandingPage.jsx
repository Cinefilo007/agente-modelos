/* eslint-disable react/no-unknown-property */
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import {
    Activity, Cpu, UserCheck, CircleDollarSign, Users,
    TrendingUp, Calendar, Sparkles, BarChart3, Quote, Share2
} from 'lucide-react';

const LandingPage = () => {
    const { loginWithTelegram } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const telegramWrapperRef = useRef(null);
    const [scrolled, setScrolled] = useState(false);
    const [viewMode, setViewMode] = useState(null); // 'fan' or 'creator' or null
    const [modelsPreview, setModelsPreview] = useState([]);

    // Get models for Fan Landing
    useEffect(() => {
        if (viewMode === 'fan') {
            const fetchModels = async () => {
                try {
                    const res = await api.get('/profile/models/explore?filter=top');
                    setModelsPreview(res.data.slice(0, 4));
                } catch (err) {
                    console.error("Error fetching preview models:", err);
                }
            };
            fetchModels();
        }
    }, [viewMode]);

    // Scroll effect for navbar
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const [botUsername, setBotUsername] = useState(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get('/config/bot-username');
                setBotUsername(res.data.username);
            } catch (err) {
                setBotUsername('AgenteNebulaIA_bot');
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        if (!botUsername || !viewMode) return;

        const timeoutId = setTimeout(() => {
            if (telegramWrapperRef.current) {
                telegramWrapperRef.current.innerHTML = "";
                const script = document.createElement('script');
                script.src = "https://telegram.org/js/telegram-widget.js?22";
                script.setAttribute('data-telegram-login', botUsername);
                script.setAttribute('data-size', 'large');
                script.setAttribute('data-radius', '12');
                script.setAttribute('data-request-access', 'write');
                script.setAttribute('data-userpic', 'false');
                script.setAttribute('data-onauth', 'onTelegramAuth(user)');
                script.async = true;
                telegramWrapperRef.current.appendChild(script);
            }
        }, 300);

        window.onTelegramAuth = async (user) => {
            try {
                localStorage.setItem('intendedRole', viewMode);
                await loginWithTelegram(user);
                navigate('/');
            }
            catch (error) {
                showToast(error.response?.data?.detail || "Login failed", "error");
            }
        };
        return () => {
            window.onTelegramAuth = undefined;
            clearTimeout(timeoutId);
        }
    }, [loginWithTelegram, navigate, botUsername, viewMode]);

    const scrollToLogin = () => {
        telegramWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // --- Role Selector View ---
    if (!viewMode) {
        return (
            <div className="min-h-screen bg-[#02010a] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[1000px] h-[1000px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/15 rounded-full blur-[150px] animate-pulse delay-1000"></div>
                </div>

                <div className="relative z-10 max-w-4xl w-full text-center space-y-12">
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight">
                            BIENVENIDO A <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500">
                                NEBULA AGENCY
                            </span>
                        </h1>
                        <p className="text-xl text-gray-400 font-medium">Selecciona tu experiencia para continuar</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 mt-12">
                        <div onClick={() => setViewMode('fan')}
                            className="group p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 hover:border-purple-500/50 hover:bg-white/[0.06] transition-all cursor-pointer relative overflow-hidden text-left"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Heart size={120} className="text-purple-500" />
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-8 border border-purple-500/30">
                                <Heart className="w-8 h-8 text-purple-400" />
                            </div>
                            <h3 className="text-3xl font-black mb-4">Soy Fan</h3>
                            <p className="text-gray-400 leading-relaxed mb-8">
                                Descubre modelos exclusivas, verificadas y listas para complacerte en un entorno seguro y divertido.
                            </p>
                            <button className="flex items-center gap-2 text-purple-400 font-black uppercase tracking-widest text-xs group-hover:gap-4 transition-all">
                                Explorar Modelos <ChevronRight size={16} />
                            </button>
                        </div>

                        <div onClick={() => setViewMode('creator')}
                            className="group p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.06] transition-all cursor-pointer relative overflow-hidden text-left"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Star size={120} className="text-pink-500" />
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-pink-500/20 flex items-center justify-center mb-8 border border-pink-500/30">
                                <Star className="w-8 h-8 text-pink-400" />
                            </div>
                            <h3 className="text-3xl font-black mb-4">Soy Creadora</h3>
                            <p className="text-gray-400 leading-relaxed mb-8">
                                Monetiza tu contenido con IA, seguridad total y las herramientas más potentes del mercado en Telegram.
                            </p>
                            <button className="flex items-center gap-2 text-pink-400 font-black uppercase tracking-widest text-xs group-hover:gap-4 transition-all">
                                Empezar mi Imperio <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    <button onClick={() => navigate('/login')} className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] hover:text-white transition-colors">
                        Ya tengo una cuenta
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#02010a] text-white font-sans selection:bg-purple-500 selection:text-white overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#02010a]">
                <div className={`absolute top-[-10%] left-[-10%] w-[1000px] h-[1000px] rounded-full blur-[150px] animate-pulse duration-[8s] ${viewMode === 'fan' ? 'bg-purple-600/20' : 'bg-indigo-600/20'}`}></div>
                <div className={`absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full blur-[150px] animate-pulse duration-[10s] delay-1000 ${viewMode === 'fan' ? 'bg-pink-600/15' : 'bg-purple-600/15'}`}></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay brightness-100 contrast-150"></div>
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setViewMode(null)}>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(124,58,237,0.5)] ${viewMode === 'fan' ? 'from-purple-600 to-pink-600' : 'from-indigo-600 to-purple-600'}`}>
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            NEBULA<span className={viewMode === 'fan' ? 'text-pink-500' : 'text-purple-500'}>.AGENCY</span>
                        </span>
                    </div>
                    <div className="hidden md:flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                        {viewMode === 'fan' ? (
                            <>
                                <a href="#models" className="hover:text-white transition-colors">Modelos</a>
                                <a href="#casino" className="hover:text-white transition-colors">Casino</a>
                                <a href="#escrow" className="hover:text-white transition-colors">Seguridad</a>
                                <a href="#wallet" className="hover:text-white transition-colors">Billetera</a>
                            </>
                        ) : (
                            <>
                                <a href="#vision" className="hover:text-white transition-colors">Visión</a>
                                <a href="#ia" className="hover:text-white transition-colors">Tecnología</a>
                                <a href="#economy" className="hover:text-white transition-colors">Economía</a>
                                <a href="#safety" className="hover:text-white transition-colors">Seguridad</a>
                            </>
                        )}
                    </div>
                    <button onClick={scrollToLogin} className={`px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold text-xs uppercase tracking-widest backdrop-blur-md ${viewMode === 'fan' ? 'hover:border-pink-500/50' : 'hover:border-purple-500/50'}`}>
                        Entrar
                    </button>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="relative min-h-[90vh] flex items-center justify-center pt-20 px-4 z-10">
                <div className="container mx-auto text-center space-y-10">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-opacity-10 backdrop-blur-md animate-fade-in-up ${viewMode === 'fan' ? 'border-pink-500/20 bg-pink-900/10 text-pink-300' : 'border-purple-500/20 bg-purple-900/10 text-purple-300'}`}>
                        <span className={`status-dot w-2 h-2 rounded-full animate-pulse ${viewMode === 'fan' ? 'bg-pink-500' : 'bg-purple-500'}`}></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                            {viewMode === 'fan' ? 'Experiencia VIP Garantizada' : 'Telegram en Esteroides'}
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black leading-tight tracking-tighter max-w-5xl mx-auto">
                        {viewMode === 'fan' ? (
                            <>Conecta con el <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">Top de Modelos</span></>
                        ) : (
                            <>Sacamos el jugo a <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">Telegram como nadie</span></>
                        )}
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        {viewMode === 'fan'
                            ? "Descubre un ecosistema exclusivo donde la belleza se une a la seguridad. Modelos reales, reseñas verificadas y premios increíbles te esperan."
                            : "No inventamos la rueda, solo la hacemos girar a la velocidad de la luz. Potenciamos cada funcionalidad nativa para crear el ecosistema de monetización definitiva."}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
                        <button onClick={scrollToLogin} className={`px-10 py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] ${viewMode === 'fan' ? 'hover:bg-pink-600 hover:text-white' : 'hover:bg-purple-600 hover:text-white'}`}>
                            {viewMode === 'fan' ? 'Explorar Ahora' : 'Empezar Imperio'}
                        </button>
                        {viewMode === 'creator' && (
                            <button onClick={() => window.open('https://t.me/' + botUsername, '_blank')} className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all backdrop-blur-sm flex items-center justify-center gap-3">
                                <Bot className="w-5 h-5" /> Probar Demo
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* --- GROWTH TICKER (CREATORS ONLY) --- */}
            {viewMode === 'creator' && (
                <div className="relative z-10 py-6 bg-purple-600/5 border-y border-purple-500/10 overflow-hidden whitespace-nowrap">
                    <div className="flex animate-marquee gap-12 text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">
                        <span>🚀 +2,400% Crecimiento Promedio</span>
                        <span>💎 $14,200 Pagados Hoy</span>
                        <span>📈 1.2M Impresiones Semanales</span>
                        <span>🛡️ 0 Baneos Reportados</span>
                        <span>🔥 +500 Solicitudes Nuevas</span>
                        <span>🚀 +2,400% Crecimiento Promedio</span>
                        <span>💎 $14,200 Pagados Hoy</span>
                        <span>📈 1.2M Impresiones Semanales</span>
                        <span>🛡️ 0 Baneos Reportados</span>
                        <span>🔥 +500 Solicitudes Nuevas</span>
                    </div>
                </div>
            )}
            {viewMode === 'fan' && (
                <section className="py-24 relative z-10" id="models">
                    <div className="container mx-auto px-6">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                            <div className="space-y-4">
                                <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Nuestras Estrellas</h2>
                                <p className="text-gray-500 max-w-xl">
                                    Modelos verificadas biográficamente con perfiles 100% reales.
                                    Explora nuestro <span className="text-pink-500 font-bold">Feed General</span> para ver los posts de todas nuestras modelos y sumérgete en la diversión.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {modelsPreview.length > 0 ? (
                                modelsPreview.map((m) => (
                                    <div key={m.id} className="group relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/5 cursor-pointer" onClick={() => navigate(`/${m.username}`)}>
                                        <img src={m.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop'} alt={m.artistic_name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                                        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2 translate-y-2 group-hover:translate-y-0 transition-transform">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-lg">{m.artistic_name || m.username}</h4>
                                                {m.is_verified && <Check className="w-4 h-4 text-pink-400 bg-white rounded-full p-0.5" />}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                <span className="text-xs font-bold text-white/80">{m.reputation_score || 5.0}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                [1, 2, 3, 4].map(i => (
                                    <div key={i} className="aspect-[3/4] rounded-3xl bg-white/5 animate-pulse border border-white/5"></div>
                                ))
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* --- FEATURES SECTION --- */}
            <section className="py-32 relative z-10 bg-black/40" id={viewMode === 'fan' ? 'casino' : 'ia'}>
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
                                {viewMode === 'fan' ? (
                                    <>Juega y Gana en el <br /><span className="text-pink-500 text-glow">Casino VIP</span>.</>
                                ) : (
                                    <>IA que <span className="text-purple-500 text-glow">Vende</span>, <br />Ecosistema que <span className="text-indigo-500 text-glow">Protege</span>.</>
                                )}
                            </h2>
                            <p className="text-lg text-gray-500 leading-relaxed">
                                {viewMode === 'fan'
                                    ? "Participa en juegos exclusivos diseñados por tus modelos favoritas. Desde ruletas hasta cofres de la suerte, gana servicios VIP, contenido privado y experiencias únicas mientras te diviertes."
                                    : "Telegram está recrudeciendo sus políticas sobre el contenido para adultos, cerrando canales, grupos y cuentas todos los días. Nuestra plataforma es la solución definitiva. Todo tu negocio protegido y operando desde un entorno seguro anti-baneos."}
                            </p>
                            <div className="grid sm:grid-cols-2 gap-8 pt-8">
                                <div className="space-y-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${viewMode === 'fan' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                        {viewMode === 'fan' ? <Coins className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
                                    </div>
                                    <h4 className="font-bold">{viewMode === 'fan' ? 'Premios Únicos' : 'Chat Manager IA'}</h4>
                                    <p className="text-sm text-gray-500 italic">{viewMode === 'fan' ? 'Contenido que el dinero no puede comprar.' : 'Cierra ventas 24/7 de forma automatizada.'}</p>
                                </div>
                                <div className="space-y-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${viewMode === 'fan' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                        {viewMode === 'fan' ? <Zap className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                                    </div>
                                    <h4 className="font-bold">{viewMode === 'fan' ? 'Soporte 24/7' : 'Agente de Crecimiento IA'}</h4>
                                    <p className="text-sm text-gray-500 italic">{viewMode === 'fan' ? 'Atención personalizada para tus dudas.' : 'Estrategias personalizadas para tu perfil.'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            <Card icon={viewMode === 'fan' ? UserCheck : Calendar} title={viewMode === 'fan' ? "Reviews Reales" : "Programación Inteligente"} desc={viewMode === 'fan' ? "Lee testimonios de otros usuarios verificados." : "Agenda tus posts y contenido 24/7 sin esfuerzo."} color={viewMode === 'fan' ? 'pink' : 'purple'} />
                            <Card icon={viewMode === 'fan' ? Shield : Sparkles} title={viewMode === 'fan' ? "Pagos Escrow" : "IA Photo Enhancer"} desc={viewMode === 'fan' ? "Tu dinero seguro hasta que recibas el servicio." : "Mejora y retoca tus fotos con IA en segundos."} color={viewMode === 'fan' ? 'pink' : 'purple'} />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- REPUTATION SECTION --- */}
            <section className="py-32 relative z-10 bg-white/[0.01]">
                <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-24 items-center">
                    <div className="order-2 lg:order-1 relative">
                        <div className="absolute inset-0 bg-purple-600/10 blur-[100px] rounded-full"></div>
                        <div className="relative p-8 bg-black/60 border border-white/5 rounded-3xl backdrop-blur-xl space-y-6">
                            <div className="flex gap-4 items-center text-left">
                                <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 w-32 bg-gray-800 rounded animate-pulse"></div>
                                    <div className="h-3 w-16 bg-gray-900 rounded animate-pulse"></div>
                                </div>
                            </div>
                            <div className="space-y-3 text-left">
                                <p className="text-sm text-gray-500 italic">"Excelente trato y contenido de calidad. 100% recomendada."</p>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2 space-y-8">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Reputación es Poder</h2>
                        <p className="text-lg text-gray-500 leading-relaxed">
                            {viewMode === 'fan'
                                ? "Nuestro sistema de reseñas asegura que cada moneda invertida valga la pena. Transparencia total en cada perfil."
                                : "Un historial de confianza atrae a los mejores clientes. Construye tu marca con el respaldo de Nebula."}
                        </p>
                        <div className="flex flex-col gap-4 pt-4">
                            <span className="flex items-center gap-3 text-sm font-bold text-gray-400"><UserCheck className="w-5 h-5 text-green-500" /> Verificación Biométrica</span>
                            <span className="flex items-center gap-3 text-sm font-bold text-gray-400"><MessageSquare className="w-5 h-5 text-blue-500" /> Reseñas de Clientes Reales</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CREATOR ONLY: COMPARISON --- */}
            {viewMode === 'creator' && (
                <section className="py-32 relative z-10 bg-white/[0.02]" id="vision">
                    <div className="container mx-auto px-6">
                        <div className="max-w-5xl mx-auto space-y-16">
                            <div className="text-center space-y-4">
                                <h2 className="text-4xl font-black uppercase tracking-widest text-glow">Nebula vs Tradicional</h2>
                                <p className="text-gray-500">Eliminamos tus puntos de dolor para que solo te preocupes de brillar.</p>
                            </div>

                            <div className="border border-white/5 bg-black/40 rounded-[2rem] overflow-hidden backdrop-blur-3xl shadow-2xl">
                                <div className="grid grid-cols-12 p-8 border-b border-white/5 font-black text-[10px] uppercase tracking-[0.2em] text-gray-500">
                                    <div className="col-span-4">Punto de Dolor</div>
                                    <div className="col-span-4 text-center">Modo Tradicional</div>
                                    <div className="col-span-4 text-center text-purple-500 font-glow">Efecto Nebula</div>
                                </div>

                                <TableRow pain="Mensajes Agobiantes" trad="Responder 500 DMs a mano. Agotamiento total." nebula="IA Manager cierra ventas mientras duermes." />
                                <TableRow pain="Seguridad Financiera" trad="Comisiones del 20%+ y baneos de bancos." nebula="Pagos Crypto/P2P instantáneos y 100% tuyos." />
                                <TableRow pain="Estafadores Habituales" trad="Clientes que hacen perder tiempo y desaparecen." nebula="Lista Negra Global compartida entre toda la red." />
                                <TableRow pain="Cierre Inesperado" trad="Telegram borra tu cuenta/canal de la noche a la mañana." nebula="Plataforma propia anti-baneo con IA integrada." />
                                <TableRow pain="Crecimiento" trad="Mendigar seguidores y pagar promos dudosas." nebula="Feed Colaborativo + SFS Automatizado." />
                            </div>

                            {/* Growth Graph */}
                            <div className="p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-3xl space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-lg flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-purple-500" /> Crecimiento con Nebula
                                    </h4>
                                    <span className="text-xs font-black text-green-500">+12,400% ROI</span>
                                </div>
                                <div className="h-48 w-full flex items-end gap-1">
                                    {[20, 35, 25, 45, 30, 60, 40, 80, 50, 100].map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 bg-gradient-to-t from-purple-900/40 to-purple-500/60 rounded-t-md transition-all hover:to-purple-400"
                                            style={{ height: `${h}%` }}
                                        ></div>
                                    ))}
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                                    <span>Semana 1 (Tradicional)</span>
                                    <span>Semana 10 (Nebula)</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 mt-24">
                            <div className="p-12 rounded-[2rem] bg-gradient-to-br from-purple-900/10 to-transparent border border-purple-500/10 space-y-6 group hover:bg-purple-900/20 transition-all">
                                <Users className="w-12 h-12 text-purple-500 group-hover:scale-110 transition-transform" />
                                <h3 className="text-3xl font-black">Feed Colaborativo</h3>
                                <p className="text-gray-500 leading-relaxed">Aquí no importa si tienes 0 o 1M de seguidores. Todas tienen la oportunidad de darse a conocer orgánicamente.</p>
                            </div>
                            <div className="p-12 rounded-[2rem] bg-gradient-to-br from-red-900/10 to-transparent border border-red-500/10 space-y-6 group hover:bg-red-900/20 transition-all" id="safety">
                                <Shield className="w-12 h-12 text-red-500 group-hover:scale-110 transition-transform" />
                                <h3 className="text-3xl font-black">Lista Negra Global</h3>
                                <p className="text-gray-500 leading-relaxed">Si se meten con una, se meten con todas. Los estafadores quedan excluidos de todo el ecosistema automáticamente.</p>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* --- ECONOMY SECTION --- */}
            <section className="py-32 relative z-10" id="economy">
                <div className="container mx-auto px-6 text-center space-y-16">
                    <div className="space-y-4">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Economía Blindada</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto">Usamos tecnología Crypto y P2P para asegurar que tus fondos estén siempre disponibles y seguros.</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        <Feature icon={CircleDollarSign} title="Billetes Escrow" desc="Protección mutua en cada transacción." color={viewMode === 'fan' ? 'pink' : 'purple'} />
                        <Feature icon={Coins} title="Crypto Nativo" desc="Binance Pay y USDT integrados." color={viewMode === 'fan' ? 'pink' : 'purple'} />
                        <Feature
                            icon={viewMode === 'fan' ? Shield : Zap}
                            title={viewMode === 'fan' ? "Privacidad 100%" : "Retiros Flash"}
                            desc={viewMode === 'fan' ? "Sin rastros en tu banco ni estados de cuenta." : "Tus ganancias a tu wallet en minutos."}
                            color={viewMode === 'fan' ? 'pink' : 'purple'}
                        />
                        <Feature icon={viewMode === 'fan' ? Lock : Database} title={viewMode === 'fan' ? "Anti-Baneo" : "Casino Integrado"} desc={viewMode === 'fan' ? "Sin rastros en estados de cuenta." : "Monetiza la suerte de tus fans."} color={viewMode === 'fan' ? 'pink' : 'purple'} />
                    </div>
                </div>
            </section>

            {/* --- TESTIMONIALS SECTION (CREATORS) --- */}
            {viewMode === 'creator' && (
                <section className="py-32 relative z-10 bg-black/20">
                    <div className="container mx-auto px-6 space-y-16">
                        <div className="text-center space-y-4">
                            <h2 className="text-4xl font-black uppercase tracking-widest">Voces del Éxito</h2>
                            <p className="text-gray-500">Lo que dicen las estrellas que ya brillan con Nebula.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            <Testimonial
                                name="Elena V."
                                role="Modelo Elite"
                                text="Desde que activé el Agente IA, mis ingresos subieron un 400% y por fin puedo dormir tranquila sin responder mensajes 24/7."
                                image="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop"
                            />
                            <Testimonial
                                name="Carla M."
                                role="Creadora de Contenido"
                                text="El sistema de SFS automatizado es una locura. Mi comunidad creció de 5k a 50k en solo dos meses sin gastar un dólar en promos."
                                image="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop"
                            />
                            <Testimonial
                                name="Sofia K."
                                role="Modelo Independiente"
                                text="La protección anti-baneo me salvó. Telegram me cerró 3 canales antes de entrar a Nebula. Aquí mi negocio es blindado."
                                image="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop"
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* --- FINAL CTA --- */}
            <section className="py-48 relative text-center z-10" id="login">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto space-y-12">
                        <h2 className={`text-6xl md:text-9xl font-black tracking-tighter mb-12 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] ${viewMode === 'fan' ? 'text-pink-100' : 'text-purple-100'}`}>
                            Es Tu Momento.
                        </h2>
                        <div className={`flex flex-col items-center gap-10 border p-8 md:p-16 rounded-[4rem] bg-black/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden ${viewMode === 'fan' ? 'border-pink-500/10 shadow-pink-500/5' : 'border-purple-500/10 shadow-purple-500/5'}`}>
                            <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] opacity-20 -mr-32 -mt-32 rounded-full ${viewMode === 'fan' ? 'bg-pink-500' : 'bg-purple-500'}`}></div>
                            <p className="text-xl text-gray-400 font-bold max-w-xl">Únete a la elite que ya está operando en el futuro de Telegram.</p>
                            <div className="w-full max-w-[320px] sm:max-w-[400px] overflow-hidden rounded-3xl bg-white/5 p-6 border border-white/10 group flex justify-center">
                                <div ref={telegramWrapperRef} className="w-full flex justify-center scale-90 sm:scale-110 transition-transform duration-500 origin-center"></div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600 flex items-center justify-center gap-3">
                                    <Lock className="w-3 h-3" /> Privacidad Garantizada
                                </span>
                                <button onClick={() => window.open('https://t.me/' + botUsername, '_blank')} className="text-[10px] font-black uppercase tracking-[0.2em] underline opacity-50 hover:opacity-100 transition-opacity">
                                    Abrir directamente en Telegram App
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-12 border-t border-white/5 bg-black z-20 relative">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 opacity-40 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2 font-black tracking-tighter text-sm">
                        NEBULA<span className={viewMode === 'fan' ? 'text-pink-500' : 'text-purple-500'}>.AGENCY</span>
                    </div>
                    <div className="hidden md:flex text-[10px] font-bold uppercase tracking-widest text-gray-500 gap-8">
                        <span>Estatus: Operativo</span>
                        <span>v2.5.0 Codename: Dual Star</span>
                        <span>© 2026</span>
                    </div>
                    <button onClick={() => setViewMode(viewMode === 'fan' ? 'creator' : 'fan')} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors">
                        Cambiar a Modo {viewMode === 'fan' ? 'Creadora' : 'Fan'}
                    </button>
                </div>
            </footer>

            <style>{`
                .text-glow { filter: drop-shadow(0 0 10px currentColor); }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    display: inline-flex;
                    animation: marquee 30s linear infinite;
                }
                .animate-fade-in-up { animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                html { scroll-behavior: smooth; }
            `}</style>
        </div>
    );
};

const Card = ({ icon: Icon, title, desc, color }) => (
    <div className={`p-8 rounded-[2rem] border border-white/5 bg-white/[0.02] backdrop-blur-sm transition-all hover:bg-white/[0.05] group ${color === 'pink' ? 'hover:border-pink-500/20' : 'hover:border-purple-500/20'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${color === 'pink' ? 'bg-pink-500/10 text-pink-400' : 'bg-purple-500/10 text-purple-400'}`}>
            <Icon className="w-6 h-6" />
        </div>
        <h4 className="text-xl font-bold mb-3">{title}</h4>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
);

const Feature = ({ icon: Icon, title, desc, color }) => (
    <div className={`space-y-6 p-8 border border-white/5 rounded-3xl transition-all group ${color === 'pink' ? 'hover:border-pink-500/20' : 'hover:border-purple-500/20'}`}>
        <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center transition-colors ${color === 'pink' ? 'bg-white/5 group-hover:bg-pink-600' : 'bg-white/5 group-hover:bg-purple-600'}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="space-y-2">
            <h4 className="font-black uppercase tracking-tighter text-lg">{title}</h4>
            <p className="text-xs text-gray-500 leading-normal">{desc}</p>
        </div>
    </div>
);

const TableRow = ({ pain, trad, nebula }) => (
    <div className="grid grid-cols-12 p-8 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors items-center gap-4 text-left">
        <div className="col-span-4 font-black text-[10px] sm:text-xs uppercase tracking-widest text-white/50">{pain}</div>
        <div className="col-span-4 text-[10px] sm:text-xs text-gray-600 line-through decoration-red-900/50">{trad}</div>
        <div className="col-span-4 text-[10px] sm:text-xs font-bold text-gray-300 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,1)] shrink-0"></div>
            {nebula}
        </div>
    </div>
);

const Testimonial = ({ name, role, text, image }) => (
    <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-6 relative overflow-hidden group">
        <Quote className="absolute top-6 right-8 w-12 h-12 text-purple-500/10" />
        <p className="text-gray-400 italic leading-relaxed relative z-10">"{text}"</p>
        <div className="flex items-center gap-4 pt-4">
            <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover border border-purple-500/30" />
            <div className="text-left">
                <h4 className="font-bold text-sm">{name}</h4>
                <p className="text-[10px] text-purple-500 uppercase font-black tracking-widest">{role}</p>
            </div>
        </div>
    </div>
);

export default LandingPage;
