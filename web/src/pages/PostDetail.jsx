import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Volume2, VolumeX, Send, X, Maximize2, Trash2, Flag, CircleDollarSign, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/ui/Avatar';
import { timeAgo, isOnline as checkOnline } from '../utils/date';
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
    const [showReportModal, setShowReportModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

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
        fetchPostData();
    }, [id]);

    const requireAuth = (callback) => {
        if (!currentUser) {
            showToast("¡Únete a nuestra comunidad para interactuar!", "info");
            setTimeout(() => navigate('/onboarding'), 2000);
            return;
        }
        if (callback) callback();
    };

    const handleLike = async () => {
        requireAuth(async () => {
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
        });
    };

    const handleFastTip = async (e) => {
        requireAuth(async () => {
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
        });
    };

    const handleComment = async () => {
        requireAuth(async () => {
            if (!newComment.trim() || submitting) return;
            setSubmitting(true);
            try {
                const res = await api.post('/interactions/interact', {
                    target_id: id,
                    target_type: 'post',
                    action: 'comment',
                    content: newComment
                });
                // Opimistic update
                setComments([{
                    ...res.data, // Assuming res.data contains the new comment object
                    username: currentUser?.username || 'Yo',
                    avatar_url: currentUser?.avatar_url,
                    created_at: new Date().toISOString(), // Add created_at for optimistic display
                    user_id: currentUser?.id // Add user_id for owner check
                }, ...comments]);
                setNewComment("");
                setPost(prev => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 })); // Increment count locally
            } catch (err) {
                console.error("Error posting comment:", err);
                showToast(err.response?.data?.detail || "Error al comentar", "error");
            } finally {
                setSubmitting(false);
            }
        });
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await api.delete(`/interactions/comments/${commentId}`);
            setComments(comments.filter(c => c.id !== commentId));
            setPost(prev => ({ ...prev, comments_count: Math.max(0, (prev.comments_count || 0) - 1) })); // Decrement count locally
            showToast("Comentario eliminado", "success");
        } catch (err) {
            console.error("Error deleting comment:", err);
            showToast("Error al eliminar comentario", "error");
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/content/posts/${id}`);
            navigate(-1);
            showToast("Publicación eliminada correctamente", "success");
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
    const isOwner = currentUser?.id === post.model_id || currentUser?.user_id === post.model_id;

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
                    {post.media_type === 'video' ? (
                        <video
                            src={post.media_url}
                            className="w-full h-full object-contain pointer-events-auto"
                            controls
                            autoPlay
                            playsInline
                            loop
                        />
                    ) : (
                        <img
                            src={post.media_url}
                            className="w-full h-full object-contain pointer-events-none select-none"
                            alt="Full Content"
                        />
                    )}
                </div>
            )}

            {/* Header de Navegación */}
            <div className="flex-none flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent z-10 relative">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-black/60 transition-colors shadow-lg"
                >
                    <ArrowLeft size={24} />
                </button>
                <span className="text-white font-bold text-xs tracking-[0.2em] uppercase drop-shadow-md">Publicación</span>

                {/* Actions: Delete (Standalone) or Menu */}
                <div className="flex items-center gap-2">
                    {/* 3-dot menu trigger */}
                    <div className="relative group">
                        <button className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors border border-white/20 shadow-lg">
                            <MoreVertical size={24} />
                        </button>

                        {/* Dropdown Menu - Fixed positioning and visibility */}
                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                            {isOwner || currentUser?.role === 'admin' ? (
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className="w-full text-left px-4 py-3 text-red-500 hover:bg-white/5 flex items-center gap-2 text-sm font-bold"
                                >
                                    <Trash2 size={16} />
                                    Eliminar Post
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="w-full text-left px-4 py-3 text-white/70 hover:bg-white/5 hover:text-white text-sm font-bold flex items-center gap-2"
                                >
                                    <Flag size={16} />
                                    Reportar
                                </button>
                            )}
                        </div>
                    </div>
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
                            onClick={() => navigate(`/${user.username}`)}
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
                                whileTap={currentUser?.role !== 'model' && currentUser?.role !== 'admin' ? { scale: 1.4 } : {}}
                                onClick={handleFastTip}
                                className="flex items-center gap-2 group/tip"
                                disabled={currentUser?.role === 'model'}
                            >
                                <div className="relative">
                                    <CircleDollarSign size={22} className={clsx(
                                        "text-yellow-400",
                                        (currentUser?.role !== 'model' && currentUser?.role !== 'admin') && "group-hover/tip:drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                                    )} />
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

                        <button
                            onClick={() => requireAuth(() => { if (currentUser?.role !== 'model') setShowGiftSelector(true); })}
                            className={clsx(
                                "flex items-center gap-2 text-[var(--text-primary)] transition-all group",
                                currentUser?.role !== 'model' && "active:scale-110 hover:text-purple-400"
                            )}
                            title={currentUser?.role === 'model' ? "Regalos recibidos" : "Enviar Regalo"}
                        >
                            <Gift size={22} className={clsx(
                                "text-purple-400",
                                (currentUser?.role !== 'model' && currentUser?.role !== 'admin') && "group-hover:drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]"
                            )} />
                            <span className="text-sm font-bold opacity-90">{giftsCount}</span>
                        </button>
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
                                <div key={comment.id || i} className="flex gap-3 group/comment">
                                    <Avatar
                                        src={comment.avatar_url}
                                        name={comment.username}
                                        size="sm"
                                    />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-sm font-semibold text-[var(--text-primary)]">{comment.username}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-[var(--text-secondary)]">
                                                    {timeAgo(comment.created_at)}
                                                </span>
                                                {(isOwner || currentUser?.role === 'admin' || currentUser?.user_id === comment.actor_id) && (
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="opacity-0 group-hover/comment:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                                                        title="Eliminar comentario"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
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

            {/* Custom Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                                    <Trash2 size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">¿Eliminar publicación?</h3>
                                <p className="text-gray-400 text-sm mb-6">Esta acción es permanente y no se podrá deshacer.</p>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleDelete}
                                        className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20"
                                    >
                                        Sí, Eliminar
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="w-full py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors border border-white/10"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Report Modal */}
            <AnimatePresence>
                {showReportModal && (
                    <ReportModal
                        postId={id}
                        onClose={() => setShowReportModal(false)}
                        onSuccess={() => {
                            setShowReportModal(false);
                            showToast("Reporte enviado correctamente", "success");
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Internal Report Modal Component for PostDetail
function ReportModal({ postId, onClose, onSuccess }) {
    const [reason, setReason] = useState("");
    const [desc, setDesc] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const reasons = [
        "Contenido Inapropiado",
        "Spam / Estafa",
        "Suplantación de Identidad",
        "Lenguaje de Odio",
        "Otro"
    ];

    const submitReport = async () => {
        if (!reason) return;
        setSubmitting(true);
        try {
            await api.post('/content/report', {
                post_id: postId,
                reason,
                description: desc
            });
            onSuccess();
        } catch (err) {
            console.error("Report failed", err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <AlertTriangle size={18} className="text-yellow-500" /> Reportar Publicación
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Motivo</label>
                        <div className="grid grid-cols-1 gap-2">
                            {reasons.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${reason === r ? 'bg-pink-600/20 border-pink-500 text-white font-bold' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                    {reason === 'Otro' && (
                        <textarea
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
                            placeholder="Describe el problema..."
                            rows={3}
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                        />
                    )}
                    <button
                        onClick={submitReport}
                        disabled={submitting || !reason}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-xl"
                    >
                        {submitting ? "Enviando..." : "Enviar Reporte"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
