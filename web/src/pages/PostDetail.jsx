import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Volume2, VolumeX, Send, X, Maximize2, Trash2, Flag, CircleDollarSign } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/ui/Avatar';
import { timeAgo } from '../utils/date';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import GiftSelector from '../components/posts/GiftSelector';
import { Gift } from 'lucide-react';

export default function PostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { themeColor } = useTheme();
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();

    const [post, setPost] = useState(null);
    const [isLiked, setIsLiked] = useState(false);
    const [tipsCount, setTipsCount] = useState(0);
    const [animations, setAnimations] = useState([]); // Flying coins
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isTipping, setIsTipping] = useState(false);
    const [showGiftSelector, setShowGiftSelector] = useState(false);
    const [giftsCount, setGiftsCount] = useState(0);

    const videoRef = React.useRef(null);

    useEffect(() => {
        const fetchPostData = async () => {
            try {
                // Fetch Post
                const { data: postData } = await api.get(`/content/post/${id}`);
                setPost(postData);
                setIsLiked(postData.is_liked || false);
                setTipsCount(postData.tips_count || 0);
                setGiftsCount(postData.gifts_count || 0);

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
        if (currentUser?.role === 'admin') return;

        // Optimistic UI
        const oldLiked = isLiked;
        const oldLikes = post.likes_count;

        setIsLiked(!isLiked);
        setPost(prev => ({ ...prev, likes_count: (prev.likes_count || 0) + (isLiked ? -1 : 1) }));

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

    const handleFastTip = async (e) => {
        if (currentUser?.role === 'admin' || isTipping || currentUser?.role === 'model') return;

        e?.preventDefault();
        e?.stopPropagation();

        setIsTipping(true);
        // 1. Optimistic Update
        setTipsCount(prev => prev + 1);

        // 2. Trigger Animation
        const animId = Date.now();
        setAnimations(prev => [...prev, animId]);
        setTimeout(() => {
            setAnimations(prev => prev.filter(a => a !== animId));
        }, 1000);

        try {
            await api.post('/wallet/tip', {
                model_id: post.model_id,
                post_id: id
            });
            // Update balance in context if possible (assuming api handles it or context provides refresh)
        } catch (error) {
            console.error("Tip failed", error);
            setTipsCount(prev => prev - 1);
            showToast(error.response?.data?.detail || "Error al enviar moneda.", "error");
        } finally {
            setIsTipping(false);
        }
    };

    const handleComment = async () => {
        if (!newComment.trim()) return;
        setSubmitting(true);
        try {
            await api.post('/interactions/interact', {
                target_id: id,
                target_type: 'post',
                action: 'comment',
                content: newComment
            });

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

    const handleDelete = async () => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar esta publicación?")) return;
        try {
            await api.delete(`/content/posts/${id}`);
            navigate(-1);
        } catch (err) {
            console.error("Error deleting post:", err);
            showToast("Error al eliminar la publicación", "error");
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
    const isOwner = currentUser?.user_id === post.model_id;

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
                        src={post.media_url}
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

                {/* Actions: Delete (Standalone) or Menu (Images only) */}
                <div className="flex items-center gap-2">
                    {(isOwner || currentUser?.role === 'admin') && (
                        <button
                            onClick={handleDelete}
                            className="p-2 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                            title="Eliminar Publicación"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}

                    {/* Only show menu if NOT a video (as requested) */}
                    {post.media_type !== 'video' && (
                        <div className="relative group">
                            <button className="p-2 rounded-full bg-[var(--card-bg)]/50 backdrop-blur-md text-white hover:bg-white/20 transition-colors border border-[var(--glass-border)]">
                                <MoreVertical size={24} />
                            </button>
                            {/* Dropdown can stay for report etc if not owner, or just leave as is */}
                            {!isOwner && (
                                <div className="absolute right-0 mt-2 w-48 bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <button
                                        className="w-full text-left px-4 py-3 text-white/70 hover:bg-white/5 text-sm font-medium flex items-center gap-2"
                                    >
                                        <Flag size={16} />
                                        Reportar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pb-[80px]"> {/* Padding needed for fixed input */}

                <div className="w-full aspect-[4/5] bg-black relative group mb-4 flex items-center justify-center overflow-hidden">
                    {post.media_type === 'video' ? (
                        <div className="relative w-full h-full">
                            <video
                                ref={videoRef}
                                src={post.media_url}
                                autoPlay
                                loop
                                muted={isMuted}
                                className="w-full h-full object-contain"
                                poster={post.thumbnail_url}
                                playsInline
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            {/* Custom Overlays for Video */}
                            <div className="absolute bottom-4 left-4 flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                    className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/10"
                                >
                                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
                                    className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/10"
                                >
                                    <Maximize2 size={20} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <img
                            src={post.media_url}
                            onClick={() => setIsFullscreen(true)}
                            className="w-full h-full object-contain cursor-pointer"
                            alt="Post Content"
                        />
                    )}
                </div>

                {/* Post Info */}
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar
                            src={user.avatar_url || user.avatar}
                            name={user.full_name || user.username}
                            size="md"
                            isOnline={post.is_online}
                        />
                        <div className="flex-1">
                            <h3 className="text-[var(--text-primary)] font-bold text-base">{user.full_name || user.username}</h3>
                            <p className="text-[var(--text-secondary)] text-xs">{timeAgo(post.created_at)}</p>
                        </div>
                        <button
                            onClick={() => navigate(`/profile/${user.username}`)}
                            className="px-4 py-1 rounded-full bg-[var(--card-bg)] border border-[var(--glass-border)] text-xs font-semibold text-[var(--text-primary)] hover:opacity-80 transition-colors"
                        >
                            Ver Perfil
                        </button>
                    </div>

                    <p className="text-[var(--text-primary)] opacity-90 text-sm leading-relaxed mb-4 font-light">
                        {post.caption}
                    </p>

                    {/* Stats Bar */}
                    <div className="flex items-center gap-6 py-3 border-y border-[var(--glass-border)]">
                        <motion.button
                            whileTap={{ scale: 1.2 }}
                            onClick={handleLike}
                            className="flex items-center gap-2 group outline-none"
                        >
                            <Heart size={22} className={`transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110 [filter:drop-shadow(0_0_8px_rgba(239,68,68,0.6))]' : 'text-[var(--text-primary)] group-active:scale-95'}`} />
                            <span className={`text-sm font-bold transition-colors ${isLiked ? 'text-red-500' : 'text-[var(--text-primary)] opacity-90'}`}>{post.likes_count || 0}</span>
                        </motion.button>

                        <div className="flex items-center gap-2">
                            <MessageCircle size={22} className="text-[var(--text-primary)]" />
                            <span className="text-sm font-medium text-[var(--text-primary)] opacity-90">{post.comments_count || 0}</span>
                        </div>

                        <div className="flex items-center gap-2 relative">
                            <motion.button
                                whileTap={{ scale: 1.4 }}
                                onClick={handleFastTip}
                                className="flex items-center gap-2 group/tip"
                            >
                                <div className="relative">
                                    <CircleDollarSign size={22} className="text-yellow-400 group-hover/tip:drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                                    <AnimatePresence>
                                        {animations.map(animId => (
                                            <motion.div
                                                key={animId}
                                                initial={{ y: 0, x: 0, opacity: 1, scale: 1 }}
                                                animate={{ y: -50, x: (Math.random() - 0.5) * 30, opacity: 0, scale: 1.5 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.8 }}
                                                className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-visible"
                                            >
                                                <span className="text-lg">🪙</span>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                                <span className="text-sm font-medium text-[var(--text-primary)] opacity-90">{tipsCount}</span>
                            </motion.button>
                        </div>

                        {currentUser?.role !== 'model' && (
                            <button
                                onClick={() => setShowGiftSelector(true)}
                                className="flex items-center gap-2 text-[var(--text-primary)] transition-all active:scale-110 hover:text-purple-400 group"
                                title="Enviar Regalo"
                            >
                                <Gift size={22} className="group-hover:drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]" />
                                <span className="text-sm font-bold opacity-90">{giftsCount}</span>
                            </button>
                        )}
                        <div className="flex-1"></div>
                        {/* Share button removed */}
                    </div>

                    {/* Comments List */}
                    <div className="mt-6 space-y-4">
                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Comentarios Recientes</h4>
                        {comments.length === 0 ? (
                            <p className="text-sm text-[var(--text-secondary)] text-center py-4">Sé el primero en comentar.</p>
                        ) : (
                            comments.map((comment, i) => (
                                <div key={comment.id || i} className="flex gap-3">
                                    <Avatar
                                        src={comment.avatar_url}
                                        name={comment.username}
                                        size="sm"
                                    />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-sm font-semibold text-[var(--text-primary)]">{comment.username}</span>
                                            <span className="text-[10px] text-[var(--text-secondary)]">
                                                {timeAgo(comment.created_at)}
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
                    <Avatar
                        src={currentUser?.avatar_url}
                        name={currentUser?.username || 'Me'}
                        size="sm"
                    />
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
            <GiftSelector
                isOpen={showGiftSelector}
                onClose={() => setShowGiftSelector(false)}
                modelId={post.model_id}
                postId={id}
                onGiftSent={(gift) => {
                    setGiftsCount(prev => prev + 1);
                }}
            />
        </div>
    );
}
