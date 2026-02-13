
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, BellOff } from 'lucide-react';
import api from '../api/axios';
import { NotificationItem } from '../components/notifications/NotificationItem';

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

    const handleRead = async (id) => {
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

    return (
        <div className="min-h-screen bg-[#121212] pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#121212]/90 backdrop-blur-md border-b border-white/5 py-3 pt-6 px-4">
                <div className="flex items-center gap-4 max-w-2xl mx-auto">
                    <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft size={22} className="text-gray-300" />
                    </button>
                    <h1 className="text-base font-bold text-white uppercase tracking-wider">Notificaciones</h1>

                    {notifications.some(n => !n.is_read) && (
                        <button
                            onClick={markAllRead}
                            className="ml-auto text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest bg-blue-400/10 px-3 py-1.5 rounded-full"
                        >
                            Leer todas
                        </button>
                    )}
                </div>
            </header>

            {/* List */}
            <div className="max-w-2xl mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader className="animate-spin text-blue-500" size={28} />
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="divide-y divide-white/5">
                        {notifications.map((notif) => (
                            <NotificationItem
                                key={notif.id}
                                notification={notif}
                                onRead={handleRead}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-40 text-center px-8">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <BellOff size={32} className="text-gray-600" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Sin actividad aún</h3>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-[240px]">
                            Aquí aparecerán tus likes, comentarios y nuevos seguidores.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
