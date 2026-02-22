/* eslint-disable react/no-unknown-property */
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { Shield, Zap, Heart, Globe, Lock, Star, ChevronRight, TrendingUp, Users, DollarSign, Bot, X, Check } from 'lucide-react';

const LandingPage = () => {
    const { loginWithTelegram } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const telegramWrapperRef = useRef(null);
    const [activeTab, setActiveTab] = useState('creators'); // 'creators' (priority) or 'fans'
    const [scrolled, setScrolled] = useState(false);

    // Scroll effect for navbar
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // State for dynamic bot name
    const [botUsername, setBotUsername] = useState(null);

    // Fetch bot config
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get('/config/bot-username');
                setBotUsername(res.data.username);
            } catch (err) {
                console.error("Failed to fetch bot name, using fallback", err);
                setBotUsername('AgenteNebulaIA_bot');
            }
        };
        fetchConfig();
    }, []);

    // Telegram Widget
    useEffect(() => {
        if (!botUsername) return; // Wait for config
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
        // Clean global only on unmount
        return () => { window.onTelegramAuth = undefined; }
    }, [loginWithTelegram, navigate, botUsername]);

    const scrollToLogin = () => {
        telegramWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="min-h-screen bg-[#030014] text-white font-sans selection:bg-pink-500 selection:text-white overflow-x-hidden">

            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-pink-900/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-blue-900/10 rounded-full blur-[80px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(236,72,153,0.5)]">
                                <Zap className="w-6 h-6 text-white text-shadow" />
                            </div>
                        </div>
                        <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            NEBULA<span className="text-pink-500">.AGENCY</span>
                        </span>
                    </div>
                    <div className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
                        <a href="#features" className="hover:text-white transition-colors">Características</a>
                        <a href="#creators" className="hover:text-white transition-colors">Para Creadoras</a>
                        <a href="#fans" className="hover:text-white transition-colors">Para Fans</a>
                    </div>
                    <button
                        onClick={scrollToLogin}
                        className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 hover:border-pink-500/50 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all font-bold text-sm backdrop-blur-md"
                    >
                        Ingresar
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center pt-20 px-4 z-10">
                <div className="container mx-auto grid lg:grid-cols-2 gap-16 items-center">

                    {/* Text Content */}
                    <div className="space-y-8 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-900/20 backdrop-blur-md animate-fade-in-up">
                            <span className="status-dot w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-xs font-bold uppercase tracking-widest text-purple-300">Revolucionando la Creator Economy</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight">
                            Tu Imperio Digital, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-gradient-x">
                                100% Automatizado
                            </span>
                        </h1>

                        <p className="text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            La primera plataforma que combina <strong>Inteligencia Artificial</strong> con gestión humana.
                            Deja que nuestro Chatbot venda por ti mientras tú te enfocas en crear.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            <button
                                onClick={scrollToLogin}
                                className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-bold text-lg shadow-[0_0_40px_rgba(236,72,153,0.4)] hover:shadow-[0_0_60px_rgba(236,72,153,0.6)] hover:scale-105 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap className="w-5 h-5" /> Comenzar Ahora
                            </button>
                            <a href="https://t.me/AgenteNebulaIA_bot" target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                                <Bot className="w-5 h-5 text-gray-400" /> Ver Demo
                            </a>
                        </div>

                        <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#030014] overflow-hidden">
                                        <img src={`https://randomuser.me/api/portraits/women/${20 + i}.jpg`} alt="User" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                                <div className="w-10 h-10 rounded-full border-2 border-[#030014] bg-white/10 flex items-center justify-center text-xs font-bold">+2k</div>
                            </div>
                            <div className="text-sm font-medium">
                                <span className="text-white font-bold block">Creadoras Activas</span>
                                <span className="text-green-400">Generando ahora</span>
                            </div>
                        </div>
                    </div>

                    {/* Hero Visual */}
                    <div className="relative h-[600px] w-full hidden lg:block perspective-1000">
                        {/* Main Image */}
                        <div className="relative w-full h-full transform rotate-y-[-10deg] hover:rotate-y-0 transition-transform duration-700 ease-out z-20">
                            <div className="absolute inset-0 bg-gradient-to-tr from-pink-600 to-purple-600 rounded-[2.5rem] blur-2xl opacity-30 animate-pulse"></div>
                            <img
                                src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop"
                                alt="Futuristic Model"
                                className="w-full h-full object-cover rounded-[2rem] border-2 border-white/10 shadow-2xl relative z-10"
                            />

                            {/* Floating Stats Cards */}
                            <div className="absolute top-20 -right-10 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4 animate-float z-30 shadow-xl">
                                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400"><DollarSign /></div>
                                <div>
                                    <div className="text-xs text-gray-400 font-medium tracking-wide">Ingresos Hoy</div>
                                    <div className="font-bold text-xl text-white ml-1">$1,240.50</div>
                                </div>
                            </div>

                            <div className="absolute bottom-32 -left-10 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4 animate-float z-30 shadow-xl" style={{ animationDelay: '2s' }}>
                                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400"><Bot /></div>
                                <div>
                                    <div className="text-xs text-gray-400 font-medium tracking-wide">Bot Activo</div>
                                    <div className="font-bold text-sm text-white">Cerrando venta...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Proposition Toggle */}
            <section className="py-24 relative z-10" id="creators">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col items-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-center mb-8">
                            Diseñado para <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Escalar</span>
                        </h2>

                        {/* Selector Fixed & Width constrained */}
                        {/* Replaced logic with grid for perfect alignment */}
                        <div className="p-1.5 bg-white/5 rounded-full border border-white/10 grid grid-cols-2 relative backdrop-blur-sm w-[320px] isolate">
                            {/* Animated Background */}
                            <div
                                className={`absolute inset-y-1.5 w-[calc(50%-0.375rem)] bg-gradient-to-r from-pink-600 to-purple-600 rounded-full transition-all duration-300 shadow-lg -z-10`}
                                style={{
                                    left: activeTab === 'creators' ? '0.375rem' : '50%'
                                }}
                            ></div>

                            <button
                                onClick={() => {
                                    setActiveTab('creators');
                                    setTimeout(() => document.getElementById('creators-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                                }}
                                className={`py-3 rounded-full text-sm font-bold tracking-wide transition-colors ${activeTab === 'creators' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Soy Creadora
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('fans');
                                    setTimeout(() => document.getElementById('fans-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                                }}
                                className={`py-3 rounded-full text-sm font-bold tracking-wide transition-colors ${activeTab === 'fans' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Soy Fan
                            </button>
                        </div>
                    </div>

                    {/* Creators Content */}
                    <div id="creators-content" className={`transition-all duration-700 ${activeTab === 'creators' ? 'opacity-100 translate-y-0' : 'hidden opacity-0 translate-y-10 fixed top-0 -z-50'}`}>
                        {/* Hide visually but keep in DOM or actually hide */}
                        <div className={activeTab === 'creators' ? '' : 'hidden'}>
                            <div className="grid md:grid-cols-3 gap-8 mb-24">
                                <FeatureCard
                                    icon={Bot}
                                    color="purple"
                                    title="Bot Hunter & Manager"
                                    desc="Nuestro sistema de IA interactúa con tus leads, filtra curiosos y cierra ventas sin que tengas que responder un solo mensaje."
                                />
                                <FeatureCard
                                    icon={TrendingUp}
                                    color="green"
                                    title="Ingresos Pasivos"
                                    desc="Configura tu contenido una vez y véndelo infinitas veces. Sistema de suscripciones y PPV automatizado."
                                />
                                <FeatureCard
                                    icon={Shield}
                                    color="blue"
                                    title="Seguridad Nivel Banco"
                                    desc="Verificación de usuarios, marcas de agua dinámicas y lista negra compartida para evitar estafas."
                                />
                            </div>

                            {/* Comparison Table Section */}
                            <div className="max-w-5xl mx-auto mb-20 animate-fade-in-up">
                                <h3 className="text-3xl font-bold text-center mb-12">¿Por qué Elegir Nebula?</h3>
                                <div className="glass-panel overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl">
                                    <div className="grid grid-cols-12 p-6 border-b border-white/10 bg-white/5 font-bold text-sm md:text-xl gap-4">
                                        <div className="col-span-4 text-gray-400">Punto de Dolor</div>
                                        <div className="col-span-4 text-center text-red-400">Modo Tradicional</div>
                                        <div className="col-span-4 text-center text-green-400">Modo Nebula</div>
                                    </div>

                                    <ComparisonRow
                                        title="Gestión de Mensajes"
                                        traditional="Responder manualmente 100+ DMs. Pérdida de tiempo."
                                        nebula="IA responde al instante y cierra ventas 24/7."
                                    />
                                    <ComparisonRow
                                        title="Adquisición"
                                        traditional="Hacer SFS, Spammear grupos, Mendigar likes."
                                        nebula="Tráfico orgánico y herramientas de promoción."
                                    />
                                    <ComparisonRow
                                        title="Seguridad"
                                        traditional="Riesgo de estafas y cuentas falsas."
                                        nebula="Verificación Biométrica + Blacklist Global."
                                    />
                                    <ComparisonRow
                                        title="Estabilidad"
                                        traditional="Miedo constante a baneos de redes."
                                        nebula="Infraestructura propia y base de datos segura."
                                    />
                                    <ComparisonRow
                                        title="Estadísticas"
                                        traditional="Cero datos. No sabes quién te compra."
                                        nebula="CRM Financiero en tiempo real."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fans Content */}
                    <div id="fans-section" className={`transition-all duration-700 ${activeTab === 'fans' ? 'opacity-100 translate-y-0' : 'hidden opacity-0 translate-y-10'}`}>
                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={Star}
                                color="yellow"
                                title="Creadoras Verificadas"
                                desc="Accede a perfiles 100% reales. Cada creadora pasa por un riguroso proceso de verificación biométrica."
                            />
                            <FeatureCard
                                icon={Zap}
                                color="pink"
                                title="Atención Inmediata"
                                desc="Olvídate de esperar horas por una respuesta. Nuestro sistema garantiza interacción fluida y entrega instantánea."
                            />
                            <FeatureCard
                                icon={Lock}
                                color="indigo"
                                title="Privacidad Total"
                                desc="Tus datos están encriptados. Disfruta de contenido exclusivo con la seguridad de la infraestructura de Telegram."
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof / Stats */}
            <section className="py-20 border-y border-white/5 bg-white/[0.02]">
                <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <StatItem number="$1.2M+" label="Pagado a Creadoras" />
                    <StatItem number="50k+" label="Usuarios Activos" />
                    <StatItem number="24/7" label="Soporte IA" />
                    <StatItem number="0%" label="Comisión de Entrada" />
                </div>
            </section>

            {/* CTA Login Section */}
            <section className="py-32 relative text-center z-10" id="login">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-pink-600/20 to-purple-600/20 rounded-full blur-[120px] -z-10"></div>

                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto bg-black/40 backdrop-blur-2xl border border-white/10 p-12 md:p-20 rounded-[3rem] shadow-2xl relative overflow-hidden group">

                        {/* Hover Gradient Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        <h2 className="text-4xl md:text-6xl font-black mb-6">¿Lista para empezar?</h2>
                        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                            Únete a la plataforma de gestión más avanzada del mercado.
                            Sin contratos forzosos. Sin letras pequeñas.
                        </p>

                        <div className="flex flex-col items-center justify-center gap-6 relative z-10">
                            {/* Simplified container without glow border */}
                            <div className="flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                                <div ref={telegramWrapperRef}>
                                    {/* Telegram Widget Renders Here */}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-4 flex items-center gap-2">
                                <Lock className="w-3 h-3" /> Acceso Seguro vía Telegram
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 bg-black">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold tracking-widest text-sm">NEBULA</span>
                    </div>
                    <div className="text-gray-500 text-sm">
                        © 2024 Nebula Agency. Built for the future.
                    </div>
                </div>
            </footer>

            <style>{`
                .text-shadow { text-shadow: 0 0 20px rgba(255,255,255,0.5); }
                .perspective-1000 { perspective: 1000px; }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                .animate-float { animation: float 6s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

// Helper Components
const FeatureCard = ({ icon: Icon, color, title, desc }) => {
    const colorClasses = {
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20 group-hover:border-purple-500/50",
        pink: "bg-pink-500/10 text-pink-400 border-pink-500/20 group-hover:border-pink-500/50",
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:border-blue-500/50",
        green: "bg-green-500/10 text-green-400 border-green-500/20 group-hover:border-green-500/50",
        yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 group-hover:border-yellow-500/50",
        indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 group-hover:border-indigo-500/50",
    };

    return (
        <div className={`p-8 rounded-3xl border ${colorClasses[color].split(' ')[2]} ${colorClasses[color].split(' ')[3]} bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:bg-white/[0.05] group cursor-default`}>
            <div className={`w-14 h-14 rounded-2xl ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm">{desc}</p>
        </div>
    );
};

// ADDED: ComparisonRow Component (Missing in simple code block)
const ComparisonRow = ({ title, traditional, nebula }) => (
    <div className="grid grid-cols-12 p-6 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors gap-4 items-center">
        <div className="col-span-4 font-bold text-white text-sm md:text-base">{title}</div>
        <div className="col-span-4 text-center text-red-400/80 text-xs md:text-sm flex flex-col items-center">
            <X className="w-5 h-5 mb-1 opacity-50" />
            {traditional}
        </div>
        <div className="col-span-4 text-center text-green-400 text-xs md:text-sm font-medium flex flex-col items-center bg-green-500/5 p-2 rounded-xl border border-green-500/20">
            <Check className="w-5 h-5 mb-1" />
            {nebula}
        </div>
    </div>
);

const StatItem = ({ number, label }) => (
    <div className="space-y-2">
        <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">{number}</div>
        <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">{label}</div>
    </div>
);

export default LandingPage;
