import React, { useState } from 'react';
import { FeedPostCard } from '../components/feed/FeedPostCard';
import { FeedFilter } from '../components/feed/FeedFilter';
import { StoryCarousel } from '../components/profile/StoryCarousel'; // Reusing story component
import { POSTS, STORIES } from '../data/dummy';
import { Plus } from 'lucide-react';

function Feed() {
    const [filter, setFilter] = useState('recent');
    const [displayStories, setDisplayStories] = useState(STORIES);

    // In a real app, filtering logic would happen here or in backend
    const displayPosts = POSTS;

    return (
        <div className="pb-24 pt-0">
            {/* 1. Sticky Filters (Top 0) */}
            <FeedFilter currentFilter={filter} onFilterChange={setFilter} />

            {/* 2. Stories */}
            <div className="pt-2 pb-2">
                {/* We can pass a flag to StoryCarousel to show 'Add Story' button only if user is model */}
                <StoryCarousel stories={displayStories} onOpenStory={() => { }} />
            </div>

            {/* 3. Feed Posts */}
            <div className="pt-0">
                {displayPosts.map((post) => (
                    <FeedPostCard key={post.id} post={post} />
                ))}
            </div>
        </div>
    );
}

export default Feed;
