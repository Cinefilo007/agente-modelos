/* eslint-disable react/no-unknown-property */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import {
    Shield, Zap, Heart, Star, ChevronRight,
    Check, Coins, UserCheck, Activity, Lock
} from 'lucide-react';

import { BenefitCard, StatItem, DecorativeDivider } from '../components/landing/LandingComponents';
import { getOptimizedUrl, IMAGE_PRESETS } from '../utils/image';

const FanLanding = () => {
    const { loginWithTelegram } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [scrolled, setScrolled] = useState(false);
    const [modelsPreview, setModelsPreview] = useState([]);
    const [botUsername, setBotUsername] = useState(null);
    const [botId, setBotId] = useState(null);
    const [loginLoading, setLoginLoading] = useState(false);

    // Scroll effect for navbar
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Get models for Fan Landing
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await api.get('/profile/models/explore?filter=top');
                setModelsPreview(res.data.slice(0, 4));
            } catch (err) {
                console.error("Error fetching preview models:", err);
            }
        };
        fetchModels();
    }, []);

    // Cargar configuración del bot de FANS
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const [usernameRes, idRes] = await Promise.all([
                    api.get('/config/fan-bot-username'),
                    api.get('/config/fan-bot-id')
                ]);
                setBotUsername(usernameRes.data.username);
                setBotId(idRes.data.bot_id || idRes.data.id); // Depende de cómo lo devuelva el endpoint
            } catch (err) {
                setBotUsername('NebulaModels_bot');
                console.error('[Auth] Error cargando config del bot de fans:', err);
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
            console.log('[FanLanding] Detectada Mini App, usando initData...');
            try {
                // El login se maneja usualmente por el AuthContext al iniciar,
                // pero si el usuario hace clic explícitamente, re-validamos.
                const response = await api.post('/auth/webapp', {
                    init_data: window.Telegram.WebApp.initData
                });
                const { access_token, user: userData, role } = response.data;
                const fullUser = { ...userData, role };
                
                localStorage.setItem('token', access_token);
                localStorage.setItem('user', JSON.stringify(fullUser));
                navigate('/');
            } catch (error) {
                console.error('[FanLanding] WebApp login failed:', error);
                showToast('Error al conectar con Telegram nativo.', 'error');
            } finally {
                setLoginLoading(false);
            }
            return;
        }

        // 2. Flujo de Navegador Estándar (Login Widget / Popup)
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
                        console.error('[FanLanding] Browser login error:', error);
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
        document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="min-h-screen bg-[#02010a] text-white font-sans selection:bg-pink-500 selection:text-white overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#02010a]">
                <div className="absolute top-[-10%] left-[-10%] w-[1000px] h-[1000px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-pink-600/15 rounded-full blur-[150px] animate-pulse delay-1000"></div>
                
                {/* Neon Lines Decor */}
                <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-pink-500/10 to-transparent"></div>
                <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"></div>
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-3 md:py-4' : 'bg-transparent py-4 md:py-6'}`}>
                <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-transform group-hover:rotate-12">
                            <Activity className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <span className="font-black text-xl md:text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            NEBULA<span className="text-pink-500">.FANS</span>
                        </span>
                    </div>
                    <div className="hidden md:flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                        <a href="#models" className="hover:text-white transition-colors">Modelos</a>
                        <a href="#seguridad" className="hover:text-white transition-colors">Seguridad</a>
                        <a href="#experiencia" className="hover:text-white transition-colors">Vip</a>
                    </div>
                    <button onClick={scrollToLogin} className="px-4 py-2 md:px-6 md:py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-pink-500/50 transition-all font-bold text-[10px] uppercase tracking-widest backdrop-blur-md">
                        Entrar
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-[85vh] flex items-center justify-center pt-20 md:pt-24 px-4 z-10 overflow-hidden">
                <div className="container mx-auto text-center space-y-8 md:space-y-12">
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-pink-500/30 bg-pink-500/5 text-pink-300 backdrop-blur-md animate-bounce-slow">
                        <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em]">El Ecosistema más Exclusivo</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-black leading-[0.9] md:leading-[0.85] tracking-tighter max-w-6xl mx-auto uppercase">
                        El Ecosistema <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                            más Exclusivo
                        </span>
                    </h1>

                    <p className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium px-4">
                        Reunimos y verificamos a las mejores creadoras de Telegram en una plataforma <span className="text-white font-bold">100% segura</span>. Sin intermediarios, conexión directa.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 pt-4">
                        <button onClick={scrollToLogin} className="group relative w-full sm:w-auto px-10 py-5 md:px-12 md:py-6 bg-white text-black rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-pink-600 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 overflow-hidden">
                            Explorar Creadoras
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
                
                {/* Mouse Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
                    <div className="w-5 h-8 border-2 border-white rounded-full flex justify-center p-1">
                        <div className="w-1 h-2 bg-white rounded-full animate-scroll-dot"></div>
                    </div>
                </div>
            </section>

            <DecorativeDivider />

            {/* Models Preview */}
            <section className="py-16 relative z-10" id="models">
                <div className="container mx-auto px-6">
                    <div className="flex justify-between items-end mb-16 px-4">
                        <div>
                            <h2 className="text-3xl md:text-7xl font-black tracking-tighter uppercase mb-2">Estrellas <span className="text-pink-500">Nebula</span></h2>
                            <p className="text-gray-500 text-xs md:text-base font-medium uppercase tracking-widest">Verificadas y listas para conectar</p>
                        </div>
                        <button onClick={scrollToLogin} className="text-[9px] md:text-xs font-black uppercase tracking-widest text-pink-500 hover:text-white transition-colors pb-2 border-b border-pink-500/20">Ver Todo</button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                        {modelsPreview.length > 0 ? (
                            modelsPreview.map((m) => (
                                <div 
                                    key={m.id} 
                                    className="group relative aspect-[3/4] rounded-[2.5rem] overflow-hidden border border-white/5 cursor-pointer shadow-2xl transition-all hover:border-pink-500/50" 
                                    onClick={scrollToLogin}
                                >
                                    <img 
                                        src={getOptimizedUrl(m.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop', IMAGE_PRESETS.FEED)} 
                                        alt={m.artistic_name} 
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" 
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-40 transition-opacity"></div>
                                    
                                    <div className="absolute top-3 left-3 md:top-4 md:left-4">
                                        <div className="px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-1.5 md:gap-2">
                                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse"></div>
                                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Online</span>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                        <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 max-w-full">
                                            <h4 className="font-black text-[12px] md:text-2xl tracking-tighter uppercase truncate">{m.artistic_name || m.username}</h4>
                                            {m.is_verified && <Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-black bg-pink-500 rounded-full p-0.5 md:p-1 shrink-0" />}
                                        </div>
                                        <div className="flex gap-3 md:gap-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <div className="text-[8px] md:text-[10px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1">
                                                <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 fill-pink-500 text-pink-500" />
                                                12.4k
                                            </div>
                                            <div className="text-[8px] md:text-[10px] font-bold text-gray-300 uppercase tracking-widest">450 Posts</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            [1, 2, 3, 4].map(i => (
                                <div key={i} className="aspect-[3/4] rounded-[2.5rem] bg-white/5 animate-pulse border border-white/5"></div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Features Detail */}
            <section className="py-20 relative z-10" id="seguridad">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase">La plataforma <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">que mereces</span></h2>
                        <p className="text-gray-500 text-lg">Centralizamos, verificamos y protegemos tu conexión con las estrellas más exclusivas de Telegram.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <BenefitCard 
                            icon={Shield} 
                            color="pink"
                            title="Escrow Blindado" 
                            desc="Tu saldo se libera solo cuando el servicio se completa. Seguridad bancaria para tu entretenimiento." 
                        />
                        <BenefitCard 
                            icon={Zap} 
                            color="purple"
                            title="Telegram Nativo" 
                            desc="Sin descargas, sin webs complejas. Todo funciona dentro de tu app de mensajería favorita." 
                        />
                        <BenefitCard 
                            icon={Lock} 
                            color="indigo"
                            title="Anonimato Total" 
                            desc="Nadie sabrá quién eres. Solo tu ID de Telegram es necesario para vivir la experiencia Nebula." 
                        />
                    </div>
                </div>
            </section>

            {/* Experience / Stats */}
            <section className="py-16 md:py-24 relative z-10 bg-white/5 backdrop-blur-sm border-y border-white/10" id="experiencia">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 text-center md:text-left">
                        <StatItem number="+25k" label="Fans Activos" />
                        <StatItem number="+500" label="Modelos VIP" />
                        <StatItem number="100%" label="Seguridad" />
                        <StatItem number="24/7" label="Soporte VIP" />
                    </div>
                </div>
            </section>

            {/* Final CTA High Impact */}
            <section className="py-16 md:py-24 relative overflow-hidden z-10" id="login-section">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-500/5 to-transparent"></div>
                
                <div className="container mx-auto px-6 relative">
                    <div className="max-w-5xl mx-auto text-center space-y-12 md:space-y-16">
                        <h2 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.9] md:leading-[0.8] mb-8 px-2">
                            Empieza el <br />
                            <span className="text-pink-500">Espectáculo.</span>
                        </h2>
                        
                        <div className="flex flex-col items-center gap-8 md:gap-10 border border-white/10 p-8 md:p-20 rounded-[2.5rem] md:rounded-[4rem] bg-black/60 backdrop-blur-3xl shadow-3xl relative mx-auto max-w-[95%]">
                            {/* Decorative blur */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 md:w-64 h-48 md:h-64 bg-pink-500/20 blur-[80px] md:blur-[100px] pointer-events-none"></div>
                            
                            <p className="text-lg md:text-2xl text-gray-400 font-bold max-w-xl px-2">
                                Solo necesitas un clic para conectar con nuestro bot y desbloquear todo el contenido.
                            </p>
                            
                            <button
                                onClick={handleTelegramLogin}
                                disabled={loginLoading || !botId}
                                className={`group relative w-full max-w-[400px] px-8 py-5 md:px-10 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-[12px] md:text-sm uppercase tracking-[.25em] transition-all duration-500 flex items-center justify-center gap-4 overflow-hidden shadow-2xl ${
                                    loginLoading ? 'opacity-70 scale-95' : 'hover:scale-105 hover:shadow-pink-500/20'
                                }`}
                                style={{
                                    background: 'linear-gradient(135deg, #0088cc 0%, #00aaee 50%, #0077b5 100%)',
                                }}
                            >
                                {loginLoading ? (
                                    <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-7 md:h-7 fill-white group-hover:rotate-12 transition-transform">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                    </svg>
                                )}
                                <span className="text-white font-black text-xs md:text-base">
                                    {loginLoading ? 'Conectando...' : 'Conectar Telegram'}
                                </span>
                                
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                            </button>
                            
                            <div className="flex items-center gap-4 md:gap-6 opacity-40">
                                <div className="flex items-center gap-2">
                                    <Lock size={10} />
                                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">Cifrado SSL</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-white/30"></div>
                                <div className="flex items-center gap-2">
                                    <UserCheck size={10} />
                                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">Verified</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-20 border-t border-white/5 bg-black z-20 relative">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex flex-col items-center md:items-start gap-4">
                            <div className="font-black tracking-tighter text-2xl">NEBULA<span className="text-pink-500">.FANS</span></div>
                            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.3em]">El estándar de oro para fans exigentes.</p>
                        </div>
                        <div className="flex gap-12 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
                            <a href="#" className="hover:text-white transition-colors">Términos</a>
                            <a href="#" className="hover:text-white transition-colors">Contacto</a>
                        </div>
                    </div>
                    <div className="mt-16 pt-8 border-t border-white/5 text-center text-[10px] font-bold uppercase tracking-widest text-gray-700">
                        © 2026 Nebula Ecosystem • All Rights Reserved
                    </div>
                </div>
            </footer>
            
            {/* Global Animation Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scroll-dot {
                    0%, 100% { transform: translateY(0); opacity: 0; }
                    50% { transform: translateY(10px); opacity: 1; }
                }
                .animate-scroll-dot {
                    animation: scroll-dot 2s infinite ease-in-out;
                }
                .animate-bounce-slow {
                    animation: bounce 3s infinite;
                }
            `}} />
        </div>
    );
};

export default FanLanding;
