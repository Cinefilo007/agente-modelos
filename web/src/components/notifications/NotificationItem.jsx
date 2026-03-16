import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, UserPlus, MessageCircle, Star, CircleDollarSign, Gift } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function NotificationItem({ notification, onRead }) {
    const navigate = useNavigate();
    const actor = notification.actor || { username: 'Usuario', avatar_url: null };

    const handleActorClick = (e) => {
        e.stopPropagation();
        navigate(`/${actor.username}`);
    };

    const handleContainerClick = () => {
        if (onRead) onRead(notification.id);

        if (notification.target_id && notification.type !== 'follow') {
            navigate(`/post/${notification.target_id}`);
        } else {
            navigate(`/${actor.username}`);
        }
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'like':
                return <Heart className="w-3 h-3 text-white fill-pink-500" />;
            case 'follow':
                return <UserPlus className="w-3 h-3 text-white fill-blue-500" />;
            case 'comment':
                return <MessageCircle className="w-3 h-3 text-white fill-green-500" />;
            case 'review':
                return <Star className="w-3 h-3 text-white fill-yellow-500" />;
            case 'tip':
                return <CircleDollarSign className="w-3 h-3 text-white fill-yellow-500" />;
            case 'gift':
                return <Gift className="w-3 h-3 text-white fill-purple-500" />;
            default:
                return <Star className="w-3 h-3 text-white" />;
        }
    };

    const getBgIcon = () => {
        switch (notification.type) {
            case 'like': return 'bg-pink-500';
            case 'follow': return 'bg-blue-500';
            case 'comment': return 'bg-green-500';
            case 'review': return 'bg-yellow-500';
            case 'tip': return 'bg-yellow-500';
            case 'gift': return 'bg-purple-500';
            default: return 'bg-gray-500';
        }
    };

    const getMessage = () => {
        switch (notification.type) {
            case 'like': return 'le dio me gusta a tu post';
            case 'follow': return 'comenzó a seguirte';
            case 'comment': return `comentó: "${notification.content}"`;
            case 'review': return `dejó una reseña`;
            case 'tip':
                const count = parseInt(notification.content) || 1;
                return `te ha enviado ${count} ${count === 1 ? 'moneda' : 'monedas'}`;
            case 'gift':
                return `te ha enviado un regalo: ${notification.content}`;
            default: return 'interactuó contigo';
        }
    };

    const timestamp = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es });

    return (
        <div
            onClick={handleContainerClick}
            className={`flex items-center justify-between py-4 px-4 border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer ${!notification.is_read ? 'bg-blue-500/5' : ''}`}
        >
            <div className="flex items-center gap-4">
                <div className="relative" onClick={handleActorClick}>
                    <Avatar
                        src={actor.avatar_url}
                        alt={actor.username}
                        name={actor.username}
                        size="md"
                        className="border-none ring-2 ring-white/5"
                    />
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-[#121212] ${getBgIcon()} shadow-lg`}>
                        {getIcon()}
                    </div>
                </div>
                <div>
                    <p className="text-sm text-gray-200 leading-tight">
                        <span className="font-bold text-white mr-1.5">@{actor.username}</span>
                        {getMessage()}
                    </p>
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-tight">{timestamp}</span>
                </div>
            </div>

            {notification.type === 'follow' ? (
                <button className="px-4 py-1.5 bg-white/10 text-white text-[11px] font-bold rounded-full hover:bg-white/20 transition-colors border border-white/5 active:scale-95 transform">
                    Seguir
                </button>
            ) : (
                notification.target_id && (
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 overflow-hidden">
                        {/* Placeholder for post thumbnail or icon */}
                        <Star size={14} className="text-white/20" />
                    </div>
                )
            )}
        </div>
    );
}
