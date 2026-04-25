/* eslint-disable react/no-unknown-property */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, ChevronRight, Activity } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#02010a] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[1000px] h-[1000px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/15 rounded-full blur-[150px] animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 max-w-4xl w-full text-center space-y-12">
                <div className="flex flex-col items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-transform hover:rotate-12 duration-500">
                        <Activity className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight uppercase">
                        Bienvenido a <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500">
                            Nebula Agency
                        </span>
                    </h1>
                    <p className="text-xl text-gray-400 font-medium">Selecciona tu experiencia para continuar</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mt-12">
                    {/* Tarjeta de FANS */}
                    <div onClick={() => navigate('/fans')}
                        className="group p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 hover:border-purple-500/50 hover:bg-white/[0.06] transition-all cursor-pointer relative overflow-hidden text-left shadow-2xl backdrop-blur-sm"
                    >
                        <div className="absolute top-[-20px] right-[-20px] p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                            <Heart size={200} className="text-purple-500" />
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-8 border border-purple-500/30 group-hover:scale-110 transition-transform">
                            <Heart className="w-8 h-8 text-purple-400" />
                        </div>
                        <h3 className="text-3xl font-black mb-4">Soy Fan</h3>
                        <p className="text-gray-400 leading-relaxed mb-8">
                            Descubre modelos exclusivas, verificadas y listas para complacerte en un entorno seguro y divertido.
                        </p>
                        <div className="flex items-center gap-2 text-purple-400 font-black uppercase tracking-widest text-xs group-hover:gap-4 transition-all">
                            Explorar Modelos <ChevronRight size={16} />
                        </div>
                    </div>

                    {/* Tarjeta de CREADORAS */}
                    <div onClick={() => navigate('/creators')}
                        className="group p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.06] transition-all cursor-pointer relative overflow-hidden text-left shadow-2xl backdrop-blur-sm"
                    >
                        <div className="absolute top-[-20px] right-[-20px] p-8 opacity-5 group-hover:opacity-10 transition-opacity -rotate-12">
                            <Star size={200} className="text-pink-500" />
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-pink-500/20 flex items-center justify-center mb-8 border border-pink-500/30 group-hover:scale-110 transition-transform">
                            <Star className="w-8 h-8 text-pink-400" />
                        </div>
                        <h3 className="text-3xl font-black mb-4">Soy Creadora</h3>
                        <p className="text-gray-400 leading-relaxed mb-8">
                            Monetiza tu contenido con IA, seguridad total y las herramientas más potentes del mercado en Telegram.
                        </p>
                        <div className="flex items-center gap-2 text-pink-400 font-black uppercase tracking-widest text-xs group-hover:gap-4 transition-all">
                            Empezar mi Imperio <ChevronRight size={16} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6 pt-12">
                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.5em] opacity-50">v2.5.0 Codename: Dual Star</p>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
