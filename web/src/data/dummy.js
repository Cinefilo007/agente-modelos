export const CURRENT_USER = {
    id: 'user_123',
    name: 'Valentina Rose',
    username: '@valerose',
    role: 'model', // 'model' | 'client'
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop',
    cover: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=2070&auto=format&fit=crop',
    bio: '✨ Digital Soul | Creating magic in the metaverse 💜',
    stats: {
        followers: '12.5k',
        following: 150,
        likes: '45.2k'
    },
    themeColor: '#8B5CF6', // Violet-500 default
    isOnline: true,
    lastSeen: new Date().toISOString(),
};

export const STORIES = [
    {
        id: 'story_1',
        user: CURRENT_USER,
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
        viewed: false,
    },
    {
        id: 'story_2',
        user: CURRENT_USER,
        image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=1000&auto=format&fit=crop',
        viewed: false,
    },
];

export const POSTS = [
    {
        id: 'post_1',
        user: CURRENT_USER,
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop',
        likes: 1240,
        comments: 45,
        description: 'Feeling the vibe today ✨ Purple energy only!',
        timestamp: '2h ago',
        type: 'image'
    },
    {
        id: 'post_2',
        user: CURRENT_USER,
        image: 'https://images.unsplash.com/photo-1502323777036-f29e3972d8db?q=80&w=1000&auto=format&fit=crop',
        likes: 890,
        comments: 20,
        description: 'Late night studio sessions 🎵',
        timestamp: '5h ago',
        type: 'image'
    }
];

export const NOTIFICATIONS = [
    {
        id: 'notif_1',
        type: 'like',
        user: { name: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=a' },
        message: 'liked your post',
        timestamp: '10m ago'
    },
    {
        id: 'notif_2',
        type: 'follow',
        user: { name: 'Jane Smith', avatar: 'https://i.pravatar.cc/150?u=b' },
        message: 'started following you',
        timestamp: '1h ago'
    }
];
