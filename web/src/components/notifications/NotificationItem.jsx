import React from 'react';
import { Heart, UserPlus, MessageCircle, Star } from 'lucide-react';
import { Avatar } from '../ui/Avatar';

export function NotificationItem({ notification }) {
    const getIcon = () => {
        switch (notification.type) {
            case 'like':
                return <Heart className="w-4 h-4 text-white fill-pink-500" />;
            case 'follow':
                return <UserPlus className="w-4 h-4 text-white fill-blue-500" />;
            case 'comment':
                return <MessageCircle className="w-4 h-4 text-white fill-green-500" />;
            default:
                return <Star className="w-4 h-4 text-white" />;
        }
    };

    const getBgIcon = () => {
        switch (notification.type) {
            case 'like': return 'bg-pink-500';
            case 'follow': return 'bg-blue-500';
            case 'comment': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="flex items-center justify-between py-3 px-4 border-b border-white/5 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Avatar src={notification.user.avatar} size="md" />
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-[#121212] ${getBgIcon()}`}>
                        {getIcon()}
                    </div>
                </div>
                <div>
                    <p className="text-sm text-gray-200">
                        <span className="font-bold text-white mr-1">{notification.user.name}</span>
                        {notification.message}
                    </p>
                    <span className="text-xs text-gray-500">{notification.timestamp}</span>
                </div>
            </div>

            {notification.type === 'follow' ? (
                <button className="px-3 py-1 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20 transition-colors">
                    Seguir
                </button>
            ) : (
                notification.postImage && (
                    <img src={notification.postImage} alt="Post" className="w-10 h-10 rounded-md object-cover" />
                )
            )}
        </div>
    );
}
