import React from 'react';
import { Heart, MessageCircle, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function PostGrid({ posts, onPostClick }) {
    const { user: currentUser } = useAuth();
    const isAuth = !!currentUser;

    return (
        <div className="grid grid-cols-3 gap-1 px-1 mt-4">
            {posts.map((post) => {
                const content = (
                    <div className="relative aspect-square overflow-hidden bg-gray-900 group block cursor-pointer">
                        {post.media_type === 'video' ? (
                            <video
                                src={`${post.media_url}#t=0.1`}
                                poster={post.thumbnail_url}
                                className={`w-full h-full object-cover transition-all duration-500 ${!isAuth ? 'blur-xl scale-110 opacity-60' : ''}`}
                                playsInline
                                muted
                                preload="metadata"
                            />
                        ) : (
                            <img
                                src={post.media_url}
                                alt="Post"
                                className={`w-full h-full object-cover transition-all duration-500 ${!isAuth ? 'blur-xl scale-110 opacity-60' : ''}`}
                            />
                        )}

                        {/* Public/Guest Protection Overlay */}
                        {!isAuth ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-1 border border-white/20">
                                    <Lock size={14} className="text-white" />
                                </div>
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter drop-shadow-lg">
                                    Premium
                                </span>
                            </div>
                        ) : (
                            /* Overlay on Hover for Auth Users */
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold">
                                <span className="flex items-center gap-1">
                                    <Heart size={16} fill="white" /> {post.likes_count || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MessageCircle size={16} fill="white" /> {post.comments_count || 0}
                                </span>
                            </div>
                        )}
                    </div>
                );

                if (!isAuth) {
                    return (
                        <div key={post.id} onClick={() => onPostClick && onPostClick(post.id)}>
                            {content}
                        </div>
                    );
                }

                return (
                    <Link key={post.id} to={`/post/${post.id}`}>
                        {content}
                    </Link>
                );
            })}
        </div>
    );
}
