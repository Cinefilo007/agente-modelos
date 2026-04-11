/* eslint-disable react/no-unknown-property */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import {
    Shield, Zap, Star, Activity, Cpu, 
    CircleDollarSign, TrendingUp, Sparkles, BarChart3, Bot, Globe, Check, Lock, ArrowRight, Users
} from 'lucide-react';
import profileAnatomy from '../assets/landing/profile-anatomy.png';

import { BenefitCard, StatItem, DecorativeDivider } from '../components/landing/LandingComponents';

const CreatorLanding = () => {
    const { loginWithTelegram } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [scrolled, setScrolled] = useState(false);
    const [botUsername, setBotUsername] = useState(null);
    const [botId, setBotId] = useState(null);
    const [loginLoading, setLoginLoading] = useState(false);

    // Scroll effect for navbar
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cargar configuración del bot de AGENCIA (Creators)
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const [usernameRes, idRes] = await Promise.all([
                    api.get('/config/bot-username'),
                    api.get('/config/bot-id')
                ]);
                setBotUsername(usernameRes.data.username);
                setBotId(idRes.data.bot_id || idRes.data.id);
            } catch (err) {
                setBotUsername('AgenteNebulaIA_bot');
                console.error('[Auth] Error cargando config del bot:', err);
            }
        };
        fetchConfig();
    }, []);

    const handleTelegramLogin = async () => {
        if (!botId) {
            showToast('Error de configuración del bot. Intenta más tarde.', 'error');
            return;
        }

        setLoginLoading(true);

        // 1. Detectar si estamos dentro de la Mini App (flujo silencioso/nativo)
        if (window.Telegram?.WebApp?.initData) {
            console.log('[CreatorLanding] Detectada Mini App, usando initData...');
            try {
                const response = await api.post('/auth/webapp', {
                    init_data: window.Telegram.WebApp.initData
                });
                const { access_token, user: userData, role } = response.data;
                const fullUser = { ...userData, role };
                
                localStorage.setItem('token', access_token);
                localStorage.setItem('user', JSON.stringify(fullUser));
                navigate('/');
            } catch (error) {
                console.error('[CreatorLanding] WebApp login failed:', error);
                showToast('Error al conectar con el bot nativo.', 'error');
            } finally {
                setLoginLoading(false);
            }
            return;
        }

        // 2. Flujo de Navegador Estándar
        if (window.Telegram && window.Telegram.Login) {
            window.Telegram.Login.auth(
                { bot_id: botId, request_access: 'write', lang: 'es' },
                async (data) => {
                    if (!data) {
                        setLoginLoading(false);
                        return;
                    }
                    try {
                        await loginWithTelegram(data);
                        navigate('/');
                    } catch (error) {
                        console.error('[CreatorLanding] Login error:', error);
                        showToast(error.response?.data?.detail || 'Error al iniciar sesión', 'error');
                    } finally {
                        setLoginLoading(false);
                    }
                }
            );
            
            setTimeout(() => setLoginLoading(false), 15000);
        } else {
            showToast('Librería de Telegram no cargada.', 'error');
            setLoginLoading(false);
        }
    };

    const scrollToLogin = () => {
        document.getElementById('creator-login-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="min-h-screen bg-[#010008] text-white font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#010008]">
                <div className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-indigo-600/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[150px]"></div>
                
                {/* Digital Grid Decor */}
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-3 md:py-4' : 'bg-transparent py-4 md:py-6'}`}>
                <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-transform group-hover:rotate-12">
                            <Bot className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <span className="font-black text-xl md:text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            NEBULA<span className="text-indigo-500 lowercase">agency</span>
                        </span>
                    </div>
                    <div className="hidden lg:flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                        <a href="#tecnologia" className="hover:text-white transition-colors">Tecnología</a>
                        <a href="#ventajas" className="hover:text-white transition-colors">Ventajas</a>
                        <a href="#stats" className="hover:text-white transition-colors">Métricas</a>
                    </div>
                    <button onClick={scrollToLogin} className="px-5 py-2 md:px-6 md:py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/50 transition-all font-bold text-[10px] uppercase tracking-widest backdrop-blur-md">
                        Aplicar
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center pt-24 md:pt-32 px-4 z-10 overflow-hidden">
                <div className="container mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 md:gap-20 items-center">
                        <div className="space-y-8 md:space-y-12 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-300 backdrop-blur-md animate-float">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">IA Empowerment Agency</span>
                            </div>

                            <h1 className="text-5xl sm:text-7xl md:text-[9rem] font-black leading-[0.9] md:leading-[0.8] tracking-tighter uppercase max-w-4xl lg:mx-0 mx-auto">
                                Monetiza <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                                    tu Influencia
                                </span>
                            </h1>

                            <p className="text-lg md:text-2xl text-gray-400 max-w-xl lg:mx-0 mx-auto leading-relaxed font-medium px-4 lg:px-0">
                                La plataforma que blinda tu contenido y escala tus ingresos mediante tecnología propietaria y soporte 24/7.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 md:gap-6 pt-4">
                                <button onClick={scrollToLogin} className="group relative w-full sm:w-auto px-10 py-5 md:px-12 md:py-6 bg-white text-black rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 overflow-hidden">
                                    Unirse a la Agencia
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>

                        <div className="relative group lg:block hidden">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-[120px] rounded-full group-hover:bg-indigo-500/30 transition-all"></div>
                            <div className="relative border border-white/10 p-4 rounded-[3rem] bg-black/40 backdrop-blur-2xl shadow-3xl overflow-hidden group-hover:border-white/20 transition-all">
                                <img 
                                    src={profileAnatomy} 
                                    className="w-full h-auto rounded-[2rem] shadow-2xl" 
                                    alt="Nebula Profile Anatomy" 
                                />
                                {/* Floating Badges Decorative */}
                                <div className="absolute top-10 right-10 px-4 py-2 bg-indigo-600 rounded-full font-black text-[10px] uppercase tracking-widest animate-bounce">Live Now</div>
                            </div>
                        </div>

                        {/* Mobile Image Preview (Only visible on small screens) */}
                        <div className="lg:hidden relative px-4">
                            <div className="absolute inset-0 bg-indigo-500/10 blur-3xl"></div>
                            <img 
                                src={profileAnatomy} 
                                className="relative w-full h-auto rounded-3xl border border-white/10 shadow-2xl" 
                                alt="Profile Anatomy" 
                            />
                        </div>
                    </div>
                </div>
            </section>

            <DecorativeDivider />

            {/* Features Detail */}
            <section className="py-20 md:py-32 relative z-10" id="ventajas">
                <div className="container mx-auto px-6 md:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center">
                        <div className="space-y-10 md:space-y-12">
                            <div className="text-center lg:text-left">
                                <h2 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 leading-tight">
                                    Tecnología de <br />
                                    <span className="text-indigo-500">Próxima Generación</span>
                                </h2>
                                <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                    No somos solo una agencia; somos tu socio tecnológico. Te proporcionamos las herramientas que los "top creators" usan en secreto.
                                </p>
                            </div>

                            <div className="grid gap-4 md:gap-6">
                                <BenefitCard 
                                    icon={Bot} 
                                    color="purple"
                                    title="IA Chat Manager" 
                                    desc="Nuestra IA responde mensajes 24/7 con tu tono de voz, aumentando la retención de fans." 
                                />
                                <BenefitCard 
                                    icon={Shield} 
                                    color="blue"
                                    title="Blindaje Anti-Baneo" 
                                    desc="Sistemas de protección avanzada para tus cuentas de redes sociales y pasarelas de pago." 
                                />
                                <BenefitCard 
                                    icon={Zap} 
                                    color="indigo"
                                    title="Escalado Global" 
                                    desc="Accede a mercados internacionales con traductores IA integrados en tiempo real." 
                                />
                            </div>
                        </div>

                        <div className="relative group lg:block hidden">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-[120px] rounded-full group-hover:bg-indigo-500/30 transition-colors"></div>
                            <div className="relative rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-[#0a061e]">
                                <img 
                                    src={profileAnatomy} 
                                    alt="Dashboard Preview" 
                                    className="w-full h-auto opacity-70 group-hover:opacity-90 transition-opacity"
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-[#0a061e] via-[#0a061e]/80 to-transparent">
                                    <h4 className="text-2xl font-black mb-4 uppercase">Control Total</h4>
                                    <p className="text-gray-400 text-sm">Gestiona tus publicaciones, servicios y ganancias desde un panel intuitivo diseñado para el máximo rendimiento.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Growth Stats */}
            <section className="py-24 md:py-40 relative z-10 overflow-hidden" id="stats">
                <div className="container mx-auto px-6 md:px-8">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-12 md:gap-16 border border-white/5 bg-white/[0.02] backdrop-blur-2xl p-10 md:p-24 rounded-[2.5rem] md:rounded-[4rem]">
                        <div className="max-w-md space-y-4 md:space-y-6 text-center lg:text-left">
                            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">Resultados que <span className="text-indigo-400">Hablan Solos</span></h3>
                            <p className="text-gray-500 leading-relaxed text-sm md:text-base">Nuestras creadoras experimentan un crecimiento promedio del 400% en sus primeros 3 meses.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-8 md:gap-24 w-full lg:w-auto">
                            <StatItem number="12x" label="ROAS Promedio" />
                            <StatItem number="+$5k" label="Ganancia Media" />
                            <StatItem number="99%" label="Retención" />
                            <StatItem number="24h" label="Pagos Express" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Dashboard / Tech */}
            <section className="py-20 md:py-32 relative z-10" id="dashboard">
                <div className="container mx-auto px-6 md:px-8">
                    <div className="text-center max-w-4xl mx-auto mb-16 md:mb-20 space-y-4 md:space-y-6">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-indigo-300">Infraestructura Nebula</div>
                        <h2 className="text-4xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter leading-tight px-2">Tu Negocio, <br /><span className="text-indigo-500 underline decoration-indigo-500/30 underline-offset-8">Automatizado.</span></h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 md:gap-12">
                        <div className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] bg-white/[0.02] border border-white/10 hover:border-indigo-500/40 transition-all group">
                            <BarChart3 className="w-10 h-10 md:w-12 md:h-12 text-indigo-400 mb-6 md:mb-8 group-hover:scale-110 transition-transform" />
                            <h4 className="text-xl md:text-2xl font-bold mb-4">Analítica Real</h4>
                            <p className="text-gray-500 text-sm">Entiende exactamente de dónde vienen tus fans y qué contenido convierte mejor.</p>
                        </div>
                        <div className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] bg-white/[0.02] border border-white/10 hover:border-purple-500/40 transition-all group">
                            <Globe className="w-10 h-10 md:w-12 md:h-12 text-purple-400 mb-6 md:mb-8 group-hover:scale-110 transition-transform" />
                            <h4 className="text-xl md:text-2xl font-bold mb-4">Alcance Global</h4>
                            <p className="text-gray-500 text-sm">Llegamos a fans en más de 50 países con estrategias de tráfico segmentadas.</p>
                        </div>
                        <div className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] bg-indigo-600 border border-indigo-400 hover:scale-[1.02] transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 md:p-8 transform translate-x-4 -translate-y-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap size={80} />
                            </div>
                            <h4 className="text-xl md:text-2xl font-black mb-4 uppercase text-white">Prueba Gratis</h4>
                            <p className="text-indigo-100 text-sm mb-6 md:mb-8">Empieza hoy sin costos fijos. Solo ganamos cuando tú ganas.</p>
                            <button onClick={scrollToLogin} className="w-full py-4 md:py-5 bg-white text-indigo-600 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:shadow-xl transition-all shadow-lg active:scale-95">Empezar</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA High Impact */}
            <section className="py-24 md:py-48 relative overflow-hidden z-10" id="creator-login-section">
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-indigo-500/5 to-transparent"></div>
                
                <div className="container mx-auto px-6 md:px-8 relative">
                    <div className="max-w-6xl mx-auto text-center space-y-12 md:space-y-20">
                        <h2 className="text-5xl sm:text-7xl md:text-[12rem] font-black tracking-tighter uppercase leading-[0.9] md:leading-[0.7] mb-8 md:mb-12 px-2">
                            Eleva tu <br />
                            <span className="text-indigo-500">Estándar.</span>
                        </h2>
                        
                        <div className="flex flex-col items-center gap-8 md:gap-12 border border-white/10 p-8 md:p-24 rounded-[2.5rem] md:rounded-[5rem] bg-black/60 backdrop-blur-3xl shadow-3xl relative mx-auto max-w-[95%]">
                            {/* Decorative blur */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 md:w-[500px] h-64 md:h-[500px] bg-indigo-500/10 blur-[80px] md:blur-[150px] pointer-events-none"></div>
                            
                            <p className="text-xl md:text-3xl text-gray-400 font-bold max-w-2xl leading-relaxed px-2">
                                Únete a la agencia que está cambiando las reglas del juego. Empieza tu verificación en un clic.
                            </p>
                            
                            <button
                                onClick={handleTelegramLogin}
                                disabled={loginLoading || !botId}
                                className={`group relative w-full max-w-[450px] px-8 py-5 md:px-12 md:py-7 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-[12px] md:text-sm uppercase tracking-[.3em] transition-all duration-500 flex items-center justify-center gap-4 md:gap-6 overflow-hidden shadow-2xl ${
                                    loginLoading ? 'opacity-70 scale-95' : 'hover:scale-105 hover:shadow-indigo-500/40 bg-indigo-600'
                                }`}
                            >
                                {loginLoading ? (
                                    <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8 fill-white group-hover:rotate-12 transition-transform">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                    </svg>
                                )}
                                <span className="text-white font-black text-xs md:text-lg">
                                    {loginLoading ? 'Iniciando...' : 'Aplicar por Telegram'}
                                </span>
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                            </button>
                            
                            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 opacity-30 mt-4">
                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[.25em] md:tracking-[0.4em]">Pagos Crypto</span>
                                <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-white/50"></div>
                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[.25em] md:tracking-[0.4em]">Soporte 24/7</span>
                                <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-white/50"></div>
                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[.25em] md:tracking-[0.4em]">Contrato Legal</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-24 border-t border-white/5 bg-[#010008] z-20 relative">
                <div className="container mx-auto px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-16">
                        <div className="space-y-6">
                            <div className="font-black tracking-tighter text-3xl">NEBULA<span className="text-indigo-500">.AGENCY</span></div>
                            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.5em] max-w-xs leading-loose">
                                Transformando creadoras de contenido en marcas globales de alto impacto.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                            <div className="space-y-6">
                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Plataforma</h5>
                                <div className="flex flex-col gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                    <a href="#" className="hover:text-white transition-colors">Agencia</a>
                                    <a href="#" className="hover:text-white transition-colors">Influencers</a>
                                    <a href="#" className="hover:text-white transition-colors">Tecnología</a>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Legal</h5>
                                <div className="flex flex-col gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                    <a href="#" className="hover:text-white transition-colors">Privacidad</a>
                                    <a href="#" className="hover:text-white transition-colors">Términos</a>
                                    <a href="#" className="hover:text-white transition-colors">Cookies</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Global Animation Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 4s infinite ease-in-out;
                }
                .bg-grid-white {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='white' stroke-opacity='0.1'%3E%3Cpath d='M0 .5H31.5V32'/%3E%3C/svg%3E");
                }
            `}} />
        </div>
    );
};

export default CreatorLanding;
