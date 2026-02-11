import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    Shield, Calendar, CheckCircle, ChevronRight, AlertCircle,
    User, Camera, Star, Heart, Zap, Award, Smile
} from 'lucide-react';

const AVATARS = [
    { id: 'avatar_1', icon: User, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { id: 'avatar_2', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    { id: 'avatar_3', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20' },
    { id: 'avatar_4', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { id: 'avatar_5', icon: Award, color: 'text-green-400', bg: 'bg-green-500/20' },
    { id: 'avatar_6', icon: Smile, color: 'text-orange-400', bg: 'bg-orange-500/20' },
];

const Onboarding = () => {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();

    // States: 'select_role', 'fan_flow', 'creator_flow', 'success_creator'
    const [step, setStep] = useState('select_role');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fan Data
    const [birthDate, setBirthDate] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);

    // Creator Data
    const [creatorName, setCreatorName] = useState('');
    const [creatorCountry, setCreatorCountry] = useState('');
    const [creatorBio, setCreatorBio] = useState('');
    const [creatorBirthDate, setCreatorBirthDate] = useState('');
    const [verificationPhoto, setVerificationPhoto] = useState(null);

    const handleFanSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Age check logic remains same
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

        if (age < 18) {
            setError("Debes ser mayor de 18 años.");
            return;
        }

        if (!termsAccepted) {
            setError("Acepta los términos para continuar.");
            return;
        }

        setLoading(true);
        try {
            // Update profile with avatar_url logic (using predefined IDs for now)
            // Backend should handle 'avatar_url' update if sent
            const avatarUrl = `https://ui-avatars.com/api/?name=${user.username}&background=random`; // Fallback or map ID to asset

            await api.put('/profile/me', {
                birth_date: birthDate,
                terms_accepted: true,
                avatar_url: avatarUrl // Saving a default generated one based on username for now, or map icon ID
            });

            updateUser({
                birth_date: birthDate,
                terms_accepted: true,
                role: 'client'
            });
            navigate('/');
        } catch (err) {
            setError("Error al guardar perfil.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreatorSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!verificationPhoto) {
            setError("Debes subir una foto de verificación.");
            return;
        }

        const birth = new Date(creatorBirthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        if (age < 18) {
            setError("Debes ser mayor de 18 años para ser creador.");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('full_name', creatorName);
        formData.append('country_code', creatorCountry);
        formData.append('birth_date', creatorBirthDate);
        formData.append('bio', creatorBio);
        formData.append('file', verificationPhoto);

        try {
            await api.post('/profile/apply-model', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStep('success_creator');
        } catch (err) {
            setError("Error al enviar solicitud. Intenta de nuevo.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER STEPS ---

    if (step === 'select_role') {
        return (
            <div className="min-h-screen bg-[#050510] text-white flex items-center justify-center p-4">
                <div className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div
                        onClick={() => setStep('fan_flow')}
                        className="bg-gray-900/50 hover:bg-purple-900/20 border border-white/10 hover:border-purple-500 cursor-pointer p-8 rounded-3xl transition-all group text-center"
                    >
                        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <Heart className="w-10 h-10 text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Soy Fan</h2>
                        <p className="text-gray-400 text-sm">Quiero descubrir contenido exclusivo y conectar con creadores.</p>
                    </div>

                    <div
                        onClick={() => setStep('creator_flow')}
                        className="bg-gray-900/50 hover:bg-pink-900/20 border border-white/10 hover:border-pink-500 cursor-pointer p-8 rounded-3xl transition-all group text-center"
                    >
                        <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <Star className="w-10 h-10 text-pink-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Soy Creador</h2>
                        <p className="text-gray-400 text-sm">Quiero monetizar mi contenido y crecer mi audiencia.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'success_creator') {
        return (
            <div className="min-h-screen bg-[#050510] text-white flex items-center justify-center p-4 text-center">
                <div className="max-w-md bg-gray-900/80 p-8 rounded-3xl border border-green-500/30">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">¡Solicitud Enviada!</h2>
                    <p className="text-gray-400 mb-6">Hemos recibido tus datos. Nuestro equipo revisará tu perfil y te notificaremos por Telegram cuando seas aprobado.</p>
                    <button onClick={logout} className="text-purple-400 hover:text-purple-300">Volver al inicio</button>
                </div>
            </div>
        );
    }

    if (step === 'creator_flow') {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-gray-900/80 border border-white/10 p-8 rounded-3xl">
                    <h2 className="text-2xl font-bold mb-6 text-white">Verificación de Creador</h2>
                    {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                    <form onSubmit={handleCreatorSubmit} className="space-y-4">
                        <input type="text" placeholder="Nombre Real Completo" value={creatorName} onChange={e => setCreatorName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" required />
                        <input type="text" placeholder="País" value={creatorCountry} onChange={e => setCreatorCountry(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" required />
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Fecha de Nacimiento</label>
                            <input type="date" value={creatorBirthDate} onChange={e => setCreatorBirthDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" required />
                        </div>
                        <textarea placeholder="Cuéntanos sobre ti (Bio)" value={creatorBio} onChange={e => setCreatorBio(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white h-24" />

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300">Foto de Verificación</label>

                            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 flex gap-3 items-start">
                                <Shield className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-purple-200 font-medium mb-1">Requisito de Seguridad</p>
                                    <p className="text-xs text-purple-300/80 leading-relaxed">
                                        Sube una selfie sosteniendo tu documento de identidad (Cédula, DNI o Pasaporte).
                                        Asegúrate de que tu rostro y los datos del documento sean totalmente legibles.
                                    </p>
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-white/20 rounded-xl relative h-48 flex flex-col items-center justify-center overflow-hidden hover:border-purple-500 transition-colors group cursor-pointer bg-black/20">
                                <input
                                    type="file"
                                    onChange={(e) => {
                                        if (e.target.files[0]) setVerificationPhoto(e.target.files[0]);
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                    accept="image/*"
                                    required
                                />

                                {verificationPhoto ? (
                                    <>
                                        <img
                                            src={URL.createObjectURL(verificationPhoto)}
                                            alt="Preview"
                                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity z-0"
                                        />
                                        <div className="relative z-10 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10 shadow-xl">
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                            <span className="text-sm font-medium text-white truncate max-w-[150px]">{verificationPhoto.name}</span>
                                        </div>
                                        <p className="relative z-10 text-xs text-white/50 mt-2">Toca para cambiar</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <Camera className="w-6 h-6 text-gray-400 group-hover:text-purple-400" />
                                        </div>
                                        <p className="text-sm text-gray-300 font-medium">Sube tu Selfie aquí</p>
                                        <p className="text-xs text-gray-500 mt-1">JPG, PNG (Max 5MB)</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setStep('select_role')} className="flex-1 py-3 text-gray-400">Volver</button>
                            <button type="submit" disabled={loading} className="flex-[2] py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl text-white font-bold">
                                {loading ? 'Enviando...' : 'Aplicar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Default: Fan Flow
    return (
        <div className="min-h-screen bg-[#050510] text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold">Bienvenido, Fan 🚀</h1>
                    <p className="text-gray-400 text-sm">Personaliza tu perfil para empezar.</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                <form onSubmit={handleFanSubmit} className="space-y-6">
                    {/* Avatar Selection */}
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-3 block">Elige tu Avatar</label>
                        <div className="grid grid-cols-3 gap-3">
                            {AVATARS.map((av) => (
                                <div
                                    key={av.id}
                                    onClick={() => setSelectedAvatar(av.id)}
                                    className={`p-3 rounded-xl flex items-center justify-center cursor-pointer border transition-all ${selectedAvatar === av.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                                >
                                    <av.icon className={`w-6 h-6 ${av.color}`} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Fecha de Nacimiento</label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            required
                        />
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl cursor-pointer" onClick={() => setTermsAccepted(!termsAccepted)}>
                        <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-all ${termsAccepted ? 'bg-purple-500 border-purple-500' : 'border-white/30'}`}>
                            {termsAccepted && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="text-xs text-gray-300">
                            Acepto tener más de 18 años y los Términos y Condiciones.
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setStep('select_role')} className="flex-1 py-3 text-gray-400 hover:text-white">Atrás</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Comenzar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Onboarding;
