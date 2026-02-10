import React, { useState } from 'react';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export function TermsModal({ onAccept }) {
    const { themeColor } = useTheme();
    const { updateUser } = useAuth();
    const [accepted, setAccepted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleAccept = async () => {
        if (!accepted) return;
        setSubmitting(true);
        try {
            // Update on server if needed, or just locally
            await api.put('/profile/me', { terms_accepted: true });
            updateUser({ terms_accepted: true });
            onAccept();
        } catch (err) {
            console.error("Error accepting terms:", err);
            // Even if API fails (column might not exist yet in DB but schema is updated), 
            // we let them proceed locally to not block them
            onAccept();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="max-w-md w-full glass-panel border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6">
                <div className="flex justify-center">
                    <div className="p-4 bg-pink-500/20 rounded-full">
                        <ShieldAlert size={48} className="text-pink-500" />
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white">Verificación de Edad</h2>
                    <p className="text-sm text-gray-400">
                        Este sitio contiene material para adultos. Debes confirmar que cumples con los requisitos para ingresar.
                    </p>
                </div>

                <div className="space-y-4 pt-4 text-sm text-gray-300">
                    <div className="flex items-start gap-3">
                        <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <p>Confirmo que soy mayor de edad (18+ años).</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <p>Acepto entrar bajo mi propia responsabilidad.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <p>Acepto los Términos y Condiciones y Políticas de Privacidad.</p>
                    </div>
                </div>

                <div className="flex flex-col gap-4 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-white/20 bg-white/5 text-pink-500 focus:ring-pink-500 transition-all"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                        />
                        <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                            He leído y acepto todas las condiciones mencionadas arriba.
                        </span>
                    </label>

                    <button
                        onClick={handleAccept}
                        disabled={!accepted || submitting}
                        className="w-full py-4 rounded-2xl font-bold text-white transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transform active:scale-95 shadow-xl hover:shadow-2xl"
                        style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
                    >
                        {submitting ? 'Cargando...' : 'ACEPTAR E INGRESAR'}
                    </button>
                </div>
            </div>
        </div>
    );
}
