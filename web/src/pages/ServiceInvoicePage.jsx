import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ChevronLeft, CheckCircle2, AlertCircle, Info,
    ShieldCheck, Zap, Star, LayoutGrid
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from '../components/ui/Avatar';
import api from '../api/axios';

export default function ServiceInvoicePage() {
    const { serviceId } = useParams();
    const navigate = useNavigate();
    const { themeColor } = useTheme();

    const [service, setService] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchService = async () => {
            try {
                // In a real scenario, we'd have an endpoint GET /shop/service/{id}
                // For now, let's try to get it from the model's shop or similar
                // Or better, I should have added a specific endpoint for single service
                const { data } = await api.get(`/shop/services/${serviceId}`);
                setService(data);
                if (data.model_service_options?.length > 0) {
                    setSelectedOption(data.model_service_options[0]);
                }
            } catch (err) {
                console.error("Error fetching service:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchService();
    }, [serviceId]);

    // Note: I need to add GET /shop/services/{service_id} to backend if it doesn't exist.
    // Let's assume for now I'll add it to shop.py in a moment.

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
    );

    if (!service) return (
        <div className="min-h-screen bg-black text-white p-10 text-center">
            <p className="text-gray-400">Servicio no encontrado</p>
            <Link to="/explore" className="text-primary mt-4 inline-block">Volver</Link>
        </div>
    );

    const handleProceed = () => {
        if (!selectedOption) return;
        navigate('/service-checkout', {
            state: {
                service,
                option: selectedOption,
                model: service.models // Assuming joined in backend
            }
        });
    };

    return (
        <div className="min-h-screen bg-black pb-32 animate-in fade-in duration-500">
            {/* Top Navigation */}
            <div className="p-4 flex items-center gap-4 sticky top-0 z-30 bg-black/60 backdrop-blur-md">
                <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-full">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-bold">Detalles del Servicio</h1>
            </div>

            <div className="px-6 space-y-8 max-w-lg mx-auto">
                {/* Header Artist Info */}
                <div className="flex items-center gap-4 py-4 border-b border-white/5">
                    <Avatar src={service.models?.avatar_url} size="lg" ringColor={themeColor} />
                    <div>
                        <h2 className="text-xl font-black text-white">{service.title}</h2>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            {service.models?.artistic_name || service.models?.username} <CheckCircle2 size={12} className="text-blue-400" />
                        </span>
                    </div>
                </div>

                {/* Description */}
                <section>
                    <p className="text-gray-400 leading-relaxed text-sm">
                        {service.description}
                    </p>
                </section>

                {/* Benefits / What's Included */}
                <section className="bg-white/5 rounded-3xl p-6 border border-white/5">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                        <Zap size={16} className="text-yellow-400" /> Beneficios Incluidos
                    </h3>
                    <ul className="space-y-3">
                        {service.benefits?.map((benefit, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-300 font-medium">{benefit}</span>
                            </li>
                        ))}
                        {(!service.benefits || service.benefits.length === 0) && (
                            <p className="text-xs text-gray-500 italic text-center py-2">No se especificaron beneficios</p>
                        )}
                    </ul>
                </section>

                {/* Pricing Options */}
                <section>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                        <LayoutGrid size={16} className="text-primary" /> Selecciona una Opción
                    </h3>
                    <div className="space-y-3">
                        {service.model_service_options?.map((opt) => (
                            <div
                                key={opt.id}
                                onClick={() => setSelectedOption(opt)}
                                className={`
                                    p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center
                                    ${selectedOption?.id === opt.id
                                        ? 'border-primary bg-primary/10'
                                        : 'border-white/5 bg-white/5 hover:border-white/20'}
                                `}
                                style={selectedOption?.id === opt.id ? { borderColor: themeColor } : {}}
                            >
                                <div>
                                    <span className="font-bold text-white block">{opt.label}</span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">{opt.unit_value} {opt.unit}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-white">${opt.price}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Rules */}
                <section className="bg-red-500/5 rounded-3xl p-6 border border-red-500/10">
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-400/50 mb-4 flex items-center gap-2">
                        <AlertCircle size={16} /> Reglas del Servicio
                    </h3>
                    <ul className="space-y-4">
                        {service.rules?.map((rule, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <Info size={16} className="text-red-400 shrink-0 mt-0.5" />
                                <span className="text-xs text-red-200/70">{rule}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 font-bold uppercase py-4">
                    <ShieldCheck size={14} className="text-blue-500" /> Transacción protegida por el sistema Escrow
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-40">
                <button
                    onClick={handleProceed}
                    disabled={!selectedOption}
                    className="w-full py-4 rounded-2xl font-black text-lg bg-primary text-primary-foreground shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: themeColor }}
                >
                    Continuar al Pago • ${selectedOption?.price || '0.00'}
                </button>
            </div>
        </div>
    );
}
