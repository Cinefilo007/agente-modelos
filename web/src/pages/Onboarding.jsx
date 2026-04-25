/* eslint-disable react/no-unknown-property */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    Shield, CheckCircle, AlertCircle,
    Star, Heart, Activity, Lock, Users, Camera
} from 'lucide-react';
import clsx from 'clsx';

const Onboarding = () => {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();

    // Estado inicial: intentamos pre-seleccionar basado en el login, pero permitimos elegir
    const [step, setStep] = useState(() => {
        const initialRole = user?.role;
        if (initialRole === 'client') return 'fan_flow';
        if (initialRole === 'model') return 'creator_flow';
        return 'select_role'; 
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fan Data
    const [birthDate, setBirthDate] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Creator Data
    const [creatorName, setCreatorName] = useState('');
    const [creatorCountry, setCreatorCountry] = useState('');
    const [creatorBio, setCreatorBio] = useState('');
    const [creatorBirthDate, setCreatorBirthDate] = useState('');
    const [verificationPhoto, setVerificationPhoto] = useState(null);

    const [isRestricted, setIsRestricted] = useState(false);

    const calculateAge = (dateString) => {
        const birth = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const handleFanSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const age = calculateAge(birthDate);
        if (age < 18) {
            setIsRestricted(true);
            return;
        }

        if (!termsAccepted) {
            setError("Debes aceptar los términos para continuar.");
            return;
        }

        setLoading(true);
        try {
            await api.put('/profile/me', {
                birth_date: birthDate,
                terms_accepted: true
            });

            updateUser({
                birth_date: birthDate,
                terms_accepted: true,
                role: 'client'
            });
            navigate('/');
        } catch (err) {
            setError("Error al guardar perfil. Intenta de nuevo.");
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

        const age = calculateAge(creatorBirthDate);
        if (age < 18) {
            setIsRestricted(true);
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

    // Efecto de limpieza: No redirigimos, si no hay rol mostramos el selector como fallback
    if (step === 'select_role') {
        return (
            <div className="min-h-screen bg-[#02010a] text-white flex items-center justify-center p-4 font-sans">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px]"></div>
                </div>

                <div className="relative z-10 max-w-xl w-full text-center">
                    <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Bienvenido a NebulaStar</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-widest mb-10 text-xs">Para continuar, confirma cómo quieres usar la plataforma</p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <button onClick={() => setStep('fan_flow')} className="group relative bg-black/40 border border-white/10 p-8 rounded-[2.5rem] hover:border-pink-500/50 transition-all text-left backdrop-blur-3xl overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                <Heart className="w-24 h-24 text-pink-500" />
                            </div>
                            <div className="w-12 h-12 bg-pink-500/20 rounded-2xl flex items-center justify-center mb-6">
                                <Users className="w-6 h-6 text-pink-500" />
                            </div>
                            <h3 className="text-xl font-black tracking-tighter uppercase mb-2">Soy Fan</h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide leading-relaxed">Quiero explorar perfiles y conectar con mis creadoras favoritas.</p>
                        </button>

                        <button onClick={() => setStep('creator_flow')} className="group relative bg-black/40 border border-white/10 p-8 rounded-[2.5rem] hover:border-purple-500/50 transition-all text-left backdrop-blur-3xl overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                <Star className="w-24 h-24 text-purple-500" />
                            </div>
                            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                                <Activity className="w-6 h-6 text-purple-500" />
                            </div>
                            <h3 className="text-xl font-black tracking-tighter uppercase mb-2">Soy Creadora</h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide leading-relaxed">Deseo un perfil verificado para centralizar mi contenido de Telegram.</p>
                        </button>
                    </div>

                    <button onClick={logout} className="mt-12 text-gray-600 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">
                        O cerrar sesión para cambiar de cuenta
                    </button>
                </div>
            </div>
        );
    }

    if (isRestricted) {
        return (
            <div className="min-h-screen bg-[#02010a] text-white flex items-center justify-center p-4 text-center font-sans">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px]"></div>
                </div>
                <div className="relative z-10 max-w-md bg-black/40 border border-red-500/30 p-10 rounded-[3rem] backdrop-blur-3xl shadow-2xl">
                    <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black mb-4 tracking-tighter uppercase text-red-100">Acceso Denegado</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Nebula Space es una plataforma exclusiva para mayores de 18 años. 
                        Según tu fecha de nacimiento, no cumples con el requisito legal mínimo.
                    </p>
                    <button onClick={logout} className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'success_creator') {
        return (
            <div className="min-h-screen bg-[#02010a] text-white flex items-center justify-center p-4 text-center font-sans">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-600/10 rounded-full blur-[120px]"></div>
                </div>
                <div className="relative z-10 max-w-md bg-black/40 border border-green-500/30 p-10 rounded-[3rem] backdrop-blur-3xl shadow-2xl">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle className="w-12 h-12 text-green-400" />
                    </div>
                    <h2 className="text-3xl font-black mb-4 tracking-tighter uppercase">¡Recibido!</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Tu solicitud como creadora está en revisión. El equipo de Nebula verificará tus datos y recibirás una notificación en Telegram.
                    </p>
                    <button onClick={logout} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'creator_flow') {
        return (
            <div className="min-h-screen bg-[#02010a] text-white flex items-center justify-center p-4 font-sans">
                {/* Background Effects */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px]"></div>
                </div>

                <div className="relative z-10 max-w-xl w-full bg-black/40 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-black tracking-tighter uppercase">Aplicación Creadora</h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Verificación de Identidad</p>
                        </div>
                    </div>

                    {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-400 text-sm flex gap-3"><AlertCircle size={20} /> {error}</div>}

                    <form onSubmit={handleCreatorSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">Nombre Artístico</label>
                                <input type="text" placeholder="Ej: Nebula Star" value={creatorName} onChange={e => setCreatorName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-purple-500/30 outline-none transition-all" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">País</label>
                                <input type="text" placeholder="Tu país actual" value={creatorCountry} onChange={e => setCreatorCountry(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-purple-500/30 outline-none transition-all" required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">Fecha de Nacimiento</label>
                            <input type="date" value={creatorBirthDate} onChange={e => setCreatorBirthDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-purple-500/30 outline-none transition-all" required />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">Biografía Breve</label>
                            <textarea placeholder="Cuéntanos un poco sobre tu contenido..." value={creatorBio} onChange={e => setCreatorBio(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm h-28 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all resize-none" />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400">
                                <Camera className="w-3 h-3" /> Foto de Verificación Obligatoria
                            </div>
                            
                            <div className="border-2 border-dashed border-white/10 rounded-3xl relative h-48 flex flex-col items-center justify-center overflow-hidden hover:border-purple-500/50 transition-all group bg-white/[0.02]">
                                <input type="file" onChange={(e) => { if (e.target.files[0]) setVerificationPhoto(e.target.files[0]); }} className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*" required />
                                {verificationPhoto ? (
                                    <>
                                        <img src={URL.createObjectURL(verificationPhoto)} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                        <div className="relative z-10 bg-black/80 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                            <span className="text-xs font-bold text-white uppercase">{verificationPhoto.name}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                            <Star className="w-6 h-6 text-gray-500 group-hover:text-purple-400" />
                                        </div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Toca para subir Selfie con ID</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 pt-4">
                            <button type="submit" disabled={loading} className="w-full py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all shadow-xl disabled:opacity-50">
                                {loading ? 'Enviando Solicitud...' : 'Enviar para Aplicación'}
                            </button>
                            <button type="button" onClick={logout} className="text-gray-600 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">
                                Cancelar y Cerrar Sesión
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Default: Fan Flow
    return (
        <div className="min-h-screen bg-[#02010a] text-white flex items-center justify-center p-4 font-sans">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]"></div>
            </div>

            <div className="relative z-10 max-w-md w-full bg-black/40 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-2xl">
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-24 h-24 flex items-center justify-center mb-6 drop-shadow-[0_0_12px_rgba(143,179,255,0.4)]">
                        <img src="/assets/brand/logo_transparent.png" alt="NebulaStar Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">Paso Final</h1>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Configura tu perfil de Fan</p>
                </div>

                {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-400 text-sm flex gap-3 text-left"><AlertCircle size={20} /> {error}</div>}

                <form onSubmit={handleFanSubmit} className="space-y-8">
                    <div className="space-y-3 text-left">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">Fecha de Nacimiento</label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30 transition-all font-medium"
                            required
                        />
                        <p className="text-[9px] text-gray-600 font-bold uppercase px-1 tracking-wider leading-relaxed">Solo permitimos el acceso a mayores de edad (+18).</p>
                    </div>

                    <div className="flex items-start gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-3xl cursor-pointer group transition-all hover:bg-white/[0.04]" onClick={() => setTermsAccepted(!termsAccepted)}>
                        <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${termsAccepted ? 'bg-pink-600 border-pink-600' : 'border-white/20 group-hover:border-pink-500/50'}`}>
                            {termsAccepted && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wide leading-tight group-hover:text-white transition-colors">
                            Certifico que soy mayor de 18 años y acepto los <span className="text-pink-500">Términos y Condiciones</span> de Nebula.
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-pink-600 hover:text-white transition-all shadow-xl disabled:opacity-50"
                        >
                            {loading ? 'Preparando Acceso...' : 'Comenzar Experiencia'}
                        </button>
                        <button type="button" onClick={logout} className="text-gray-600 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">
                            Cancelar y Cerrar Sesión
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Onboarding;
