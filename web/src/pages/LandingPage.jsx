/* eslint-disable react/no-unknown-property */
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Heart, Globe, Lock, Star, ChevronRight, TrendingUp } from 'lucide-react'; // Assuming lucide-react is installed or I'll use SVGs

// Fallback SVGs if lucide-react is not available (which it likely isn't based on previous file lists)
const Icon = ({ name, className }) => {
    // Simple SVG paths for used icons
    const icons = {
        shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
        zap: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
        heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
        globe: <circle cx="12" cy="12" r="10" />, // simplified
        lock: <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a7 7 0 00-14 0v2" />,
        star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
        chevron: <polyline points="9 18 15 12 9 6" />,
        trending: <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    };
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            {icons[name] || <circle cx="12" cy="12" r="10" />}
        </svg>
    );
};

const LandingPage = () => {
    const { loginWithTelegram } = useAuth();
    const navigate = useNavigate();
    const telegramWrapperRef = useRef(null);
    const [activeTab, setActiveTab] = useState('models'); // 'models' or 'clients'

    useEffect(() => {
        if (telegramWrapperRef.current && telegramWrapperRef.current.innerHTML !== "") return;
        const script = document.createElement('script');
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute('data-telegram-login', 'AgenteNebulaIA_bot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '10');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.async = true;
        if (telegramWrapperRef.current) telegramWrapperRef.current.appendChild(script);

        window.onTelegramAuth = async (user) => {
            try { await loginWithTelegram(user); navigate('/'); }
            catch (error) { alert(error.response?.data?.detail || "Login failed"); }
        };
        return () => { window.onTelegramAuth = undefined; }
    }, [loginWithTelegram, navigate]);

    return (
        <div className="min-h-screen bg-[#050510] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white overflow-x-hidden">

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/10 bg-black/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 animate-pulse"></div>
                        <span className="font-bold text-xl tracking-wider">AGENTE <span className="text-purple-400">NEBULA</span></span>
                    </div>
                    <button onClick={() => telegramWrapperRef.current?.scrollIntoView({ behavior: 'smooth' })} className="px-6 py-2 rounded-full border border-white/20 hover:bg-white/10 transition-all font-medium text-sm">
                        Acceder
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center pt-20">
                {/* Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-pink-600/20 rounded-full blur-[120px]"></div>
                </div>

                <div className="container mx-auto px-4 z-10 grid md:grid-cols-2 gap-12 items-center">
                    <div className="text-left space-y-6">
                        <div className="inline-flex items-center px-4 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-bold uppercase tracking-widest mb-4">
                            <span className="w-2 h-2 rounded-full bg-purple-400 mr-2 animate-ping"></span>
                            Revolución IA 2.0
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black leading-tight">
                            El Futuro de la <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                                Gestión Digital
                            </span>
                        </h1>
                        <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
                            Optimiza tu carrera, automatiza tus ventas y conecta con una comunidad exclusiva.
                            Todo potenciado por Inteligencia Artificial y la seguridad de Telegram.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <button onClick={() => telegramWrapperRef.current?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                Comenzar Ahora
                            </button>
                            <button className="px-8 py-4 bg-transparent border border-white/20 rounded-xl hover:bg-white/5 transition-all text-gray-300">
                                Saber Más
                            </button>
                        </div>
                    </div>

                    {/* Hero Visual */}
                    <div className="relative h-[600px] hidden md:block">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050510] via-transparent to-transparent z-10"></div>
                        {/* Image Placeholder - Cyberpunk Fashion Model */}
                        <img
                            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
                            alt="Digital Model"
                            className="w-full h-full object-cover rounded-3xl shadow-2xl opacity-80 mask-image-gradient"
                        />

                        {/* Floating Cards */}
                        <div className="absolute top-10 right-10 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
                            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-400"><Icon name="trending" /></div>
                            <div>
                                <div className="text-xs text-gray-400">Ingresos Mensuales</div>
                                <div className="font-bold text-lg text-green-400">+127% 🚀</div>
                            </div>
                        </div>

                        <div className="absolute bottom-20 left-[-20px] bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400"><Icon name="shield" /></div>
                            <div>
                                <div className="text-xs text-gray-400">Seguridad Activa</div>
                                <div className="font-bold text-sm text-blue-400">Verificado por IA</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Dual Track Section */}
            <section className="py-24 relative bg-black/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Elige tu Camino</h2>
                        <div className="flex justify-center gap-8">
                            <button
                                onClick={() => setActiveTab('models')}
                                className={`pb-2 text-xl font-medium transition-all ${activeTab === 'models' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-white'}`}
                            >
                                Para Modelos
                            </button>
                            <button
                                onClick={() => setActiveTab('clients')}
                                className={`pb-2 text-xl font-medium transition-all ${activeTab === 'clients' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-500 hover:text-white'}`}
                            >
                                Para Miembros
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className={`space-y-8 transition-opacity duration-500 ${activeTab === 'models' ? 'opacity-100' : 'hidden opacity-0'}`}>
                            <div className="feature-card p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all group">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Icon name="zap" /></div>
                                <h3 className="text-xl font-bold mb-2">Asistente de Ventas IA</h3>
                                <p className="text-gray-400">Nuestro bot atiende a tus fans 24/7, filtra curiosos y cierra ventas automáticamente sin que tú muevas un dedo.</p>
                            </div>
                            <div className="feature-card p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all group">
                                <div className="w-12 h-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Icon name="shield" /></div>
                                <h3 className="text-xl font-bold mb-2">Protección Total</h3>
                                <p className="text-gray-400">Sistema anti-filtraciones, marca de agua dinámica y lista negra global compartida entre todas las modelos.</p>
                            </div>
                            <div className="feature-card p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all group">
                                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Icon name="star" /></div>
                                <h3 className="text-xl font-bold mb-2">Marca Personal</h3>
                                <p className="text-gray-400">Tu propio perfil web premium, tienda de contenido y sistema de suscripciones integrado en Telegram.</p>
                            </div>
                        </div>

                        <div className={`space-y-8 transition-opacity duration-500 ${activeTab === 'clients' ? 'opacity-100' : 'hidden opacity-0'}`}>
                            <div className="feature-card p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all group">
                                <div className="w-12 h-12 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Icon name="heart" /></div>
                                <h3 className="text-xl font-bold mb-2">Contenido Exclusivo</h3>
                                <p className="text-gray-400">Accede a una red curada de modelos verificadas. Contenido real, sin estafas ni perfiles falsos.</p>
                            </div>
                            <div className="feature-card p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all group">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Icon name="lock" /></div>
                                <h3 className="text-xl font-bold mb-2">Privacidad Garantizada</h3>
                                <p className="text-gray-400">Tus datos nunca se comparten. Pagos seguros y chat encriptado punto a punto.</p>
                            </div>
                            <div className="feature-card p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all group">
                                <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Icon name="zap" /></div>
                                <h3 className="text-xl font-bold mb-2">Experiencia Rápida</h3>
                                <p className="text-gray-400">Todo sucede en Telegram. Sin registros externos complicados ni apps lentas.</p>
                            </div>
                        </div>

                        {/* Dynamic Image Side */}
                        <div className="h-[500px] relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                            <img
                                src={activeTab === 'models'
                                    ? "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?q=80&w=2669&auto=format&fit=crop" // Business Woman / Creator
                                    : "https://images.unsplash.com/photo-1614030635339-b9a35e4d1f2e?q=80&w=2670&auto=format&fit=crop" // Phone User / Client
                                }
                                alt="Experience"
                                className="w-full h-full object-cover transition-opacity duration-500 hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-8">
                                <div>
                                    <h4 className="text-2xl font-bold">{activeTab === 'models' ? 'Monetiza tu Influencia' : 'Descubre la Excelencia'}</h4>
                                    <p className="text-gray-300 mt-2">{activeTab === 'models' ? 'Las mejores herramientas para creadoras de contenido.' : 'Una comunidad selecta para gustos exigentes.'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Login CTA Section */}
            <section className="py-24 relative overflow-hidden text-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px] z-0"></div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto bg-black/40 backdrop-blur-xl border border-white/10 p-12 rounded-3xl shadow-2xl">
                        <h2 className="text-4xl font-bold mb-6">Únete a la Comunidad</h2>
                        <p className="text-gray-400 mb-8 text-lg">
                            El acceso es exclusivo a través de Telegram para garantizar la seguridad de todos nuestros miembros.
                        </p>

                        <div className="flex justify-center mb-8">
                            <div className="p-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                                <div className="bg-black rounded-full p-4" ref={telegramWrapperRef}>
                                    {/* Widget renders here */}
                                </div>
                            </div>
                        </div>

                        <div className="text-sm text-gray-500 flex items-center justify-center gap-2">
                            <Icon name="lock" className="w-4 h-4" />
                            Acceso Seguro y Encriptado
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 bg-black/80">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                        <div className="font-bold text-lg mb-2">AGENTE NEBULA</div>
                        <p className="text-gray-500 text-sm">© 2024. Todos los derechos reservados.</p>
                    </div>
                    <div className="flex gap-8 text-gray-400 text-sm">
                        <a href="#" className="hover:text-white transition-colors">Términos</a>
                        <a href="#" className="hover:text-white transition-colors">Privacidad</a>
                        <a href="#" className="hover:text-white transition-colors">Soporte</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
