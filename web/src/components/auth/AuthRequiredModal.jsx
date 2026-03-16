import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LogIn, UserPlus, ShieldAlert } from 'lucide-react';

export function AuthRequiredModal({ isOpen, onClose, title = "¡Acceso Exclusivo!", message = "Regístrate para interactuar con tus modelos favoritas y acceder a contenido premium." }) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-[#1a161f]/90 border border-white/10 backdrop-blur-2xl rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center mb-6 ring-1 ring-primary/30">
                        <ShieldAlert size={32} className="text-primary animate-pulse" />
                    </div>

                    <h2 className="text-2xl font-black text-white mb-3">
                        {title}
                    </h2>

                    <p className="text-gray-400 text-sm leading-relaxed mb-8">
                        {message}
                    </p>

                    <div className="flex flex-col w-full gap-3">
                        <button
                            onClick={() => {
                                onClose();
                                navigate('/landing');
                            }}
                            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <UserPlus size={18} />
                            Registrarse ahora
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-white/5 text-white font-semibold rounded-2xl hover:bg-white/10 transition-colors"
                        >
                            Quizás más tarde
                        </button>
                    </div>
                </div>

                <p className="mt-6 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    Nebula Space • Acceso Seguro
                </p>
            </div>
        </div>
    );
}
