/* eslint-disable react/no-unknown-property */
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import {
    Shield, Zap, Heart, Globe, Lock, Star, ChevronRight,
    TrendingUp, Users, DollarSign, Bot, X, Check,
    Database, Coins, Gift, MessageSquare, Repeat,
    Activity, Cpu, Briefcase, UserCheck
} from 'lucide-react';

const LandingPage = () => {
    const { loginWithTelegram } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const telegramWrapperRef = useRef(null);
    const [scrolled, setScrolled] = useState(false);

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
        if (!botUsername) return;
        if (telegramWrapperRef.current && telegramWrapperRef.current.innerHTML !== "") return;

        const script = document.createElement('script');
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute('data-telegram-login', botUsername);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '12');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.async = true;
        if (telegramWrapperRef.current) telegramWrapperRef.current.appendChild(script);

        window.onTelegramAuth = async (user) => {
            try { await loginWithTelegram(user); navigate('/'); }
            catch (error) { showToast(error.response?.data?.detail || "Login failed", "error"); }
        };
        return () => { window.onTelegramAuth = undefined; }
    }, [loginWithTelegram, navigate, botUsername]);

    const scrollToLogin = () => {
        telegramWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="min-h-screen bg-[#02010a] text-white font-sans selection:bg-purple-500 selection:text-white overflow-x-hidden">

            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#02010a]">
                {/* Nebulosas principales con animación asíncrona */}
                <div className="absolute top-[-10%] left-[-10%] w-[1000px] h-[1000px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse duration-[8s]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/15 rounded-full blur-[150px] animate-pulse duration-[10s] delay-1000"></div>

                {/* Pulsos centrales más dinámicos */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse duration-[6s] delay-500"></div>
                <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-pink-500/5 rounded-full blur-[100px] animate-pulse duration-[12s]"></div>

                {/* Textura de ruido */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay brightness-100 contrast-150"></div>
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(124,58,237,0.5)]">
                                <Activity className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            NEBULA<span className="text-purple-500">.AGENCY</span>
                        </span>
                    </div>
                    <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-widest text-gray-400">
                        <a href="#vision" className="hover:text-white transition-colors">Visión</a>
                        <a href="#ia" className="hover:text-white transition-colors">Tecnología IA</a>
                        <a href="#economy" className="hover:text-white transition-colors">Economía</a>
                        <a href="#safety" className="hover:text-white transition-colors">Seguridad</a>
                    </div>
                    <button
                        onClick={scrollToLogin}
                        className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all font-bold text-xs uppercase tracking-widest backdrop-blur-md"
                    >
                        Acceso
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center pt-20 px-4 z-10">
                <div className="container mx-auto text-center space-y-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/20 bg-purple-900/10 backdrop-blur-md animate-fade-in-up">
                        <span className="status-dot w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-300">Telegram en Esteroides</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black leading-tight tracking-[calc(-0.02em)] max-w-5xl mx-auto">
                        Sacamos el jugo a <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-100">
                            Telegram como nadie
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        No inventamos la rueda, solo la hacemos girar a la velocidad de la luz.
                        <strong> Potenciamos cada funcionalidad nativa </strong> para crear el ecosistema de monetización definitiva.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
                        <button
                            onClick={scrollToLogin}
                            className="px-10 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)]"
                        >
                            Empezar Imperio
                        </button>
                        <a href="https://t.me/AgenteNebulaIA_bot" target="_blank" rel="noopener noreferrer" className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all backdrop-blur-sm flex items-center gap-3">
                            <Bot className="w-5 h-5" /> Probar Demo
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Grid - IA & Casino */}
            <section className="py-32 relative z-10 bg-black/40" id="ia">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
                                IA que <span className="text-purple-500 text-glow">Vende</span>, <br />
                                Ecosistema que <span className="text-indigo-500 text-glow">Protege</span>.
                            </h2>
                            <p className="text-lg text-gray-500 leading-relaxed">
                                Telegram está recrudeciendo sus políticas sobre el contenido para adultos, cerrando canales, grupos y cuentas todos los días. <strong className="text-white">Nuestra plataforma es la solución definitiva.</strong> Todo tu negocio protegido y operando desde un entorno seguro anti-baneos, donde sacamos el máximo jugo de la app.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-8 pt-8">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                        <Cpu className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-bold">Chat Manager IA</h4>
                                    <p className="text-sm text-gray-500 italic">Un asistente que cierra ventas 24/7 y protege tu red.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
                                        <Database className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-bold">Casino Interactivo</h4>
                                    <p className="text-sm text-gray-500 italic">Monetiza la suerte de tus fans con juegos integrados.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            <Card
                                icon={Globe}
                                title="Red Social Anti-Baneo"
                                desc="Stories, Feed y Perfiles blindados dentro de Telegram. Crea una comunidad fuerte e inmune a los cierres masivos."
                            />
                            <Card
                                icon={Star}
                                title="Monetización Total"
                                desc="Pagos, propinas, suscripciones VIP y juegos de casino para exprimir cada interacción al máximo, de forma segura."
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Monetización Section */}
            <section className="py-32 relative z-10" id="economy">
                <div className="container mx-auto px-6 text-center space-y-16">
                    <div className="space-y-4">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Monetización Explosiva</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto">Ofrecemos el abanico más amplio de opciones para que tu contenido genere beneficios reales.</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        <Feature icon={Coins} title="Billetera Crypto" desc="Descentralizada, sin bloqueos y con las mejores tasas." />
                        <Feature icon={Gift} title="Regalos & Tips" desc="Tus fans pueden premiar cada post con monedas y regalos exclusivos." />
                        <Feature icon={TrendingUp} title="Casino P2P" desc="Tus fans prueban su suerte para ganar tus servicios VIP." />
                        <Feature icon={Repeat} title="Venta P2P" desc="Sistema de intercambio de contenido seguro fuera de la web." />
                    </div>
                </div>
            </section>

            {/* Comparison Table Section */}
            <section className="py-32 relative z-10 bg-white/[0.02]" id="vision">
                <div className="container mx-auto px-6">
                    <div className="max-w-5xl mx-auto space-y-16">
                        <div className="text-center space-y-4">
                            <h2 className="text-4xl font-black uppercase tracking-widest">Nebula vs Tradicional</h2>
                            <p className="text-gray-500">Eliminamos tus puntos de dolor para que solo te preocupes de brillar.</p>
                        </div>

                        <div className="border border-white/5 bg-black/40 rounded-[2rem] overflow-hidden backdrop-blur-3xl shadow-2xl">
                            <div className="grid grid-cols-12 p-8 border-b border-white/5 font-black text-[10px] uppercase tracking-[0.2em] text-gray-500">
                                <div className="col-span-4">Punto de Dolor</div>
                                <div className="col-span-4 text-center">Modo Tradicional</div>
                                <div className="col-span-4 text-center text-purple-500">Efecto Nebula</div>
                            </div>

                            <TableRow
                                pain="Mensajes Agobiantes"
                                trad="Responder 500 DMs a mano. Agotamiento total."
                                nebula="IA Manager cierra ventas mientras duermes."
                            />
                            <TableRow
                                pain="Seguridad Financiera"
                                trad="Comisiones del 20%+ y baneos de bancos."
                                nebula="Pagos Crypto/P2P instantáneos y 100% tuyos."
                            />
                            <TableRow
                                pain="Baneos en Telegram"
                                trad="Pierdes tu canal por políticas estrictas."
                                nebula="Plataforma propia anti-baneo con IA integrada."
                            />
                            <TableRow
                                pain="Crecimiento"
                                trad="Mendigar seguidores y pagar promos dudosas."
                                nebula="Feed Colaborativo + SFS Automatizado entre canales."
                            />
                        </div>
                    </div>

                    {/* Collaborative Feed & Blacklist */}
                    <div className="grid md:grid-cols-2 gap-12 mt-24">
                        <div className="p-12 rounded-[2rem] bg-gradient-to-br from-purple-900/10 to-transparent border border-purple-500/10 space-y-6">
                            <Users className="w-12 h-12 text-purple-500" />
                            <h3 className="text-3xl font-black">Feed Colaborativo</h3>
                            <p className="text-gray-500 leading-relaxed">
                                Aquí no importa si tienes 0 o 1M de seguidores. Todas tienen la oportunidad de darse a conocer.
                                Entre todas las modelos se colaboran para que el tráfico circule orgánicamente.
                            </p>
                        </div>
                        <div className="p-12 rounded-[2rem] bg-gradient-to-br from-red-900/10 to-transparent border border-red-500/10 space-y-6" id="safety">
                            <Shield className="w-12 h-12 text-red-500" />
                            <h3 className="text-3xl font-black">Lista Negra Global</h3>
                            <p className="text-gray-500 leading-relaxed">
                                Si se meten con una, se meten con todas. Los estafadores y malos clientes quedan excluidos
                                de todo el ecosistema y expuestos para proteger a la comunidad.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Reputación Section */}
            <section className="py-32 relative z-10">
                <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-24 items-center">
                    <div className="order-2 lg:order-1 relative">
                        <div className="absolute inset-0 bg-purple-600/10 blur-[100px] rounded-full"></div>
                        <div className="relative p-8 bg-black/60 border border-white/5 rounded-3xl backdrop-blur-xl space-y-6">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 w-32 bg-gray-800 rounded animate-pulse"></div>
                                    <div className="h-3 w-16 bg-gray-900 rounded animate-pulse"></div>
                                </div>
                            </div>
                            <div className="space-y-3">
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
                            Implementamos un sistema de **comentarios en perfiles** tanto para modelos como para clientes.
                            Cada interacción suma a tu historial, creando un ecosistema de confianza donde los mejores
                            siempre tienen más ventas.
                        </p>
                        <ul className="space-y-4 pt-4">
                            <li className="flex items-center gap-3 text-sm font-bold text-gray-400">
                                <UserCheck className="w-5 h-5 text-green-500" /> Perfiles Verificados Biométricamente
                            </li>
                            <li className="flex items-center gap-3 text-sm font-bold text-gray-400">
                                <MessageSquare className="w-5 h-5 text-blue-500" /> Reseñas Reales de Clientes Reales
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* SFS Section */}
            <section className="py-32 relative z-10 bg-indigo-600/5">
                <div className="container mx-auto px-6 text-center space-y-12">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Intercambio Promo Automatizado</h2>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                        Nunca había sido tan fácil darse a conocer. Nuestra super plataforma para intercambio de publicidad (SFS/Promo)
                        gestiona todo automáticamente entre canales verificados. **Tráfico garantizado.**
                    </p>
                    <div className="pt-8">
                        <button onClick={scrollToLogin} className="px-12 py-6 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all">
                            Vincular mi Canal
                        </button>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-48 relative text-center z-10" id="login">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto space-y-12">
                        <h2 className="text-6xl md:text-9xl font-black tracking-tighter mix-blend-difference mb-12">Es Tu Momento.</h2>
                        <div className="flex flex-col items-center gap-8 border border-white/10 p-16 rounded-[4rem] bg-black/40 backdrop-blur-3xl shadow-[0_0_100px_rgba(168,85,247,0.1)]">
                            <p className="text-xl text-gray-400 font-bold max-w-xl">Únete a la elite que ya está operando en el futuro de Telegram.</p>
                            <div ref={telegramWrapperRef} className="transform scale-125 hover:scale-135 transition-transform duration-500"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600 flex items-center gap-4">
                                <Lock className="w-3 h-3" /> Conexión Directa & Encriptada
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-12 border-t border-white/5 bg-black z-20 relative">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 opacity-40 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2 font-black tracking-tighter text-sm">
                        NEBULA<span className="text-purple-500">.AGENCY</span>
                    </div>
                    <div className="text-[10px] items-center gap-8 hidden md:flex font-bold uppercase tracking-widest text-gray-500">
                        <span>Estatus: Operativo</span>
                        <span>v2.4.0 Codename: Super Star</span>
                        <span>© 2026</span>
                    </div>
                </div>
            </footer>

            <style>{`
                .text-glow { filter: drop-shadow(0 0 10px currentColor); }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

// Subcomponents
const Card = ({ icon: Icon, title, desc }) => (
    <div className="p-8 rounded-[2rem] border border-white/5 bg-white/[0.02] backdrop-blur-sm transition-all hover:bg-white/[0.05] hover:border-white/10 group">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6 text-white" />
        </div>
        <h4 className="text-xl font-bold mb-3">{title}</h4>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
);

const Feature = ({ icon: Icon, title, desc }) => (
    <div className="space-y-6 p-8 border border-white/5 rounded-3xl transition-all hover:border-purple-500/20 group">
        <div className="w-14 h-14 mx-auto rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="space-y-2">
            <h4 className="font-black uppercase tracking-tighter text-lg">{title}</h4>
            <p className="text-xs text-gray-500 leading-normal">{desc}</p>
        </div>
    </div>
);

const TableRow = ({ pain, trad, nebula }) => (
    <div className="grid grid-cols-12 p-8 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors items-center gap-4">
        <div className="col-span-4 font-black text-xs uppercase tracking-widest text-white/50">{pain}</div>
        <div className="col-span-4 text-xs text-gray-600 line-through decoration-red-900/50">{trad}</div>
        <div className="col-span-4 text-xs font-bold text-gray-300 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,1)]"></div>
            {nebula}
        </div>
    </div>
);

export default LandingPage;
