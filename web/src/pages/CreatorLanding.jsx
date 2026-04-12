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
                
                // Redirigir según verificación
                if (fullUser.role === 'model' && !fullUser.is_verified) {
                    navigate('/'); // Ir al feed si no está verificado
                } else if (fullUser.role === 'model') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
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
                        const loggedUser = await loginWithTelegram(data);
                        
                        // Redirigir según el estado de verificación
                        if (loggedUser?.role === 'model' && !loggedUser?.is_verified) {
                            navigate('/'); // Ir al feed si no está verificado
                        } else if (loggedUser?.role === 'model') {
                            navigate('/admin');
                        } else {
                            navigate('/');
                        }
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
            <section className="relative min-h-[85vh] flex items-center justify-center pt-20 md:pt-24 px-4 z-10 overflow-hidden">
                <div className="container mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 md:gap-20 items-center">
                        <div className="space-y-8 md:space-y-12 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-300 backdrop-blur-md animate-float">
                                <Zap className="w-4 h-4 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Tu Contenido, Tus Reglas</span>
                            </div>

                            <h1 className="text-5xl md:text-8xl lg:text-9xl font-black leading-[0.9] md:leading-[0.8] tracking-tighter uppercase max-w-4xl lg:mx-0 mx-auto">
                                Libertad <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                                    Sin Límites
                                </span>
                            </h1>

                            <div className="space-y-6 max-w-xl lg:mx-0 mx-auto">
                                <p className="text-lg md:text-xl text-gray-400 leading-relaxed font-medium">
                                    No somos una agencia tradicional. Eres <span className="text-white font-bold">dueña total de tu contenido</span> en la primera red social nativa de Telegram.
                                </p>
                                <ul className="flex flex-col gap-3 text-sm md:text-base text-indigo-300 font-bold uppercase tracking-widest text-left max-w-xs mx-auto lg:mx-0">
                                    <li className="flex items-center gap-3"><Check className="w-5 h-5" /> Cero Censura</li>
                                    <li className="flex items-center gap-3"><Check className="w-5 h-5" /> Sin Miedo a Baneos</li>
                                    <li className="flex items-center gap-3"><Check className="w-5 h-5" /> Tráfico Orgánico</li>
                                </ul>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 md:gap-6 pt-4">
                                <button onClick={scrollToLogin} className="group relative w-full sm:w-auto px-10 py-5 md:px-12 md:py-6 bg-white text-black rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 overflow-hidden">
                                    Crear mi perfil nativo
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>

                        <div className="relative group lg:block hidden">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-[120px] rounded-full"></div>
                            <div className="relative aspect-square rounded-[3.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl p-12 flex items-center justify-center">
                                <div className="text-center space-y-4">
                                    <Cpu className="w-24 h-24 text-indigo-500 mx-auto animate-pulse" />
                                    <div className="px-6 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-black uppercase tracking-widest text-indigo-300">
                                        Nativo de Telegram
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <DecorativeDivider />

            {/* Panel Section */}
            <section className="py-12 md:py-20 relative z-10" id="ventajas">
                <div className="container mx-auto px-6 md:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center">
                        <div className="space-y-10 md:space-y-12">
                            <div className="text-center lg:text-left">
                                <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6 leading-tight">
                                    Panel de <br />
                                    <span className="text-indigo-500">Alto Rendimiento</span>
                                </h2>
                                <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                    Todo lo que necesitas para escalar tu negocio sin complicaciones técnicas.
                                </p>
                            </div>

                            <div className="grid gap-4 md:gap-6">
                                <BenefitCard 
                                    icon={BarChart3} 
                                    color="purple"
                                    title="Métricas en Tiempo Real" 
                                    desc="Visualiza tus ganancias, clics y retención de fans con gráficas diseñadas para la toma de decisiones." 
                                />
                                <BenefitCard 
                                    icon={Users} 
                                    color="blue"
                                    title="Gestión de Suscriptores" 
                                    desc="Herramientas avanzadas para segmentar y fidelizar a tus mejores clientes automáticamente." 
                                />
                                <BenefitCard 
                                    icon={Lock} 
                                    color="indigo"
                                    title="Privacidad Blindada" 
                                    desc="Control total sobre quién ve tu contenido con sistemas anti-leaks de última generación." 
                                />
                            </div>
                        </div>

                        <div className="relative group lg:block hidden">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-[120px] rounded-full group-hover:bg-indigo-500/30 transition-colors"></div>
                            <div className="relative rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-[#0a061e] p-12 space-y-8">
                                <div className="space-y-4">
                                    <div className="h-4 w-32 bg-indigo-500/20 rounded-full animate-pulse"></div>
                                    <div className="h-12 w-full bg-white/5 rounded-2xl"></div>
                                    <div className="h-12 w-full bg-white/5 rounded-2xl"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="h-32 bg-white/5 rounded-3xl"></div>
                                    <div className="h-32 bg-white/5 rounded-3xl"></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={scrollToLogin} className="px-8 py-4 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px]">Ver Panel Demo</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SFS Bot Section */}
            <section className="py-12 md:py-20 relative z-10 overflow-hidden bg-purple-900/5">
                <div className="container mx-auto px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-12 md:gap-16">
                        <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-[9px] font-black uppercase tracking-[0.2em]">
                                <Bot className="w-3.5 h-3.5" /> Colaboración Inteligente
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
                                Bot SFS <br />
                                <span className="text-purple-500">Automatizado</span>
                            </h2>
                            <p className="text-gray-400 text-base leading-relaxed">
                                Gestiona intercambios (Shoutout for Shoutout) con otras modelos sin salir de la App. Validación automática de métricas para garantizar el crecimiento más real.
                            </p>
                            <div className="grid grid-cols-2 gap-6 text-left">
                                <div className="space-y-2">
                                    <div className="text-purple-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                        <Activity size={12} /> Engagement Real
                                    </div>
                                    <p className="text-xs text-gray-500">El bot mide el ER de tus colaboradores para evitar fraudes con bots.</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-purple-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp size={12} /> Crecimiento P2P
                                    </div>
                                    <p className="text-xs text-gray-500">Cierra acuerdos automáticos por tiempo, vistas o nuevos seguidores.</p>
                                </div>
                            </div>
                        </div>
                        <div className="lg:w-1/2 w-full p-8 rounded-[3rem] bg-purple-600/5 border border-purple-500/20 backdrop-blur-xl relative">
                            <div className="absolute top-4 right-8 px-4 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-[9px] font-black uppercase tracking-widest text-purple-400 animate-pulse">Monitor Activo</div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                                    <div className="h-2 w-3/4 bg-white/5 rounded-full"></div>
                                </div>
                                <div className="h-[200px] w-full bg-gradient-to-br from-white/5 to-transparent rounded-2xl flex items-center justify-center">
                                    <div className="text-center group">
                                        <Bot className="w-16 h-16 text-purple-500 mx-auto mb-4 group-hover:scale-110 transition-transform duration-500" />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">@SFSnebula_bot</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-purple-400/50">
                                    <span>Views: Meta Alcanzada</span>
                                    <span>Time: 24h Publicado</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-24 md:py-40 relative z-10 overflow-hidden" id="stats">
                <div className="container mx-auto px-6 md:px-8">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-12 md:gap-16 border border-white/5 bg-white/[0.02] backdrop-blur-2xl p-10 md:p-16 rounded-[2.5rem] md:rounded-[4rem]">
                        <div className="max-w-md space-y-4 md:space-y-6 text-center lg:text-left">
                            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">Resultados <span className="text-indigo-400">Sin Filtros</span></h3>
                            <p className="text-gray-500 leading-relaxed text-sm md:text-base">Nuestra red social interna maximiza tu alcance orgánico desde el primer día.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-8 md:gap-16 w-full lg:w-auto">
                            <StatItem number="100%" label="Libertad" />
                            <StatItem number="+$5k" label="Ganancia Media" />
                            <StatItem number="0%" label="Censura" />
                            <StatItem number="24h" label="Pagos Express" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Anatomy Section (Moved down) */}
            <section className="py-16 md:py-24 relative z-10 bg-[#060413]/50">
                <div className="container mx-auto px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="relative order-2 lg:order-1">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full"></div>
                            <div className="relative p-12 rounded-[3.5rem] bg-indigo-900/5 border border-indigo-500/20 backdrop-blur-xl group">
                                <img src={profileAnatomy} alt="Nebula Profile" className="w-full rounded-2xl shadow-2xl group-hover:scale-105 transition-transform duration-700" />
                            </div>
                        </div>
                        <div className="space-y-12 order-1 lg:order-2">
                             <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-indigo-400">Anatomía <br />del Perfil</h3>
                             <div className="space-y-8">
                                    <div className="flex gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                            <Globe className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-xs uppercase tracking-widest mb-2">Social Hub Integrado</h4>
                                            <p className="text-gray-500 text-sm leading-relaxed">Única plataforma que te permite centralizar todos tus links sociales (IG, TW, FB) de forma elegante.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30">
                                            <Zap className="w-6 h-6 text-purple-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-xs uppercase tracking-widest mb-2">Etiquetas de Servicio</h4>
                                            <p className="text-gray-500 text-sm leading-relaxed">Muestra tus servicios y tarifas en segundos con un diseño visual intuitivo que convierte fans.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center shrink-0 border border-pink-500/30">
                                            <Sparkles className="w-6 h-6 text-pink-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-xs uppercase tracking-widest mb-2">Botón de Casino VIP</h4>
                                            <p className="text-gray-500 text-sm leading-relaxed">Monetiza el entretenimiento de tus fans con juegos directo en tu perfil sin salir de Telegram.</p>
                                        </div>
                                    </div>
                                    {/* Protection Badge */}
                                    <div className="p-6 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center gap-4 group mt-8">
                                        <Shield className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
                                        <div>
                                            <span className="block font-black text-[10px] uppercase tracking-widest text-white">Protección Activa</span>
                                            <span className="text-xs text-indigo-300">Estás protegida por nuestra Lista Negra Global.</span>
                                        </div>
                                    </div>
                             </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA High Impact */}
            <section className="py-16 md:py-24 relative overflow-hidden z-10" id="creator-login-section">
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-indigo-500/5 to-transparent"></div>
                
                <div className="container mx-auto px-6 md:px-8 relative">
                    <div className="max-w-6xl mx-auto text-center space-y-12 md:space-y-20">
                        <h2 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.9] md:leading-[0.7] mb-8 md:mb-12 px-2">
                            Tu Imperio, <br />
                            <span className="text-indigo-500">Nativo.</span>
                        </h2>
                        
                        <div className="flex flex-col items-center gap-8 md:gap-12 border border-white/10 p-8 md:p-24 rounded-[2.5rem] md:rounded-[5rem] bg-black/60 backdrop-blur-3xl shadow-3xl relative mx-auto max-w-[95%]">
                            {/* Decorative blur */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 md:w-[500px] h-64 md:h-[500px] bg-indigo-500/10 blur-[80px] md:blur-[150px] pointer-events-none"></div>
                            
                            <p className="text-xl md:text-3xl text-gray-400 font-bold max-w-2xl leading-relaxed px-2">
                                Únete a la primera red social que no intenta controlarte. Empieza tu verificación en un clic.
                            </p>
                            
                            <button
                                onClick={handleTelegramLogin}
                                disabled={loginLoading || !botId}
                                className={`group relative w-full max-w-[450px] px-8 py-5 md:px-12 md:py-7 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-[12px] md:text-sm uppercase tracking-[.3em] transition-all duration-500 flex items-center justify-center gap-4 md:gap-6 overflow-hidden shadow-2xl ${
                                    loginLoading ? 'opacity-70 scale-95' : 'hover:scale-105 hover:shadow-indigo-500/40'
                                }`}
                                style={{
                                    background: 'linear-gradient(135deg, #0088cc 0%, #00aaee 50%, #0077b5 100%)',
                                }}
                            >
                                {loginLoading ? (
                                    <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8 fill-white group-hover:rotate-12 transition-transform">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                    </svg>
                                )}
                                <span className="text-white font-black text-xs md:text-lg">
                                    {loginLoading ? 'Conectando...' : 'Conectar Telegram'}
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
