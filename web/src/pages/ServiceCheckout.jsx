import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
    ShieldCheck, Lock, CheckCircle, AlertTriangle, ArrowLeft,
    Clock, Wallet, MessageSquare
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from '../components/ui/Avatar';
import { clientService } from '../api/client';

export default function ServiceCheckout() {
    const { themeColor } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    // Get model from navigation state or fallback
    const model = location.state?.model;

    // Status: 'summary', 'processing', 'held', 'completed', 'disputed'
    const [status, setStatus] = useState('summary');

    // Service Data (Dynamic if model exists)
    const service = {
        title: "Video Saludo Personalizado",
        modelName: model?.name || "Modelo Desconocida",
        modelAvatar: model?.avatar || "https://github.com/shadcn.png",
        price: 50.00,
        description: `Un video de 1 minuto de ${model?.name || 'la modelo'} saludándote por tu nombre y enviándote un beso.`,
        deliveryTime: "24h"
    };

    const handlePayment = () => {
        setStatus('processing');
        setTimeout(() => {
            setStatus('held');
        }, 2000); // Simulate network
    };

    const handleConfirm = () => {
        setStatus('completed');
    };

    const handleDispute = () => {
        setStatus('disputed');
    };

    return (
        <div className="min-h-screen pb-20 pt-6 px-4 font-sans flex flex-col items-center">

            {/* Header */}
            <div className="w-full flex items-center mb-6">
                <Link to="/profile" className="p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={20} />
                </Link>
                <span className="ml-2 font-bold text-lg">Checkout Seguro</span>
            </div>

            {/* --- SUMMARY STAGE --- */}
            {status === 'summary' && (
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Service Card */}
                    <div className="bg-card/40 border border-white/5 rounded-3xl p-6 mb-6">
                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/5">
                            <Avatar src={service.modelAvatar} size="lg" />
                            <div>
                                <h2 className="font-bold text-lg">{service.modelName}</h2>
                                <p className="text-xs text-muted-foreground">Modelo Verificada</p>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                        <div className="flex items-center gap-2 text-xs font-semibold bg-white/5 self-start px-3 py-1.5 rounded-lg w-fit">
                            <Clock size={14} /> Entrega estimada: {service.deliveryTime}
                        </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="bg-card/40 border border-white/5 rounded-2xl p-5 mb-8">
                        <div className="flex justify-between items-center mb-2 text-sm text-muted-foreground">
                            <span>Subtotal</span>
                            <span>${service.price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
                            <span>Tasa de Servicio (Protección Escrow)</span>
                            <span>$2.50</span>
                        </div>
                        <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                            <span className="font-bold text-lg">Total</span>
                            <span className="font-bold text-2xl text-foreground">${(service.price + 2.50).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Pay Button */}
                    <button
                        onClick={handlePayment}
                        className="w-full py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 group relative overflow-hidden"
                        style={{ backgroundColor: themeColor }}
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <ShieldCheck size={20} className="relative z-10" />
                        <span className="relative z-10">Pagar con Protección Escrow</span>
                    </button>
                    <p className="text-center text-[10px] text-muted-foreground mt-4 flex items-center justify-center gap-1 opacity-70">
                        <Lock size={10} /> Tus fondos se retienen hasta que confirmes la entrega.
                    </p>
                </div>
            )}

            {/* --- PROCESSING STAGE --- */}
            {status === 'processing' && (
                <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin mb-6" style={{ borderColor: `${themeColor} transparent transparent transparent` }}></div>
                    <h3 className="text-xl font-bold mb-2">Procesando Pago...</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-xs">Contactando con Telegram Wallet para asegurar los fondos.</p>
                </div>
            )}

            {/* --- HELD STAGE (Escrow Active) --- */}
            {status === 'held' && (
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                        <Lock size={36} className="text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Fondos en Garantía</h2>
                    <p className="text-sm text-muted-foreground mb-8">
                        Hemos retenido <strong>${(service.price + 2.50).toFixed(2)}</strong> de tu wallet.<br />
                        La modelo ha sido notificada para comenzar el servicio.
                    </p>

                    <div className="bg-card/40 border-l-4 border-blue-500 p-4 rounded-r-xl text-left mb-8">
                        <h4 className="font-bold text-sm mb-1 text-blue-400">Estado: Esperando Entrega</h4>
                        <p className="text-xs text-muted-foreground">La modelo tiene 24h para entregar el servicio. Cuando lo recibas, vuelve aquí para liberar el pago.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={handleConfirm}
                            className="w-full py-4 rounded-2xl font-bold bg-green-500 hover:bg-green-600 text-white shadow-lg transition-transform active:scale-95"
                        >
                            Confirmar Entrega y Liberar Pago
                        </button>
                        <button
                            onClick={handleDispute}
                            className="w-full py-3 rounded-2xl font-semibold bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-colors border border-white/5"
                        >
                            ¡Ayuda! No recibí nada
                        </button>
                    </div>
                </div>
            )}

            {/* --- COMPLETED STAGE --- */}
            {status === 'completed' && (
                <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in duration-500 text-center">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle size={48} className="text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">¡Transacción Exitosa!</h2>
                    <p className="text-muted-foreground mb-8 max-w-xs">
                        Has liberado los fondos. Gracias por usar nuestro sistema seguro.
                    </p>
                    <Link to="/profile" className="px-8 py-3 rounded-xl bg-white/10 font-bold hover:bg-white/20 transition-colors">
                        Volver al Perfil
                    </Link>
                </div>
            )}

            {/* --- DISPUTED STAGE --- */}
            {status === 'disputed' && (
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={36} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-red-500">Disputa Iniciada</h2>
                    <p className="text-sm text-muted-foreground mb-8">
                        Un administrador revisará el caso. Por favor, sube las pruebas (capturas de pantalla) de que el servicio no fue entregado.
                    </p>

                    <div className="bg-card/40 border border-white/10 rounded-2xl p-6 text-left mb-6">
                        <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Evidencia</label>
                        <div className="border-2 border-dashed border-white/10 rounded-xl h-32 flex flex-col items-center justify-center text-muted-foreground hover:bg-white/5 cursor-pointer transition-colors">
                            <span className="text-sm">Click para subir imagen</span>
                        </div>
                    </div>

                    <button className="w-full py-4 rounded-2xl font-bold bg-white/10 hover:bg-white/20 text-foreground transition-colors">
                        Enviar Pruebas
                    </button>
                </div>
            )}

        </div>
    );
}
