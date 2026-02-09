import React from 'react';
import { NotificationItem } from '../components/notifications/NotificationItem';
import { NOTIFICATIONS } from '../data/dummy';

function Notifications() {
    return (
        <div className="pb-20 pt-4">
            <h2 className="px-4 text-lg font-bold text-white mb-4">Notificaciones</h2>

            <div className="flex flex-col">
                {NOTIFICATIONS.map((notif) => (
                    <NotificationItem key={notif.id} notification={notif} />
                ))}
                {/* More dummy items to show scroll */}
                <NotificationItem notification={{ ...NOTIFICATIONS[0], id: 'n3', type: 'comment', message: 'commented: "Love this!"', timestamp: '2h ago' }} />
                <NotificationItem notification={{ ...NOTIFICATIONS[1], id: 'n4', type: 'like', message: 'liked your story', postImage: null, timestamp: '1d ago' }} />
            </div>
        </div>
    );
}

export default Notifications;
