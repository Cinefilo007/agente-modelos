
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Heart, MessageCircle, Star, CheckCircle2, Loader, BellOff } from 'lucide-react';
import api from '../api/axios';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error("Error marking all read:", error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'follow': return <UserPlus size={18} className="text-blue-400" />;
            case 'like': return <Heart size={18} className="text-red-400 fill-red-400" />;
            case 'comment': return <MessageCircle size={18} className="text-green-400" />;
            case 'review': return <Star size={18} className="text-yellow-400 fill-yellow-400" />;
            default: return <CheckCircle2 size={18} className="text-gray-400" />;
        }
    };

    const getMessage = (notif) => {
        const username = notif.actor?.username || "Alguien";
        switch (notif.type) {
            case 'follow': return <span><b>@{username}</b> comenzó a seguirte</span>;
            case 'like': return <span>A <b>@{username}</b> le gusta tu publicación</span>;
            case 'comment': return <span><b>@{username}</b> comentó: "{notif.content}"</span>;
            case 'review': return <span><b>@{username}</b> dejó una reseña de {notif.target_id} estrellas</span>; // target_id stored rating for review
            default: return <span>Nueva interacción de <b>@{username}</b></span>;
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Notificaciones</h1>
                </div>
                {notifications.some(n => !n.is_read) && (
                    <button
                        onClick={markAllRead}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/10 px-3 py-1.5 rounded-full"
                    >
                        Leer todas
                    </button>
                )}
            </div>

            {/* List */}
            <div className="max-w-2xl mx-auto p-4 space-y-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader className="animate-spin text-blue-500" size={32} />
                        <p className="text-sm text-gray-500 font-medium">Cargando alertas...</p>
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            onClick={() => {
                                markAsRead(notif.id);
                                if (notif.target_id && notif.type !== 'follow') {
                                    navigate(`/post/${notif.target_id}`);
                                } else if (notif.actor_id) {
                                    navigate(`/profile/${notif.actor_id}`);
                                }
                            }}
                            className={`flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer border ${notif.is_read ? 'bg-white/5 border-transparent opacity-70' : 'bg-blue-600/5 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]'}`}
                        >
                            <div className="relative flex-none">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 ring-2 ring-white/5 shadow-inner">
                                    {notif.actor?.avatar_url ? (
                                        <img src={notif.actor.avatar_url} alt={notif.actor.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-white font-bold text-lg uppercase">
                                            {notif.actor?.username?.[0] || '?'}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-background p-1 rounded-full ring-2 ring-background shadow-lg">
                                    {getIcon(notif.type)}
                                </div>
                            </div>

                            <div className="flex-1 space-y-1">
                                <p className="text-sm leading-relaxed text-gray-200">
                                    {getMessage(notif)}
                                </p>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                                    {!notif.is_read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                                </span>
                            </div>

                            {notif.type === 'like' && notif.target_id && (
                                <div className="flex-none w-12 h-12 rounded-lg bg-white/5 border border-white/5 overflow-hidden group-hover:scale-105 transition-transform shadow-lg">
                                    {/* Miniatura del post si la tuviéramos en la respuesta */}
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Heart size={16} className="text-white/20" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="p-8 bg-white/5 rounded-full ring-1 ring-white/10 shadow-2xl">
                            <BellOff size={48} className="text-gray-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-white">Silencio total</h3>
                            <p className="text-sm text-gray-500 max-w-[200px] mx-auto leading-relaxed">
                                Cuando la gente interactúe contigo, aparecerá aquí.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
