```
import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import { timeAgo } from '../../utils/date';

export function FeedPostCard({ post }) {
    const { themeColor } = useTheme();
    const [isLiked, setIsLiked] = useState(false);

    // Dummy comment count generator if not present
    const commentCount = post.comments || Math.floor(Math.random() * 50) + 5;

    // Ensure timestamp is treated as string for our util if it's already formatted, 
    // BUT post.timestamp from Feed.jsx mapping is "new Date().toLocaleDateString()".
    // We should pass ISO string to FeedPostCard to make util work best.
    // For now assuming post.timestamp MIGHT be a date string or already formatted.
    // If it comes from real API mapping in Feed.jsx, it was: 
    // timestamp: new Date(p.created_at).toLocaleDateString()
    // I need to change Feed.jsx mapping first! Or handle it here.
    // Let's assume I fix Feed.jsx to pass created_at ISO string.

    // Actually, FeedPostCard receives `post`. 
    // Let's change Feed.jsx mapping in next step. For now update import.

    return (
        <div className="mb-6 glass-panel rounded-3xl overflow-hidden border border-border shadow-2xl mx-1 transform transition-all hover:scale-[1.01]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-secondary/30">
                <div className="flex items-center gap-3">
                    <Link to={`/ profile / ${ post.user.id } `} className="relative">
                        <Avatar src={post.user.avatar} size="sm" isOnline={post.user.isOnline} />
                    </Link>
                    <div>
                        <h3 className="font-bold text-sm text-foreground leading-none">{post.user.name}</h3>
                        <span className="text-xs text-muted-foreground">{timeAgo(post.created_at || post.timestamp)}</span>
                    </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Image (Click to Detail) */}
            <Link to={`/ post / ${ post.id } `}>
                <div className="relative aspect-[4/5] bg-muted/20 group cursor-pointer">
                    <img
                        src={post.image}
                        alt="Post Content"
                        className="w-full h-full object-cover"
                    />
                    {/* Video Indicator (Fake) if it were a video */}
                    {/* <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-md"><Play size={12} className="text-white" /></div> */}
                </div>
            </Link>

            {/* Actions */}
            <div className="p-4 pt-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsLiked(!isLiked)}
                            className={`transition - all hover: scale - 110 ${ isLiked ? 'text-pink-500' : 'text-foreground hover:text-pink-400' } `}
                        >
                            <Heart size={26} className={isLiked ? 'fill-pink-500' : ''} />
                        </button>
                        <Link to={`/ post / ${ post.id } `} className="text-foreground hover:text-blue-400 transition-colors hover:scale-110 flex items-center gap-1 group">
                            <MessageCircle size={26} />
                            <span className="text-xs font-bold text-muted-foreground group-hover:text-blue-400 transition-colors">{commentCount}</span>
                        </Link>
                        <button className="text-foreground hover:text-green-400 transition-colors hover:scale-110">
                            <Share2 size={26} />
                        </button>
                    </div>
                    {/* Tag or indicator */}
                    <div className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold text-muted-foreground border border-border">
                        {post.type}
                    </div>
                </div>

                <div className="font-bold text-sm text-foreground mb-2">{post.likes.toLocaleString()} Me gusta</div>

                <div className="text-sm text-muted-foreground mb-3">
                    <span className="font-bold text-foreground mr-2">{post.user.name}</span>
                    {post.description}
                </div>

                {/* Comment Input Preview */}
                <Link to={`/ post / ${ post.id } `}>
                    <div className="flex gap-2 items-center mt-2 border-t border-border pt-3 opacity-80 hover:opacity-100 transition-opacity cursor-text">
                        <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150" className="w-6 h-6 rounded-full" alt="User" />
                        <div className="flex-1 text-muted-foreground text-sm">Agrega un comentario...</div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
