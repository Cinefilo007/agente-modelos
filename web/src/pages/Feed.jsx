import React, { useState, useEffect } from 'react';
import { FeedPostCard } from '../components/feed/FeedPostCard';
import { FeedFilter } from '../components/feed/FeedFilter';
import { StoryCarousel } from '../components/profile/StoryCarousel';
import { StoryViewer } from '../components/profile/StoryViewer';
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
                    image: p.media_url,
                    description: p.caption,
                    likes: p.likes_count || 0,
                    comments: p.comments_count || 0,
                    type: p.media_type,
                    timestamp: new Date(p.created_at).toLocaleDateString(),
                    user: {
                        id: p.models?.username || p.model_id, // Use username for link if possible
                        name: p.models?.full_name || p.models?.username || 'Unknown',
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

    return (
        <div className="pb-24 pt-0">
            {/* 1. Sticky Filters (Top 0) */}
            <FeedFilter currentFilter={filter} onFilterChange={setFilter} />

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
                        <FeedPostCard key={post.id} post={post} />
                    ))
                )}
            </div>
        </div>
    );
}

export default Feed;
