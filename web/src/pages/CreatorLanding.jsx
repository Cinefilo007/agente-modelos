/* eslint-disable react/no-unknown-property */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import {
    Shield, Zap, Star, Activity, Cpu, 
    CircleDollarSign, TrendingUp, Sparkles, BarChart3, Bot, Globe, Check, Lock
} from 'lucide-react';
import modelProfilePreview from '../assets/landing/model-profile-preview.jpg';

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

    // Cargar configuración del bot de CREADORAS
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const [usernameRes, idRes] = await Promise.all([
                    api.get('/config/bot-username'),
                    api.get('/config/bot-id')
                ]);
                setBotUsername(usernameRes.data.username);
                setBotId(idRes.data.bot_id);
            } catch (err) {
                setBotUsername('AgenteNebulaIA_bot');
                console.error('[Auth] Error cargando config del bot de creadoras:', err);
            }
        };
        fetchConfig();
    }, []);

    const handleTelegramLogin = () => {
        if (!botId) {
            showToast('Error de configuración del bot. Intenta más tarde.', 'error');
            return;
        }

        setLoginLoading(true);

        if (window.Telegram && window.Telegram.Login) {
            window.Telegram.Login.auth(
                { bot_id: botId, request_access: 'write', lang: 'es' },
                async (data) => {
                    if (!data) {
                        setLoginLoading(false);
                        return;
                    }
                    try {
                        // El backend ahora detectará el bot_id y asignará role='model'
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
        document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="min-h-screen bg-[#02010a] text-white font-sans selection:bg-purple-500 selection:text-white overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#02010a]">
                <div className="absolute top-[-10%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-600/20 rounded-full blur-[150px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-purple-600/15 rounded-full blur-[150px] animate-pulse delay-1000"></div>
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.5)]">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            NEBULA<span className="text-purple-500">.CREATORS</span>
                        </span>
                    </div>
                    <div className="hidden md:flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                        <a href="#ventajas" className="hover:text-white transition-colors">Ventajas</a>
                        <a href="#tecnologia" className="hover:text-white transition-colors">Tecnología</a>
                        <a href="#ganancias" className="hover:text-white transition-colors">Pagos</a>
                    </div>
                    <button onClick={scrollToLogin} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all font-bold text-xs uppercase tracking-widest backdrop-blur-md">
                        Unirme Ahora
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center justify-center pt-20 px-4 z-10">
                <div className="container mx-auto text-center space-y-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/20 bg-purple-900/10 text-purple-300 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Agencia de Modelos 3.0</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black leading-tight tracking-tighter max-w-5xl mx-auto">
                        Monetiza tu contenido con <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                            Poder de IA
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        No somos solo una plataforma, somos tu equipo de soporte 24/7. Automatiza tus ventas, protege tu anonimato y escala tus ingresos en Telegram.
                    </p>

                    <button onClick={scrollToLogin} className="px-10 py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all shadow-xl">
                        Empezar Imperio
                    </button>
                </div>
            </section>

            {/* Comparison Section */}
            <section className="py-32 relative z-10 bg-black/40" id="ventajas">
                <div className="container mx-auto px-6">
                    <div className="max-w-5xl mx-auto space-y-16">
                        <h2 className="text-4xl font-black uppercase tracking-widest text-center">Por qué Nebula</h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            <BenefitCard icon={Cpu} title="Venta por IA" desc="Nuestros agentes IA cierran ventas por ti en los DMs mientras descansas." />
                            <BenefitCard icon={Shield} title="Blindaje Anti-Baneo" desc="Arquitectura propia para que nunca pierdas tu comunidad ni tus ganancias." />
                            <BenefitCard icon={TrendingUp} title="SFS Automatizado" desc="Promociones cruzadas automáticas en nuestro feed y red de canales." />
                            <BenefitCard icon={CircleDollarSign} title="Pagos Instantáneos" desc="Recibe tus ganancias en USDT o Crypto sin intermediarios bancarios." />
                        </div>
                    </div>
                </div>
            </section>

             {/* Profile Preview */}
             <section className="py-32 relative z-10" id="tecnologia">
                <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
                    <div className="relative border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
                        <img src={modelProfilePreview} alt="Perfil Nebula" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-8">
                        <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight">
                            Tu Tienda. <br />
                            <span className="text-purple-500">Tus Reglas.</span>
                        </h2>
                        <p className="text-xl text-gray-500">Gestiona videollamadas, sexting, Dick Rates y ventas de contenido desde un solo panel profesional.</p>
                        <div className="space-y-4">
                            <div className="flex gap-4 items-start">
                                <Check className="w-6 h-6 text-green-500 shrink-0" />
                                <span className="font-bold">Social Links Integrados (TikTok, IG, X)</span>
                            </div>
                            <div className="flex gap-4 items-start">
                                <Check className="w-6 h-6 text-green-500 shrink-0" />
                                <span className="font-bold">Chat Manager IA Personalizable</span>
                            </div>
                            <div className="flex gap-4 items-start">
                                <Check className="w-6 h-6 text-green-500 shrink-0" />
                                <span className="font-bold">Métricas Detalladas de Venta</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-48 relative text-center z-10" id="login-section">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto space-y-12">
                        <h2 className="text-6xl md:text-9xl font-black tracking-tighter mb-12 text-purple-100">
                            Únete a la Elite.
                        </h2>
                        <div className="flex flex-col items-center gap-10 border border-purple-500/10 p-8 md:p-16 rounded-[4rem] bg-black/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                            <p className="text-xl text-gray-400 font-bold max-w-xl">Inicia sesión con nuestro bot administrativo para postularte como modelo.</p>
                            
                            <button
                                onClick={handleTelegramLogin}
                                disabled={loginLoading || !botId}
                                className="group relative w-full max-w-[360px] px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-4 overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, #0088cc 0%, #00aaee 50%, #0077b5 100%)' }}
                            >
                                {loginLoading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                    </svg>
                                )}
                                <span className="text-white font-black">
                                    {loginLoading ? 'Iniciando...' : 'Aplicar con Telegram'}
                                </span>
                            </button>
                            
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600 flex items-center justify-center gap-3">
                                <Lock className="w-3 h-3" /> Postulación Segura
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-12 border-t border-white/5 bg-black z-20 relative">
                <div className="container mx-auto px-6 flex justify-between items-center opacity-40">
                    <div className="font-black tracking-tighter text-sm">NEBULA.AGENCY</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">© 2026 Plataforma de Creadores</div>
                </div>
            </footer>
        </div>
    );
};

const BenefitCard = ({ icon: Icon, title, desc }) => (
    <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6 text-purple-400" />
        </div>
        <h4 className="text-xl font-bold mb-3">{title}</h4>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
);

export default CreatorLanding;
