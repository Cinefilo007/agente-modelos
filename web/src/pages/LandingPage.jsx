/* eslint-disable react/no-unknown-property */
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const { loginWithTelegram } = useAuth();
    const navigate = useNavigate();
    const telegramWrapperRef = useRef(null);

    useEffect(() => {
        // Prevent duplicate script injection
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

        if (telegramWrapperRef.current) {
            telegramWrapperRef.current.appendChild(script);
        }

        window.onTelegramAuth = async (user) => {
            try {
                await loginWithTelegram(user);
                navigate('/');
            } catch (error) {
                alert(error.response?.data?.detail || "Login failed");
            }
        };

        return () => {
            window.onTelegramAuth = undefined;
        }
    }, [loginWithTelegram, navigate]);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-900 to-black z-0"></div>

            {/* Decorative Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-color-dodge filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600 rounded-full mix-blend-color-dodge filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

            {/* Content */}
            <div className="relative z-10 text-center max-w-4xl px-4 flex flex-col items-center">
                <h1 className="text-6xl md:text-8xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg">
                    AGENTE NEBULA
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 mb-12 font-light tracking-wide max-w-2xl">
                    La plataforma de gestión para modelos más exclusiva y segura.
                    Únete a nuestra comunidad hoy.
                </p>

                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10 w-full max-w-md transform hover:scale-105 transition-all duration-300">
                    <h2 className="text-2xl font-bold mb-8 text-white">Iniciar Sesión</h2>
                    <div ref={telegramWrapperRef} className="flex justify-center mb-6"></div>
                    <p className="text-xs text-gray-500 mt-4">
                        Al iniciar sesión, aceptas nuestros términos y condiciones.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-gray-600 text-xs tracking-widest uppercase">
                © 2024 Agente Nebula IA • Secure Platform
            </div>
        </div>
    );
};

export default LandingPage;
