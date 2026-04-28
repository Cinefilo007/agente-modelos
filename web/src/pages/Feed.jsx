import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FeedPostCard } from '../components/feed/FeedPostCard';
import { FeedFilter } from '../components/feed/FeedFilter';
import { StoryCarousel } from '../components/profile/StoryCarousel';
import StoryViewer from '../components/profile/StoryViewer';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { Loader } from 'lucide-react';

function Feed() {
    const [filter, setFilter] = useState('recent');
    const [stories, setStories] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(null);
    const { showToast } = useToast();

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
                    tips_count: p.tips_count || 0,
                    gifts_count: p.gifts_count || 0,
                    is_liked: p.is_liked || false,
                    type: p.media_type,
                    timestamp: p.created_at, // Pass raw ISO string for timeAgo
                    created_at: p.created_at,
                    external_links: p.external_links || [],
                    user: {
                        id: p.models?.id || p.model_id, // Use ID for link
                        username: p.models?.username,   // IMPORTANT: Pass username for clean URLs
                        name: p.models?.full_name || p.models?.username || 'Unknown',
                        artistic_name: p.models?.artistic_name, // Support artistic name
                        avatar: p.models?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.models?.username || 'User'}`,
                        is_online: p.is_online,
                        is_verified: p.models?.is_verified || false
                    },
                    is_online: p.is_online
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
            showToast("Post eliminado", "success");
        } catch (err) {
            console.error("Error deleting post:", err);
            showToast("Error al eliminar el post.", "error");
        }
    };

    // Polling for New Posts
    const [newPostsCount, setNewPostsCount] = useState(0);
    const latestPostIdRef = useRef(null);

    useEffect(() => {
        if (posts.length > 0) {
            latestPostIdRef.current = posts[0].id;
            localStorage.setItem('latest_seen_post_id', posts[0].id);
            window.dispatchEvent(new Event('feed_read'));
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
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-top-4 fade-in duration-300">
                    <button
                        onClick={reloadFeed}
                        className="bg-[#1a1a1a]/90 backdrop-blur-md border border-white/20 text-white text-xs px-4 py-1.5 rounded-full font-medium shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center gap-2 hover:bg-white/10 transition-colors"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                        Nuevos posts
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
                    <div className="flex flex-col items-center justify-center text-center py-20 px-8 text-white/50">
                        {filter === 'following' ? (
                            <>
                                <h3 className="font-bold text-lg mb-2 text-white/80">Sin publicaciones</h3>
                                <p className="text-sm">Aún no sigues a ninguna modelo o no han publicado contenido reciente.</p>
                            </>
                        ) : (
                            <p className="text-sm">No hay publicaciones para mostrar.</p>
                        )}
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
