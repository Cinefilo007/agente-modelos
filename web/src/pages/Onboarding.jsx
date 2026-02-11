import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Shield, Calendar, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react';

const Onboarding = () => {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const [birthDate, setBirthDate] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Basic validation
        if (!birthDate) {
            setError("Por favor, ingresa tu fecha de nacimiento.");
            return;
        }
        if (!termsAccepted) {
            setError("Debes aceptar los términos y condiciones.");
            return;
        }

        // Age validation (frontend check)
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        if (age < 18) {
            setError("Lo sentimos, debes ser mayor de 18 años para acceder al portal.");
            return;
        }

        setLoading(true);
        try {
            console.log("[Onboarding] Enviando datos de registro:", { birthDate, termsAccepted });
            const response = await api.put('/profile/me', {
                birth_date: birthDate,
                terms_accepted: true
            });

            console.log("[Onboarding] Registro completado con éxito.");
            // Update local user state
            updateUser({
                birth_date: birthDate,
                terms_accepted: true
            });

            // Redirect to feed
            navigate('/');
        } catch (err) {
            console.error("[Onboarding] Error al guardar datos:", err);
            setError(err.response?.data?.detail || "Ocurrió un error al guardar tus datos. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050510] text-white flex items-center justify-center p-4 font-sans">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-lg shadow-purple-500/20">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black mb-2 tracking-tight">Casi listo, <span className="text-purple-400">{user?.username || 'Usuario'}</span></h1>
                    <p className="text-gray-400">Necesitamos completar tu perfil para garantizar la seguridad de la comunidad.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-shake">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            Fecha de Nacimiento
                        </label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
                            required
                        />
                        <p className="text-[10px] text-gray-500">Debes ser mayor de 18 años para ingresar.</p>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-purple-500/20 transition-all cursor-pointer group" onClick={() => setTermsAccepted(!termsAccepted)}>
                        <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${termsAccepted ? 'bg-purple-500 border-purple-500 shadow-sm shadow-purple-500/50' : 'border-white/20'}`}>
                            {termsAccepted && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-300 block group-hover:text-white transition-colors font-medium">Acepto los Términos y Condiciones</span>
                            <span className="text-[10px] text-gray-500">Al continuar, confirmas que has leído nuestras políticas de privacidad y uso de la plataforma.</span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:opacity-90 transition-all transform active:scale-[0.98] shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Confirmar y Entrar
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={logout}
                        className="text-gray-500 hover:text-white text-sm transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
