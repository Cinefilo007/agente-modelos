import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ShieldCheck, Clock, CheckCircle, AlertTriangle, ArrowLeft,
    MessageSquare, Star, FileText, Send, User, MapPin
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/ui/Avatar';
import api from '../api/axios';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

export default function OrderDetails() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { themeColor } = useTheme();
    const { showToast } = useToast();
    const { user } = useAuth();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Review State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await api.get(`/orders/${orderId}`);
                setOrder(res.data);
            } catch (e) {
                console.error("Error fetching order", e);
                setError("No pudimos cargar los detalles de esta orden.");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const handleMarkAsShipped = async () => {
        try {
            await api.post(`/orders/${orderId}/mark-shipped`);
            setOrder({ ...order, delivery_status: 'shipped' });
            showToast("Orden marcada como realizada. Se ha notificado al cliente.", "success");
        } catch (e) {
            showToast("No se pudo actualizar el estado.", "error");
        }
    };

    const handleReleaseFunds = async () => {
        if (!window.confirm("¿Confirmas que has recibido el servicio satisfactoriamente? Esto liberará el dinero a la modelo.")) return;

        try {
            const res = await api.post(`/orders/${orderId}/release`);
            if (res.data.status === 'success') {
                setOrder({ ...order, status: 'COMPLETED' });
                showToast("¡Pago liberado! Gracias por usar Nebula Escrow.", "success");
                setShowReviewModal(true);
            }
        } catch (e) {
            showToast("Error al liberar fondos. Intenta nuevamente.", "error");
        }
    };

    const handleCompleteDirect = async () => {
        if (!window.confirm("¿Confirmas que el servicio fue realizado y completado? Esto te permitirá dejar una reseña.")) return;
        try {
            const res = await api.post(`/orders/${orderId}/complete-direct`);
            if (res.data.status === 'success') {
                setOrder({ ...order, status: 'COMPLETED' });
                showToast("Orden marcada como completada.", "success");
                setShowReviewModal(true);
            }
        } catch (e) {
            showToast("Error al completar la orden.", "error");
        }
    };

    const handleSubmitReview = async () => {
        setSubmittingReview(true);
        try {
            await api.post('/orders/review', {
                order_id: orderId,
                rating,
                comment
            });
            showToast("¡Reseña enviada con éxito!", "success");
            setShowReviewModal(false);
            // Refresh or update local state
        } catch (e) {
            showToast(e.response?.data?.detail || "Error al enviar reseña", "error");
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" style={{ borderColor: `${themeColor} transparent transparent transparent` }}></div>
        </div>
    );

    if (error || !order) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle size={48} className="text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Orden no encontrada</h2>
            <p className="text-muted-foreground mb-6">{error || "La orden solicitada no existe o no tienes permiso para verla."}</p>
            <button onClick={() => navigate(-1)} className="px-6 py-2 bg-white/10 rounded-xl font-bold">Volver</button>
        </div>
    );

    const isModel = user?.user_id === order.model_id;
    const isClient = user?.user_id === order.client_id;
    const isCompleted = order.status === 'COMPLETED' || order.status === 'completed';
    const isHeld = order.status === 'HELD' || order.status === 'held';
    const isDirect = order.payment_method === 'direct';

    return (
        <div className="min-h-screen bg-black pb-24 pt-6 px-4 max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center mb-8">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10 text-muted-foreground">
                    <ArrowLeft size={22} />
                </button>
                <div className="ml-2 flex flex-col">
                    <h1 className="font-bold text-xl leading-tight">Nota de Entrega</h1>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">ID: {order.id.slice(0, 8)}...</span>
                </div>
            </div>

            {/* Status Banner */}
            <div className={clsx(
                "p-4 rounded-3xl mb-8 flex items-center gap-4 border",
                isCompleted ? "bg-green-500/10 border-green-500/20" : "bg-blue-500/10 border-blue-500/20"
            )}>
                <div className={clsx("p-3 rounded-2xl", isCompleted ? "bg-green-500 text-black" : "bg-blue-500 text-white")}>
                    {isCompleted ? <CheckCircle size={28} /> : <Clock size={28} />}
                </div>
                <div>
                    <h3 className="font-bold text-lg leading-tight uppercase italic tracking-wider">
                        {isCompleted ? "Servicio Completado" : "En Proceso"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                        {isDirect ? "Pago directo coordinado al privado." : (isHeld ? "Fondos en custodia de Nebula Escrow." : "Transferencia finalizada.")}
                    </p>
                </div>
            </div>

            {/* Service Info Section */}
            <section className="bg-card/40 border border-white/5 rounded-3xl p-6 mb-6">
                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
                    <FileText size={14} /> Detalles del Servicio
                </h3>
                <h2 className="text-xl font-black mb-2 text-white">{order.model_services.title}</h2>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-[11px] font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg uppercase">
                        {order.model_service_options?.label || "Servicio Digital"}
                    </span>
                    <span className="text-lg font-black text-white">${Number(order.amount).toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                    "{order.description}"
                </p>
            </section>

            {/* Participants Card */}
            <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="bg-white/5 rounded-3xl p-5 flex items-center gap-4">
                    <Avatar src={order.models.avatar_url} size="md" />
                    <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest block">MODELO</span>
                        <h4 className="font-bold text-white">{order.models.artistic_name || order.models.username}</h4>
                        <div className="flex gap-2">
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">@{order.models.username}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => window.open(`https://t.me/${order.models.username}`, '_blank')}
                        className="ml-auto p-3 bg-white/10 rounded-2xl text-blue-400 hover:bg-white/20 transition-colors"
                    >
                        <MessageSquare size={20} />
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="fixed bottom-0 left-0 w-full p-4 bg-black/80 backdrop-blur-xl border-t border-white/5 space-y-3">
                {isHeld && order.delivery_status !== 'shipped' && isModel && (
                    <button
                        onClick={handleMarkAsShipped}
                        className="w-full py-4 rounded-2xl font-black text-lg bg-primary text-primary-foreground shadow-2xl flex items-center justify-center gap-2"
                        style={{ backgroundColor: themeColor }}
                    >
                        Marcar como Realizado
                    </button>
                )}

                {isHeld && order.delivery_status === 'shipped' && isClient && (
                    <button
                        onClick={handleReleaseFunds}
                        className="w-full py-4 rounded-2xl font-black text-lg bg-green-500 text-black shadow-2xl flex items-center justify-center gap-2"
                    >
                        Confirmar y Liberar Pago
                    </button>
                )}

                {isCompleted && isClient && (
                    <button
                        onClick={() => setShowReviewModal(true)}
                        className="w-full py-4 rounded-2xl font-black text-lg border-2 border-primary text-primary flex items-center justify-center gap-2"
                        style={{ color: themeColor, borderColor: themeColor }}
                    >
                        Dejar Reseña a la Modelo
                    </button>
                )}

                {!isCompleted && isDirect && isClient && (
                    <div className="space-y-3 px-2">
                        <p className="text-[10px] text-muted-foreground text-center font-bold">
                            Recuerda marcar el servicio como completado una vez finalizado o tras haber pagado.
                        </p>
                        <button
                            onClick={handleCompleteDirect}
                            className="w-full py-4 rounded-2xl font-black text-md bg-amber-500 text-black shadow-lg flex items-center justify-center gap-2"
                        >
                            <CheckCircle size={20} /> Marcar como Completado
                        </button>
                    </div>
                )}
            </div>

            {/* Review Modal Placeholder */}
            {showReviewModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-[#1a1a1e] rounded-t-[40px] p-8 border-t border-white/10 animate-in slide-in-from-bottom duration-500">
                        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8"></div>
                        <h3 className="text-2xl font-black text-white text-center mb-2 italic">CALIFICAR SERVICIO</h3>
                        <p className="text-center text-muted-foreground text-sm mb-8">¿Cómo calificarías tu experiencia con {order.models.artistic_name}?</p>

                        <div className="flex justify-center gap-3 mb-8">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setRating(s)}
                                    className={clsx("p-3 rounded-2xl transition-all", rating >= s ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground")}
                                    style={rating >= s ? { backgroundColor: themeColor } : {}}
                                >
                                    <Star size={24} fill={rating >= s ? "currentColor" : "none"} />
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Cuéntanos más detalles (opcional)"
                            className="w-full bg-white/5 border border-white/10 rounded-3xl p-4 text-sm text-white mb-8 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[120px]"
                        />

                        <div className="flex gap-4">
                            <button onClick={() => setShowReviewModal(false)} className="flex-1 py-4 font-bold text-muted-foreground bg-white/5 rounded-2xl">Cancelar</button>
                            <button
                                onClick={handleSubmitReview}
                                disabled={submittingReview}
                                className="flex-[2] py-4 font-black text-primary-foreground bg-primary rounded-2xl shadow-xl disabled:opacity-50"
                                style={{ backgroundColor: themeColor }}
                            >
                                {submittingReview ? "Enviando..." : "Enviar Reseña"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
