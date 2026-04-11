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
                setBotId(usernameRes.data.username ? idRes.data.bot_id : null);
            } catch (err) {
                setBotUsername('NebulaModels_bot');
                console.error('[Auth] Error cargando config del bot de fans:', err);
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
                        // El backend ahora detectará el bot_id y asignará role='client'
                        await loginWithTelegram(data);
                        navigate('/');
                    } catch (error) {
                        console.error('[FanLanding] Login error:', error);
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
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.5)]">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            NEBULA<span className="text-pink-500">.FANS</span>
                        </span>
                    </div>
                    <div className="hidden md:flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                        <a href="#models" className="hover:text-white transition-colors">Modelos</a>
                        <a href="#seguridad" className="hover:text-white transition-colors">Seguridad</a>
                        <a href="#vip" className="hover:text-white transition-colors">Experiencia VIP</a>
                    </div>
                    <button onClick={scrollToLogin} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-pink-500/50 transition-all font-bold text-xs uppercase tracking-widest backdrop-blur-md">
                        Entrar
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center justify-center pt-20 px-4 z-10">
                <div className="container mx-auto text-center space-y-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-pink-500/20 bg-pink-900/10 text-pink-300 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Experiencia VIP Garantizada</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black leading-tight tracking-tighter max-w-5xl mx-auto">
                        Conecta con el <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                            Top de Modelos
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        Descubre un ecosistema exclusivo donde la belleza se une a la seguridad. Modelos reales, reseñas verificadas y contenido premium esperándote.
                    </p>

                    <button onClick={scrollToLogin} className="px-10 py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-pink-600 hover:text-white transition-all shadow-xl">
                        Explorar Ahora
                    </button>
                </div>
            </section>

            {/* Models Preview */}
            <section className="py-24 relative z-10" id="models">
                <div className="container mx-auto px-6">
                    <h2 className="text-4xl font-black tracking-tighter mb-12">Nuestras Estrellas</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {modelsPreview.length > 0 ? (
                            modelsPreview.map((m) => (
                                <div key={m.id} className="group relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/5 cursor-pointer" onClick={scrollToLogin}>
                                    <img src={m.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop'} alt={m.artistic_name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                                    <div className="absolute bottom-0 left-0 right-0 p-6">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-lg">{m.artistic_name || m.username}</h4>
                                            {m.is_verified && <Check className="w-4 h-4 text-pink-400 bg-white rounded-full p-0.5" />}
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

            {/* Features */}
            <section className="py-32 relative z-10 bg-black/40" id="seguridad">
                <div className="container mx-auto px-6 grid md:grid-cols-2 gap-24 items-center">
                    <div className="space-y-8">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
                            Tu Seguridad es <br />
                            <span className="text-pink-500">Nuestra Prioridad</span>.
                        </h2>
                        <p className="text-lg text-gray-500">
                            Pagos protegidos, anonimato garantizado y modelos 100% reales. Disfruta sin preocupaciones en el ecosistema Nebula.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <Shield className="w-12 h-12 text-pink-400" />
                                <h4 className="font-bold">Pagos Escrow</h4>
                                <p className="text-sm text-gray-500">Tu dinero está seguro hasta que el servicio sea realizado.</p>
                            </div>
                            <div className="space-y-4">
                                <Lock className="w-12 h-12 text-indigo-400" />
                                <h4 className="font-bold">Privacidad Total</h4>
                                <p className="text-sm text-gray-500">Inicia sesión con Telegram, sin correos ni contraseñas.</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                         <div className="absolute inset-0 bg-pink-500/10 blur-[100px] rounded-full"></div>
                         <div className="relative p-12 bg-white/[0.02] border border-white/10 rounded-[3rem] backdrop-blur-3xl">
                             <h3 className="text-3xl font-black mb-6">Únete a la Comunidad</h3>
                             <p className="text-gray-400 mb-8">Accede a contenido exclusivo y sorteos diarios conectando tu cuenta.</p>
                             <button onClick={scrollToLogin} className="w-full py-4 bg-pink-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-pink-500 transition-all flex items-center justify-center gap-2">
                                 <Heart className="w-4 h-4" /> Registrarme como Fan
                             </button>
                         </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-48 relative text-center z-10" id="login-section">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto space-y-12">
                        <h2 className="text-6xl md:text-9xl font-black tracking-tighter mb-12 text-pink-100">
                            Disfruta el Futuro.
                        </h2>
                        <div className="flex flex-col items-center gap-10 border border-pink-500/10 p-8 md:p-16 rounded-[4rem] bg-black/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                            <p className="text-xl text-gray-400 font-bold max-w-xl">Inicia sesión con tu bot de confianza para acceder a todo el contenido.</p>
                            
                            <button
                                onClick={handleTelegramLogin}
                                disabled={loginLoading || !botId}
                                className={`group relative w-full max-w-[360px] px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-4 overflow-hidden ${
                                    loginLoading ? 'opacity-70' : 'hover:scale-[1.03] shadow-lg'
                                }`}
                                style={{
                                    background: 'linear-gradient(135deg, #0088cc 0%, #00aaee 50%, #0077b5 100%)',
                                }}
                            >
                                {loginLoading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                    </svg>
                                )}
                                <span className="text-white font-black">
                                    {loginLoading ? 'Conectando...' : 'Entrar con Telegram'}
                                </span>
                            </button>
                            
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600 flex items-center justify-center gap-3">
                                <Lock className="w-3 h-3" /> Conexión Segura
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-12 border-t border-white/5 bg-black z-20 relative">
                <div className="container mx-auto px-6 flex justify-between items-center opacity-40">
                    <div className="font-black tracking-tighter text-sm">NEBULA.FANS</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">© 2026 Portal de Entretenimiento</div>
                </div>
            </footer>
        </div>
    );
};

export default FanLanding;
