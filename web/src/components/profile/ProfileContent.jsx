import React, { useState } from 'react';
import { Tabs } from '../ui/Tabs';
import { PostGrid } from './PostGrid';
import { ReviewList } from './ReviewList';
import { Grid, Star } from 'lucide-react';

export function ProfileContent({ posts, onPostClick }) {
    const [activeTab, setActiveTab] = useState('posts');

    const tabs = [
        { id: 'posts', label: <Grid size={20} /> },
        { id: 'reviews', label: <Star size={20} /> },
    ];

    return (
        <div className="mt-6">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'posts' ? (
                    <PostGrid posts={posts} onPostClick={onPostClick} />
                ) : (
                    <ReviewList />
                )}
            </div>
        </div>
    );
}
