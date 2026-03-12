import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
    Clock, Wallet, MessageSquare, Send, ExternalLink, HelpCircle, FileText,
    ArrowLeft, ShieldCheck, Lock, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from '../components/ui/Avatar';
import api from '../api/axios';

export default function ServiceCheckout() {
    const { themeColor } = useTheme();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const location = useLocation();

    // Financial State
    const [balance, setBalance] = useState({ balance: 0, currency: 'USDT' });
    const [loadingBalance, setLoadingBalance] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    // Payment Method: 'escrow' (In-app wallet) or 'direct' (Private chat)
    const [paymentMethod, setPaymentMethod] = useState('escrow');

    // Status: 'summary', 'processing', 'held', 'completed', 'disputed'
    const [status, setStatus] = useState('summary');
    const [lastOrderId, setLastOrderId] = useState(null);

    // Get data from navigation state
    const { service: initialService, option: selectedOption, model: initialModel } = location.state || {};

    if (!initialService || !selectedOption || !initialModel) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-black">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Error de Navegación</h2>
                <p className="text-muted-foreground mb-6 text-sm">No pudimos recuperar los detalles del servicio. Por favor, selecciona el servicio nuevamente.</p>
                <Link to="/explore" className="px-6 py-2 bg-white/10 rounded-xl font-bold">Volver a Explorar</Link>
            </div>
        );
    }

    // Service Data
    const service = {
        id: initialService.id,
        title: initialService.title,
        modelId: initialModel.id,
        modelName: initialModel.artistic_name || initialModel.username || "Modelo",
        modelUsername: initialModel.username || "",
        modelAvatar: initialModel.avatar_url,
        optionId: selectedOption.id,
        price: selectedOption.price,
        description: initialService.description,
        deliveryTime: "24-48h"
    };

    const fee = paymentMethod === 'escrow' ? 2.50 : 0;
    const totalAmount = service.price + fee;

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const res = await api.get('/wallet/balance');
                setBalance(res.data);
            } catch (e) {
                console.error("Error fetching balance", e);
            } finally {
                setLoadingBalance(false);
            }
        };
        fetchBalance();
    }, []);

    const handlePayment = async () => {
        setErrorMsg(null);

        if (paymentMethod === 'escrow') {
            if (balance.balance < totalAmount) {
                showToast("Saldo insuficiente. Por favor recarga tu billetera.", "warning");
                navigate('/wallet');
                return;
            }

            setStatus('processing');

            try {
                // Unified order creation call
                const res = await api.post('/shop/order', {
                    model_id: service.modelId,
                    service_id: service.id,
                    option_id: service.optionId,
                    payment_method: 'escrow'
                });

                if (res.data) {
                    setLastOrderId(res.data.id);
                    setStatus('held');
                }
            } catch (e) {
                console.error("Escrow payment failed", e);
                setErrorMsg(e.response?.data?.detail || "Error al procesar el pago. Intenta nuevamente.");
                setStatus('summary');
            }
        } else {
            // Direct Payment logic
            setStatus('processing');
            try {
                const res = await api.post('/shop/order', {
                    model_id: service.modelId,
                    service_id: service.id,
                    option_id: service.optionId,
                    payment_method: 'direct'
                });

                if (res.data) {
                    setLastOrderId(res.data.id);
                    setStatus('completed');
                }
            } catch (e) {
                console.error("Direct order failed", e);
                setErrorMsg("No se pudo registrar la solicitud de pago directo.");
                setStatus('summary');
            }
        }
    };

    const handleGoToChat = () => {
        const orderInfo = lastOrderId ? `\nID Orden: ${lastOrderId}` : '';
        const msg = encodeURIComponent(
            `Hola ${service.modelName}! He seleccionado el servicio: "${service.title}" (${selectedOption.label}). \n\n` +
            (paymentMethod === 'escrow'
                ? `Acabo de pagar vía ESCROW. Por favor confírmame cuando puedas iniciar. ${orderInfo}`
                : `Me gustaría coordinar el pago directo para este servicio. ¿Me compartes tus datos de pago?`)
        );
        const username = service.modelUsername.replace('@', '');
        window.open(`https://t.me/${username}?text=${msg}`, '_blank');
        // No navegar inmediatamente para que el usuario pueda ver la nota de entrega si quiere
    };

    const handleViewOrder = () => {
        if (lastOrderId) navigate(`/order/${lastOrderId}`);
    };

    return (
        <div className="min-h-screen pb-20 pt-6 px-4 font-sans flex flex-col items-center bg-black">

            {/* Header */}
            <div className="w-full flex items-center mb-6 max-w-md">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={20} />
                </button>
                <div className="ml-2 flex flex-col">
                    <span className="font-bold text-lg leading-tight">Finalizar Compra</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-1">
                        <ShieldCheck size={10} className="text-blue-400" /> Transacción Segura
                    </span>
                </div>
            </div>

            {/* --- SUMMARY STAGE --- */}
            {status === 'summary' && (
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Service Summary Card */}
                    <div className="bg-card/40 border border-white/5 rounded-3xl p-5 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Avatar src={service.modelAvatar} size="md" />
                            <div>
                                <h2 className="font-bold text-base text-white">{service.modelName}</h2>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Vendedora Verificada</p>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4">
                            <h3 className="text-sm font-bold text-white mb-1">{service.title}</h3>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{service.description}</p>
                            <div className="mt-3 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg uppercase tracking-wider">
                                    {selectedOption.label}
                                </span>
                                <span className="text-sm font-black text-white">${service.price.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="mb-6 space-y-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Método de Pago</label>

                        {/* Escrow Option */}
                        <div
                            onClick={() => setPaymentMethod('escrow')}
                            className={clsx(
                                "p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group",
                                paymentMethod === 'escrow' ? "border-primary bg-primary/5" : "border-white/5 bg-white/5 hover:bg-white/10"
                            )}
                            style={paymentMethod === 'escrow' ? { borderColor: themeColor } : {}}
                        >
                            <div className="flex items-start gap-3 relative z-10">
                                <div className={clsx("p-2 rounded-xl", paymentMethod === 'escrow' ? "bg-primary text-primary-foreground" : "bg-white/10 text-muted-foreground")}>
                                    <ShieldCheck size={20} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-sm text-white">Billetera App (Escrow)</h4>
                                        <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded uppercase">Recomendado</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        Pago 100% protegido. El dinero se libera a la modelo solo cuando confirmes que recibiste el servicio.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Direct Payment Option */}
                        <div
                            onClick={() => setPaymentMethod('direct')}
                            className={clsx(
                                "p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                                paymentMethod === 'direct' ? "border-amber-500/50 bg-amber-500/5" : "border-white/5 bg-white/5 hover:bg-white/10"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className={clsx("p-2 rounded-xl", paymentMethod === 'direct' ? "bg-amber-500 text-black" : "bg-white/10 text-muted-foreground")}>
                                    <MessageSquare size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-white mb-1">Coordinar al Privado</h4>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        Acuerda el pago directamente con la modelo vía Telegram Chat. <br />
                                        <span className="text-amber-400/80 font-bold uppercase text-[9px]">⚠️ Bajo tu propio riesgo</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-card/40 border border-white/5 rounded-3xl p-5 mb-8">
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                            <span>Subtotal</span>
                            <span>${service.price.toFixed(2)}</span>
                        </div>
                        {paymentMethod === 'escrow' && (
                            <div className="flex justify-between text-xs text-muted-foreground mb-4">
                                <span className="flex items-center gap-1 italic">Tasa de Protección <HelpCircle size={10} /></span>
                                <span>$2.50</span>
                            </div>
                        )}
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="font-black text-sm uppercase tracking-widest text-white/50">Total</span>
                            <span className="text-2xl font-black text-white">${totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Footer Info & Button */}
                    {paymentMethod === 'escrow' && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-4">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-blue-300 uppercase underline">Saldo en Billetera</span>
                                {loadingBalance ? <span className="text-[10px] animate-pulse">Consultando...</span> : (
                                    <span className={clsx("text-xs font-black", balance.balance >= totalAmount ? "text-green-400" : "text-red-400")}>
                                        ${Number(balance.balance).toFixed(2)} {balance.currency}
                                    </span>
                                )}
                            </div>
                            {balance.balance < totalAmount && !loadingBalance && (
                                <p className="text-[9px] text-red-300 font-bold mt-1">Saldo insuficiente. Necesitas recargar fondos.</p>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handlePayment}
                        disabled={loadingBalance || (paymentMethod === 'escrow' && balance.balance < totalAmount)}
                        className={clsx(
                            "w-full py-4 rounded-2xl font-black text-lg text-white shadow-2xl flex items-center justify-center gap-2 group transition-all active:scale-95 disabled:opacity-50 disabled:grayscale",
                        )}
                        style={{ backgroundColor: paymentMethod === 'escrow' ? themeColor : '#f59e0b' }}
                    >
                        {loadingBalance ? <Wallet className="animate-pulse" /> : (
                            <>
                                {paymentMethod === 'escrow' ? <ShieldCheck size={20} /> : <Send size={20} />}
                                <span>{paymentMethod === 'escrow' ? (balance.balance < totalAmount ? "Recargar Billetera" : "Pagar con Billetera") : "Ir a Coordinar Chat"}</span>
                            </>
                        )}
                    </button>

                    {errorMsg && <p className="mt-4 text-center text-red-400 text-xs font-bold leading-tight bg-red-500/10 p-2 rounded-xl">{errorMsg}</p>}
                </div>
            )}

            {/* --- PROCESSING STAGE --- */}
            {status === 'processing' && (
                <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin mb-6" style={{ borderColor: `${themeColor} transparent transparent transparent` }}></div>
                    <h3 className="text-xl font-bold mb-2">Asegurando Transacción...</h3>
                    <p className="text-xs text-muted-foreground text-center max-w-xs px-10">Conectando con el sistema de pagos seguros Nebula Escrow para proteger tu compra.</p>
                </div>
            )}

            {/* --- HELD STAGE (Escrow Active) --- */}
            {status === 'held' && (
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 text-center px-4">
                    <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                        <Lock size={40} className="text-blue-400" />
                    </div>

                    <h2 className="text-3xl font-black mb-2 text-white italic">¡PAGO PROTEGIDO!</h2>
                    <p className="text-sm text-muted-foreground mb-8">
                        Hemos retenido <strong>${totalAmount.toFixed(2)}</strong> de tu wallet.<br />
                        La modelo ha sido notificada y tu dinero está en garantía.
                    </p>

                    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-left mb-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-1.5 bg-green-500/20 rounded-lg"><Clock size={16} className="text-green-500" /></div>
                            <h4 className="font-bold text-sm text-white">Siguiente Paso</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Avisa a la modelo en su chat privado para iniciar el servicio. <br /><br />
                            <strong>Regla:</strong> No liberes el pago hasta que recibas el servicio completo.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleGoToChat}
                            className="w-full py-5 rounded-2xl font-black text-lg bg-primary text-primary-foreground shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
                            style={{ backgroundColor: themeColor }}
                        >
                            <MessageSquare size={24} /> Ir al Chat de la Modelo
                        </button>

                        <button
                            onClick={handleViewOrder}
                            className="w-full py-4 rounded-2xl font-bold text-sm bg-white/10 text-white flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                        >
                            <FileText size={18} /> Ver Nota de Entrega Digital
                        </button>
                    </div>

                    <p className="mt-6 text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center justify-center gap-1 opacity-50">
                        ID DE ORDEN: {lastOrderId}
                    </p>
                </div>
            )}

            {/* --- COMPLETED STAGE (Direct Payment Redirect) --- */}
            {status === 'completed' && (
                <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in duration-500 text-center px-6">
                    <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mb-8">
                        <Send size={48} className="text-amber-500" />
                    </div>
                    <h2 className="text-3xl font-black mb-4 text-white italic">PAGO DIRECTO</h2>
                    <p className="text-sm text-muted-foreground mb-10">
                        Solicitud de compra registrada. Ahora coordina los detalles y el medio de pago directamente con la modelo.
                    </p>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={handleGoToChat}
                            className="w-full py-5 rounded-2xl font-black text-lg bg-amber-500 text-black shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
                        >
                            Ir al Chat (Enviar Solicitud)
                        </button>

                        <button
                            onClick={handleViewOrder}
                            className="w-full py-4 rounded-2xl font-bold text-sm bg-white/10 text-white flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                        >
                            <FileText size={18} /> Ver Nota de Entrega
                        </button>
                    </div>
                </div>
            )}

            {/* Security Footer */}
            <div className="mt-auto pt-10 opacity-30">
                <div className="flex items-center justify-center gap-6">
                    <ShieldCheck size={24} />
                    <Lock size={24} />
                    <Wallet size={24} />
                </div>
            </div>

        </div>
    );
}
