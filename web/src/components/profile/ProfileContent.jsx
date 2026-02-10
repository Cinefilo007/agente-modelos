import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs } from '../ui/Tabs';
import { PostGrid } from './PostGrid';
import { ReviewList } from './ReviewList';
import { Grid, Star, Loader } from 'lucide-react';

export function ProfileContent({ posts, onPostClick, modelId, isOwnProfile }) {
    const [activeTab, setActiveTab] = useState('posts');
    const navigate = useNavigate();

    const tabs = [
        { id: 'posts', label: <Grid size={20} /> },
        { id: 'reviews', label: <Star size={20} /> },
    ];

    return (
        <div className="mt-6">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'posts' ? (
                    posts.length > 0 ? (
                        <PostGrid posts={posts} onPostClick={onPostClick} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <Loader size={32} className="text-white/20" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Aún no hay publicaciones</h3>
                            <p className="text-sm text-gray-400 mb-6 max-w-xs">
                                {isOwnProfile
                                    ? "Comparte tus mejores momentos con tus suscriptores."
                                    : "Este usuario aún no ha publicado contenido."}
                            </p>
                            {isOwnProfile && (
                                <button
                                    onClick={() => navigate('/create-post')}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-semibold transition-colors"
                                >
                                    Crear primera publicación
                                </button>
                            )}
                        </div>
                    )
                ) : (
                    <ReviewList modelId={modelId} />
                )}
            </div>
        </div>
    );
}
