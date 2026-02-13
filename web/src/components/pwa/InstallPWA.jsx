import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InstallPWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            // Prevenir que el navegador muestre el prompt automático
            e.preventDefault();
            // Guardar el evento para dispararlo luego
            setDeferredPrompt(e);
            // Mostrar nuestro banner personalizado después de unos segundos
            setTimeout(() => {
                setShowBanner(true);
            }, 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Si ya está instalada, no mostrar nada
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowBanner(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        // Mostrar el prompt del navegador
        deferredPrompt.prompt();

        // Esperar la respuesta del usuario
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User choice: ${outcome}`);

        // Limpiar el estado
        setDeferredPrompt(null);
        setShowBanner(false);
    };

    return (
        <AnimatePresence>
            {showBanner && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-8 md:bottom-8 md:w-80"
                >
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-2xl shadow-2xl flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                    <Download className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-sm">Instalar Aplicación</h3>
                                    <p className="text-zinc-400 text-xs mt-0.5">Disfruta de una experiencia premium en tu pantalla de inicio.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBanner(false)}
                                className="text-zinc-500 hover:text-white p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={handleInstall}
                            className="w-full bg-white text-black font-bold py-2.5 rounded-xl text-sm transition-transform active:scale-95 flex items-center justify-center gap-2 hover:bg-zinc-200"
                        >
                            Instalar ahora
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InstallPWA;
