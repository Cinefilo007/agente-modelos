import React from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PostGrid({ posts }) {
    return (
        <div className="grid grid-cols-3 gap-1 px-1 mt-4">
            {posts.map((post) => (
                <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className="relative aspect-square overflow-hidden bg-gray-900 group block"
                >
                    {post.media_type === 'video' ? (
                        <video
                            src={`${post.media_url}#t=0.1`}
                            poster={post.thumbnail_url}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                            preload="metadata"
                        />
                    ) : (
                        <img
                            src={post.media_url}
                            alt="Post"
                            className="w-full h-full object-cover"
                        />
                    )}
                    {/* Overlay on Hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold">
                        <span className="flex items-center gap-1">
                            <Heart size={16} fill="white" /> {post.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                            <MessageCircle size={16} fill="white" /> {post.comments_count || 0}
                        </span>
                    </div>
                </Link>
            ))}
        </div>
    );
}
