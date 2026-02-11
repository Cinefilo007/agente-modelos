import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FeedPostCard } from '../components/feed/FeedPostCard';
import { FeedFilter } from '../components/feed/FeedFilter';
import { StoryCarousel } from '../components/profile/StoryCarousel';
import StoryViewer from '../components/profile/StoryViewer';
import api from '../api/axios';
import { Loader } from 'lucide-react';

function Feed() {
    const [filter, setFilter] = useState('recent');
    const [stories, setStories] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(null);

    // Fetch Stories
    useEffect(() => {
        const fetchStories = async () => {
            try {
                const { data } = await api.get('/content/stories/feed');
                // Map to format if needed, but StoryCarousel uses standard fields mostly
                // API: media_url, created_at, id. components uses these.
                setStories(data || []);
            } catch (err) {
                console.error("Error fetching stories:", err);
            }
        };
        fetchStories();
    }, []);

    // Fetch Posts when filter changes
    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            try {
                // Map filter to backend sort/filter
                // Frontend: recent, top, following
                // Backend: sort=recent/top, filter_type=global/following
                let sort = 'recent';
                let filterType = 'global';

                if (filter === 'top') sort = 'top';
                if (filter === 'following') filterType = 'following';

                const { data } = await api.get(`/content/feed?sort=${sort}&filter_type=${filterType}`);

                // Map API data to FeedPostCard format
                const mappedPosts = data.map(p => ({
                    id: p.id,
                    media_url: p.media_url, // Direct mapping for video support
                    image: p.media_url, // For legacy/fallback
                    media_type: p.media_type, // Crucial for video detection
                    thumbnail_url: p.thumbnail_url, // Optional if available in future
                    description: p.caption,
                    likes_count: p.likes_count || 0,
                    comments_count: p.comments_count || 0,
                    type: p.media_type,
                    timestamp: p.created_at, // Pass raw ISO string for timeAgo
                    created_at: p.created_at,
                    user: {
                        id: p.models?.id || p.model_id, // Use ID for link
                        name: p.models?.full_name || p.models?.username || 'Unknown',
                        artistic_name: p.models?.artistic_name, // Support artistic name
                        avatar: p.models?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.models?.username || 'User'}`,
                        isOnline: false
                    }
                }));

                setPosts(mappedPosts);
            } catch (err) {
                console.error("Error fetching posts:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, [filter]);

    const handleOpenStory = (story) => {
        const index = stories.findIndex(s => s.id === story.id);
        if (index !== -1) setSelectedStoryIndex(index);
    };

    const { user } = useAuth(); // Get user for role check
    const isAdmin = user?.role === 'admin';

    // Handle Delete (Admin)
    const handleDeletePost = async (postId) => {
        const reason = window.prompt("¿Motivo de la eliminación? (Opcional)");
        if (reason === null) return; // Cancelled

        try {
            await api.delete(`/content/posts/${postId}`, { data: { reason } });
            // Remove from state
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (err) {
            console.error("Error deleting post:", err);
            alert("Error al eliminar el post.");
        }
    };

    // Polling for New Posts
    const [newPostsCount, setNewPostsCount] = useState(0);
    const latestPostIdRef = useRef(null);

    useEffect(() => {
        if (posts.length > 0 && !latestPostIdRef.current) {
            latestPostIdRef.current = posts[0].id;
        }
    }, [posts]);

    useEffect(() => {
        const interval = setInterval(async () => {
            if (!latestPostIdRef.current) return;
            try {
                const { data } = await api.get('/content/feed?sort=recent&limit=1');
                if (data && data.length > 0) {
                    const newest = data[0];
                    if (newest.id !== latestPostIdRef.current) {
                        // Simple check, in real world we'd count how many
                        setNewPostsCount(prev => prev + 1);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 15000); // Check every 15s

        return () => clearInterval(interval);
    }, []);

    const reloadFeed = () => {
        setLoading(true);
        setNewPostsCount(0);
        // Trigger fetch by toggling filter (hacky but works) or just reload window? 
        // Better: extract fetchPosts to function and call it.
        // For simplicity here, let's force re-mount or duplicate fetch logic.
        // Actually, let's just use window.location.reload() for a "hard refresh" feel or update state.
        window.location.reload();
    };

    return (
        <div className="pb-24 pt-0 relative">
            {/* 1. Sticky Filters (Top 0) */}
            <FeedFilter currentFilter={filter} onFilterChange={setFilter} />

            {/* New Posts Alert */}
            {newPostsCount > 0 && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 animate-bounce">
                    <button
                        onClick={reloadFeed}
                        className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        Nuevas Publicaciones
                    </button>
                </div>
            )}

            {/* Stories Viewer Modal */}
            {selectedStoryIndex !== null && (
                <StoryViewer
                    stories={stories}
                    initialStoryIndex={selectedStoryIndex}
                    onClose={() => setSelectedStoryIndex(null)}
                />
            )}

            {/* 2. Stories */}
            <div className="pt-2 pb-2">
                <StoryCarousel stories={stories} onOpenStory={handleOpenStory} />
            </div>

            {/* 3. Feed Posts */}
            <div className="pt-0 min-h-[50vh]">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader className="animate-spin text-purple-500" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        No hay publicaciones para mostrar.
                    </div>
                ) : (
                    posts.map((post) => (
                        <FeedPostCard
                            key={post.id}
                            post={post}
                            isAdmin={isAdmin}
                            onDelete={() => handleDeletePost(post.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default Feed;
