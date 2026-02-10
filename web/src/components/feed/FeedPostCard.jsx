import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Play, Volume2, VolumeX } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import { timeAgo } from '../../utils/date';

export function FeedPostCard({ post }) {
    const { themeColor } = useTheme();
    const [isLiked, setIsLiked] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    // Dummy comment count generator if not present
    const commentCount = post.comments || Math.floor(Math.random() * 50) + 5;

    useEffect(() => {
        if (post.media_type !== 'video' || !videoRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        videoRef.current.muted = isMuted; // Apply current mute state
                        videoRef.current.play().catch(e => {
                            console.log("Autoplay prevented:", e.message);
                        });
                    } else {
                        videoRef.current.pause();
                    }
                });
            },
            { threshold: 0.6 }
        );

        if (containerRef.current) observer.observe(containerRef.current);
        return () => {
            if (containerRef.current) observer.unobserve(containerRef.current);
        };
    }, [post.media_type, isMuted]); // Re-run if mute state changes to ensure consistency if needed, though mostly direct ref manipulation works

    const toggleMute = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    return (
        <div ref={containerRef} className="mb-6 glass-panel rounded-3xl overflow-hidden border border-border shadow-2xl mx-1 transform transition-all hover:scale-[1.01]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-secondary/30">
                <div className="flex items-center gap-3">
                    <Link to={`/profile/${post.user.id}`} className="relative">
                        <Avatar src={post.user.avatar} size="sm" isOnline={post.user.isOnline} />
                    </Link>
                    <div>
                        <h3 className="font-bold text-sm text-foreground leading-none">{post.user.artistic_name || post.user.name}</h3>
                        <span className="text-xs text-muted-foreground">{timeAgo(post.created_at || post.timestamp)}</span>
                    </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Media */}
            <Link to={`/post/${post.id}`}>
                <div className="relative aspect-[4/5] bg-black group cursor-pointer">
                    {post.media_type === 'video' ? (
                        <>
                            <video
                                ref={videoRef}
                                src={post.media_url}
                                className="w-full h-full object-cover"
                                loop
                                muted={isMuted} // Controlled by state
                                playsInline
                                poster={post.thumbnail_url}
                                controlsList="nodownload"
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            {/* Sound Toggle */}
                            <button
                                onClick={toggleMute}
                                className="absolute bottom-3 right-3 p-2 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors z-10"
                            >
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                        </>
                    ) : (
                        <img
                            src={post.media_url || post.image}
                            alt="Post Content"
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>
            </Link>

            {/* Actions */}
            <div className="p-4 pt-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsLiked(!isLiked)}
                            className={`transition-all hover:scale-110 flex items-center gap-1 ${isLiked ? 'text-pink-500' : 'text-foreground hover:text-pink-400'}`}
                        >
                            <Heart size={26} className={isLiked ? 'fill-pink-500' : ''} />
                            <span className="text-sm font-bold ml-1">{post.likes.toLocaleString()}</span>
                        </button>
                        <Link to={`/post/${post.id}`} className="text-foreground hover:text-blue-400 transition-colors hover:scale-110 flex items-center gap-1 group">
                            <MessageCircle size={26} />
                            <span className="text-xs font-bold text-muted-foreground group-hover:text-blue-400 transition-colors">{commentCount}</span>
                        </Link>
                        {/* Share removed */}
                    </div>
                    {/* Media Type Badge removed */}
                </div>

                {/* Likes text removed */}

                <div className="text-sm text-muted-foreground mb-3">
                    <span className="font-bold text-foreground mr-2">{post.user.artistic_name || post.user.name}</span>
                    {post.description}
                </div>

                {/* Comment Input Preview */}
                <Link to={`/post/${post.id}`}>
                    <div className="flex gap-2 items-center mt-2 border-t border-border pt-3 opacity-80 hover:opacity-100 transition-opacity cursor-text">
                        <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150" className="w-6 h-6 rounded-full" alt="User" />
                        <div className="flex-1 text-muted-foreground text-sm">Agrega un comentario...</div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
