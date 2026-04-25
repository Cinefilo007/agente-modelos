/* eslint-disable react/no-unknown-property */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import {
    Shield, Zap, Star, Activity, Cpu, 
    CircleDollarSign, TrendingUp, Sparkles, BarChart3, Bot, Globe, Check, Lock, ArrowRight, Users, Eye, Image, Calendar, Wallet, Scale, Ghost, Search, Share2, HelpCircle
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

    // Cargar configuración del bot
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

        if (window.Telegram?.WebApp?.initData) {
            try {
                const response = await api.post('/auth/webapp', {
                    init_data: window.Telegram.WebApp.initData
                });
                const { access_token, user: userData, role } = response.data;
                const fullUser = { ...userData, role };
                
                localStorage.setItem('token', access_token);
                localStorage.setItem('user', JSON.stringify(fullUser));
                
                if (fullUser.role === 'model' && !fullUser.is_verified) {
                    navigate('/');
                } else if (fullUser.role === 'model') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
            } catch (error) {
                showToast('Error al conectar con el bot nativo.', 'error');
            } finally {
                setLoginLoading(false);
            }
            return;
        }

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
                        if (loggedUser?.role === 'model' && !loggedUser?.is_verified) {
                            navigate('/');
                        } else if (loggedUser?.role === 'model') {
                            navigate('/admin');
                        } else {
                            navigate('/');
                        }
                    } catch (error) {
                        showToast(error.response?.data?.detail || 'Error al iniciar sesión', 'error');
                    } finally {
                        setLoginLoading(false);
                    }
                }
            );
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
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-3 md:py-4' : 'bg-transparent py-4 md:py-6'}`}>
                <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-transform group-hover:rotate-12">
                            <Activity className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <span className="font-black text-xl md:text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            NEBULA<span className="text-indigo-500">STAR</span>
                        </span>
                    </div>
                    <div className="hidden lg:flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                        <a href="#telegram" className="hover:text-white transition-colors">Telegram Nativo</a>
                        <a href="#seguridad" className="hover:text-white transition-colors">Sin Baneos</a>
                        <a href="#herramientas" className="hover:text-white transition-colors">Herramientas IA</a>
                    </div>
                    <button onClick={scrollToLogin} className="px-5 py-2 md:px-6 md:py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/50 transition-all font-bold text-[10px] uppercase tracking-widest backdrop-blur-md">
                        Unirse Ahora
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center pt-20 md:pt-24 px-4 z-10 overflow-hidden">
                <div className="container mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 md:gap-20 items-center">
                        <div className="space-y-8 md:space-y-12 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-300 backdrop-blur-md animate-float">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Primera Red Social Nativa de Telegram</span>
                            </div>

                            <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black leading-[0.85] md:leading-[0.8] tracking-tighter uppercase max-w-4xl lg:mx-0 mx-auto">
                                Publica <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                                    Sin Miedo
                                </span>
                            </h1>

                            <div className="space-y-6 max-w-xl lg:mx-0 mx-auto">
                                <p className="text-xl md:text-2xl text-gray-400 leading-relaxed font-medium">
                                    ¿Cansada de que Telegram bloquee tus anuncios? Somos la <span className="text-white font-black underline decoration-indigo-500 underline-offset-8">solución definitiva</span>. Publicidad de alto impacto para creadoras, sin censura y 100% nativa.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 md:gap-6 pt-4">
                                <button onClick={scrollToLogin} className="group relative w-full sm:w-auto px-10 py-5 md:px-12 md:py-7 bg-white text-black rounded-3xl font-black text-[12px] uppercase tracking-[0.25em] hover:bg-indigo-600 hover:text-white transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center gap-4 overflow-hidden">
                                    Crear mi perfil ahora
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                </button>
                            </div>
                        </div>

                        <div className="relative lg:block hidden">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-[150px] rounded-full animate-pulse"></div>
                            <div className="relative aspect-[4/5] rounded-[4rem] bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 backdrop-blur-3xl p-12 flex flex-col justify-between overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center">
                                            <Activity className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="w-32 h-4 bg-white/20 rounded-full"></div>
                                            <div className="w-20 h-4 bg-white/10 rounded-full"></div>
                                        </div>
                                    </div>
                                    <div className="h-64 w-full bg-gradient-to-tr from-white/5 to-white/10 rounded-3xl border border-white/5"></div>
                                </div>
                                <div className="pt-8 border-t border-white/5">
                                    <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-indigo-400">
                                        <span>STATUS: ACTIVE PLATFORM</span>
                                        <span className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                            SECURE CONNECTION
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Telegram Problem */}
            <section className="py-24 relative z-10 overflow-hidden bg-black" id="telegram">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center space-y-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">
                            <Ghost className="w-4 h-4" /> La Realidad Actual
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase leading-none">
                            Tus canales adultos están <br />
                            <span className="text-red-500">bajo la lupa</span>
                        </h2>
                        <p className="text-xl text-gray-500 leading-relaxed">
                            Telegram está intensificando los cierres de canales por violar sus crecientes políticas de contenido. No pongas en riesgo todo tu tráfico.
                        </p>
                        <div className="grid md:grid-cols-2 gap-8 pt-8">
                            <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/10 text-left space-y-4">
                                <Shield className="w-12 h-12 text-indigo-500 mb-4" />
                                <h3 className="text-2xl font-black uppercase tracking-tight">Sin Censura</h3>
                                <p className="text-gray-400">Publica tus anuncios y contenido de marketing sin filtros automáticos que bloqueen tu crecimiento.</p>
                            </div>
                            <div className="p-10 rounded-[3rem] bg-indigo-600/10 border border-indigo-500/20 text-left space-y-4">
                                <Lock className="w-12 h-12 text-indigo-400 mb-4" />
                                <h3 className="text-2xl font-black uppercase tracking-tight">Sin Miedo a Baneos</h3>
                                <p className="text-gray-400">Nuestra infraestructura es independiente y nativa. Creamos un ecosistema donde tu marca es la prioridad.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Privacy Section */}
            <section className="py-24 md:py-32 relative z-10 pointer-events-none">
                <div className="absolute inset-0 bg-indigo-600/[0.03] skew-y-3"></div>
                <div className="container mx-auto px-6 relative pointer-events-auto">
                    <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24">
                        <div className="lg:w-1/2 space-y-8">
                            <div className="w-20 h-2 bg-indigo-500 rounded-full"></div>
                            <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]">
                                Marketing, <br />
                                <span className="text-indigo-500">Sin Intrusión.</span>
                            </h2>
                            <p className="text-xl text-gray-400 leading-relaxed font-medium">
                                Nunca solicitamos ni almacenamos tu contenido privado. Nebula es tu plataforma para <span className="text-white font-bold">darte a conocer</span>. Una vez captado el cliente, los negocios se cierran por privado.
                            </p>
                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div>
                                    <h4 className="text-indigo-400 font-black text-xs uppercase tracking-widest mb-2">Descubrimiento</h4>
                                    <p className="text-sm text-gray-500">Muestra tu mejor cara y atrae miles de clientes orgánicos.</p>
                                </div>
                                <div>
                                    <h4 className="text-indigo-400 font-black text-xs uppercase tracking-widest mb-2">Trato Directo</h4>
                                    <p className="text-sm text-gray-500">Tú gestionas tus ventas corporativas en tus propios términos.</p>
                                </div>
                            </div>
                        </div>
                        <div className="lg:w-1/2 relative">
                             <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-3xl opacity-50"></div>
                             <div className="relative p-1 rounded-[3rem] bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 backdrop-blur-2xl">
                                <div className="p-12 space-y-8">
                                    <div className="flex gap-4">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-4 w-full bg-white/5 rounded-full"></div>
                                        <div className="h-4 w-3/4 bg-white/5 rounded-full"></div>
                                        <div className="h-4 w-5/6 bg-white/5 rounded-full"></div>
                                        <div className="h-40 w-full bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center justify-center">
                                            <Search className="w-12 h-12 text-indigo-500/30" />
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Mega Grid */}
            <section className="py-24 md:py-32 relative z-10 overflow-hidden" id="herramientas">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-24 space-y-4">
                        <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase">Todo lo que necesitas</h2>
                        <p className="text-gray-500 text-xl">Potenciado por IA, diseñado para el éxito masivo.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* IA Retouch */}
                        <div className="group p-10 rounded-[3rem] bg-white/[0.01] border border-white/5 hover:border-indigo-500/30 transition-all hover:bg-white/[0.03]">
                            <Sparkles className="w-12 h-12 text-indigo-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Retoque con IA</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Mejora tus fotos, elimina imperfecciones y cambia fondos automáticamente para lucir siempre impecable.</p>
                        </div>

                        {/* Bot Business */}
                        <div className="group p-10 rounded-[3rem] bg-white/[0.01] border border-white/5 hover:border-purple-500/30 transition-all hover:bg-white/[0.03]">
                            <Bot className="w-12 h-12 text-purple-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Bot Business IA</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Víncula nuestro bot a tu perfil. Responderá con IA a tus fans y publicará victorias en tus historias de Telegram.</p>
                        </div>

                        {/* Scheduler */}
                        <div className="group p-10 rounded-[3rem] bg-white/[0.01] border border-white/5 hover:border-blue-500/30 transition-all hover:bg-white/[0.03]">
                            <Calendar className="w-12 h-12 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Programación Total</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Organiza tu contenido y deja que Nebula se encargue de publicar en el feed automáticamente.</p>
                        </div>

                        {/* Wheel Casino */}
                        <div className="group p-10 rounded-[3rem] bg-white/[0.01] border border-white/5 hover:border-pink-500/30 transition-all hover:bg-white/[0.03]">
                            <TrendingUp className="w-12 h-12 text-pink-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Casino Virtual</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Ruleta de la suerte integrada en tu perfil. Gana dinero extra mientras tus clientes prueban su suerte.</p>
                        </div>

                        {/* Wallet */}
                        <div className="group p-10 rounded-[3rem] bg-white/[0.01] border border-white/5 hover:border-green-500/30 transition-all hover:bg-white/[0.03]">
                            <Wallet className="w-12 h-12 text-green-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Billetera Cripto</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Pagos casi instantáneos y totalmente seguros con criptografía de grado militar.</p>
                        </div>

                        {/* Hub Perfil */}
                        <div className="group p-10 rounded-[3rem] bg-white/[0.01] border border-white/5 hover:border-orange-500/30 transition-all hover:bg-white/[0.03]">
                            <Users className="w-12 h-12 text-orange-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Perfil Premium</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Centraliza tus redes, servicios y catálogo en un hub visual que enamora a tus fans.</p>
                        </div>

                        {/* Escrow */}
                        <div className="group p-10 rounded-[3rem] bg-white/[0.01] border border-white/5 hover:border-cyan-500/30 transition-all hover:bg-white/[0.03]">
                            <Scale className="w-12 h-12 text-cyan-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Pagos Scrow</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Protección total contra fraudes. Nadie cobra hasta que el servicio se entrega conforme.</p>
                        </div>

                        {/* SFS Bot */}
                        <div className="group p-10 rounded-[3rem] bg-white/[0.01] border border-white/5 hover:border-violet-500/30 transition-all hover:bg-white/[0.03]">
                            <Share2 className="w-12 h-12 text-violet-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Bot SFS Auto</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Crece orgánicamente con intercambios automáticos verificados con otras creadoras de la red.</p>
                        </div>

                        {/* AI Growth */}
                        <div className="group p-10 rounded-[3rem] bg-white/[0.01] border border-white/5 hover:border-amber-500/30 transition-all hover:bg-white/[0.03]">
                            <TrendingUp className="w-12 h-12 text-amber-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Análisis Estratégico IA</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Nuestra IA analiza tu perfil y te da consejos reales para multiplicar tus ventas y seguidores.</p>
                        </div>
                    </div>
                </div>
            </section>

             {/* Final CTA High Impact */}
             <section className="py-24 md:py-40 relative overflow-hidden z-10" id="creator-login-section">
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-indigo-600/10 to-transparent"></div>
                
                <div className="container mx-auto px-6 relative">
                    <div className="max-w-5xl mx-auto text-center space-y-16">
                        <h2 className="text-5xl md:text-9xl font-black tracking-tighter uppercase leading-[0.8] mb-12">
                            Tu Imperio, <br />
                            <span className="text-indigo-500">Nativo.</span>
                        </h2>
                        
                        <div className="relative inline-block group">
                            <div className="absolute -inset-4 bg-indigo-500 opacity-20 blur-2xl rounded-full group-hover:opacity-40 transition-opacity"></div>
                            <button
                                onClick={handleTelegramLogin}
                                disabled={loginLoading || !botId}
                                className={`relative w-full max-w-md px-16 py-8 rounded-[2rem] font-black text-sm md:text-xl uppercase tracking-[.4em] transition-all duration-500 flex items-center justify-center gap-6 overflow-hidden shadow-2xl ${
                                    loginLoading ? 'opacity-70 scale-95' : 'hover:scale-105 active:scale-95'
                                }`}
                                style={{
                                    background: 'linear-gradient(135deg, #0088cc 0%, #00aaee 100%)',
                                }}
                            >
                                {loginLoading ? (
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                    </svg>
                                )}
                                <span className="text-white">
                                    {loginLoading ? 'Conectando...' : 'Acceso Nativo'}
                                </span>
                            </button>
                        </div>
                        
                        <div className="flex flex-wrap justify-center items-center gap-10 opacity-30 mt-8">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Crypto Secure</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">No Logs Content</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">AI Enhanced</span>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-24 border-t border-white/5 bg-black z-20 relative">
                <div className="container mx-auto px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-16">
                        <div className="space-y-6">
                            <div className="font-black tracking-tighter text-3xl">NEBULA<span className="text-indigo-500">STAR</span></div>
                            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.5em] max-w-xs leading-loose">
                                Potenciando la libertad creativa mediante tecnología nativa de Telegram.
                            </p>
                        </div>
                    </div>
                    <div className="mt-16 pt-8 border-t border-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-700 text-center">
                        © 2026 NEBULA STAR GLOBAL - SIN CENSURA, SIN LÍMITES.
                    </div>
                </div>
            </footer>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                .animate-float {
                    animation: float 6s infinite ease-in-out;
                }
            `}} />
        </div>
    );
};

export default CreatorLanding;
