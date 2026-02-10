import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Volume2, VolumeX, Send, X, Maximize2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from '../components/ui/Avatar';
import { POSTS } from '../data/dummy';
import api from '../api/axios';

export default function PostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { themeColor } = useTheme();
    const [post, setPost] = useState(null);
    const [isLiked, setIsLiked] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchPostData = async () => {
            try {
                // Fetch Post
                const { data: postData } = await api.get(`/content/post/${id}`);
                setPost(postData);

                // Fetch Comments
                const { data: commentsData } = await api.get(`/interactions/comments/${id}`);
                setComments(commentsData || []);

                // Check Like Status (Optional: add endpoint or assume false for now)
                // const { data: likeStatus } = await api.get(`/interactions/likes/status/${id}`);
                // setIsLiked(likeStatus.liked);

            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPostData();
    }, [id]);

    const handleLike = async () => {
        // Optimistic UI
        const oldLiked = isLiked;
        const oldLikes = post.likes_count;

        setIsLiked(!isLiked);
        setPost(prev => ({ ...prev, likes_count: prev.likes_count + (isLiked ? -1 : 1) })); // Adjust count

        try {
            await api.post('/interactions/interact', {
                target_id: id,
                target_type: 'post',
                action: 'like'
            });
        } catch (err) {
            console.error("Error liking:", err);
            // Revert
            setIsLiked(oldLiked);
            setPost(prev => ({ ...prev, likes_count: oldLikes }));
        }
    };

    const handleComment = async () => {
        if (!newComment.trim()) return;
        setSubmitting(true);
        try {
            const { data: comment } = await api.post('/interactions/interact', {
                target_id: id,
                target_type: 'post',
                action: 'comment',
                content: newComment
            });

            // Add to list (need format compatible with fetched comments)
            // We need current user info to append optimistically or just re-fetch
            // For now re-fetch simple or optimistic append if we had user context

            // Re-fetch comments to match format
            const { data: commentsData } = await api.get(`/interactions/comments/${id}`);
            setComments(commentsData || []);
            setNewComment("");

            // Increment count locally
            setPost(prev => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }));

        } catch (err) {
            console.error("Error commenting:", err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
    );

    if (!post) return <div className="text-white text-center mt-20">Publicación no encontrada</div>;

    // Helper to format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const user = post.models || {}; // Joined model data

    const toggleFullscreen = (e) => {
        e?.stopPropagation();
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div className="h-full flex flex-col relative bg-transparent">
            {/* FULLSCREEN MODE OVERLAY - Always Dark */}
            {isFullscreen && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-200">
                    <button
                        onClick={toggleFullscreen}
                        className="absolute top-6 right-6 p-3 bg-black/50 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all z-[101]"
                    >
                        <X size={28} />
                    </button>
                    <img
                        src={post.image}
                        className="w-full h-full object-contain pointer-events-none select-none"
                        alt="Full Content"
                    />
                </div>
            )}

            {/* Header de Navegación */}
            <div className="flex-none flex items-center justify-between p-4 bg-transparent z-10 relative">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full bg-[var(--card-bg)]/50 backdrop-blur-md border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <span className="text-[var(--text-primary)] font-bold text-xs tracking-[0.2em] uppercase opacity-80">Publicación</span>
                <button className="p-2 rounded-full bg-transparent text-white opacity-0 pointer-events-none">
                    <MoreVertical size={24} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pb-[80px]"> {/* Padding needed for fixed input */}

                {/* Media Container */}
                <div className="w-full aspect-[4/5] bg-black/5 relative group mb-4 flex items-center justify-center bg-black">
                    {post.media_type === 'video' ? (
                        <video
                            src={post.media_url}
                            controls
                            className="w-full h-full object-contain"
                            poster={post.thumbnail_url}
                        />
                    ) : (
                        <img
                            src={post.media_url}
                            onClick={() => setIsFullscreen(true)}
                            className="w-full h-full object-contain cursor-pointer"
                            alt="Post Content"
                        />
                    )}
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-lg">
                            <Maximize2 size={16} className="text-white/80" />
                        </div>
                    </div>
                </div>

                {/* Post Info */}
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar src={user.avatar_url} size="md" isOnline={false} />
                        <div className="flex-1">
                            <h3 className="text-[var(--text-primary)] font-bold text-base">{user.full_name || user.username}</h3>
                            <p className="text-[var(--text-secondary)] text-xs">{formatDate(post.created_at)}</p>
                        </div>
                        <button className="px-4 py-1 rounded-full bg-[var(--card-bg)] border border-[var(--glass-border)] text-xs font-semibold text-[var(--text-primary)] hover:opacity-80 transition-colors">
                            Ver Perfil
                        </button>
                    </div>

                    <p className="text-[var(--text-primary)] opacity-90 text-sm leading-relaxed mb-4 font-light">
                        {post.caption}
                    </p>

                    {/* Stats Bar */}
                    <div className="flex items-center gap-6 py-3 border-y border-[var(--glass-border)]">
                        <button onClick={handleLike} className="flex items-center gap-2 group">
                            <Heart size={22} className={`transition-all ${isLiked ? 'fill-pink-500 text-pink-500 scale-110' : 'text-[var(--text-primary)] group-active:scale-95'}`} />
                            <span className="text-sm font-medium text-[var(--text-primary)] opacity-90">{post.likes_count || 0}</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <MessageCircle size={22} className="text-[var(--text-primary)]" />
                            <span className="text-sm font-medium text-[var(--text-primary)] opacity-90">{post.comments_count || 0}</span>
                        </div>
                        <div className="flex-1"></div>
                        <Share2 size={22} className="text-[var(--text-primary)] opacity-80" />
                    </div>

                    {/* Comments List */}
                    <div className="mt-6 space-y-4">
                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Comentarios Recientes</h4>
                        {comments.length === 0 ? (
                            <p className="text-sm text-[var(--text-secondary)] text-center py-4">Sé el primero en comentar.</p>
                        ) : (
                            comments.map((comment, i) => (
                                <div key={comment.id || i} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[var(--card-bg)] flex-shrink-0 overflow-hidden">
                                        <img
                                            src={comment.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.username}`}
                                            alt={comment.username}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-sm font-semibold text-[var(--text-primary)]">{comment.username}</span>
                                            <span className="text-[10px] text-[var(--text-secondary)]">
                                                {formatDate(comment.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-primary)] opacity-70 font-light">
                                            {comment.content}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* FIXED INPUT AREA */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-[var(--card-bg)]/80 backdrop-blur-xl border-t border-[var(--glass-border)] z-20">
                <div className="flex items-center gap-3">
                    {/* User Avatar (Current User - if context available, or generic) */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-[1px]">
                        <div className="w-full h-full rounded-full bg-[var(--card-bg)] overflow-hidden">
                            {/* Ideally fetch current user avatar from context */}
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Me" className="w-full h-full object-cover opacity-80" />
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Agrega un comentario..."
                            className="w-full bg-[var(--glass-border)] border border-[var(--glass-border)] rounded-full h-10 pl-4 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--text-secondary)] transition-colors"
                            style={{ caretColor: themeColor }}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                        />
                        <button
                            onClick={handleComment}
                            disabled={submitting || !newComment.trim()}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-[var(--glass-border)] text-[var(--text-primary)] transition-colors disabled:opacity-50"
                            style={{ color: themeColor }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
