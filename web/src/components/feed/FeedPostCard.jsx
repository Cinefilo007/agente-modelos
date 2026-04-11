import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Play, Volume2, VolumeX, AlertTriangle, Send, X, Trash2, Flag, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import EliteAvatar from '../common/EliteAvatar';
import GiftSelector from '../posts/GiftSelector';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import clsx from 'clsx';
import { timeAgo } from '../../utils/date';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { CircleDollarSign, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import { isOnline as checkOnline } from '../../utils/date';

export function FeedPostCard({ post, isAdmin, onDelete }) {
    const { user, updateUser } = useAuth();
    const { showToast } = useToast();
    const { themeColor } = useTheme();
    const navigate = useNavigate();

    const requireAuth = (callback) => {
        if (!user) {
            showToast("¡Únete a nuestra comunidad para interactuar!", "info");
            setTimeout(() => navigate('/onboarding'), 2000);
            return;
        }
        if (callback) callback();
    };

    // State
    const [isLiked, setIsLiked] = useState(post.is_liked || false);
    const [likeCount, setLikeCount] = useState(Number(post.likes_count) || 0);
    const [commentCount, setCommentCount] = useState(Number(post.comments_count) || 0);
    const [isMuted, setIsMuted] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [showGiftSelector, setShowGiftSelector] = useState(false);
    const [isTipping, setIsTipping] = useState(false);
    const [tipsCount, setTipsCount] = useState(Number(post.tips_count) || 0);
    const [animations, setAnimations] = useState([]); // Track flying coins
    const [isExpanded, setIsExpanded] = useState(false);
    const isOnline = post.user?.is_online || post.is_online || false;

    // Refs
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const menuRef = useRef(null);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Autoplay Logic
    useEffect(() => {
        if (post.media_type !== 'video' || !videoRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        videoRef.current.muted = isMuted;
                        videoRef.current.play().catch(e => console.log("Autoplay prevented:", e.message));
                    } else {
                        if (videoRef.current) videoRef.current.pause();
                    }
                });
            },
            { threshold: 0.6 }
        );

        if (containerRef.current) observer.observe(containerRef.current);
        return () => {
            if (containerRef.current) observer.unobserve(containerRef.current);
        };
    }, [post.media_type, isMuted]);

    const toggleMute = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    // Interactions
    const handleLike = async () => {
        requireAuth(async () => {
            if (isAdmin) return;

            // Optimistic Update
            const newStatus = !isLiked;
            setIsLiked(newStatus);
            setLikeCount(prev => newStatus ? prev + 1 : prev - 1);

            try {
                await api.post('/interactions/interact', {
                    target_id: post.id,
                    target_type: 'post',
                    action: 'like'
                });
            } catch (error) {
                console.error("Like failed", error);
                // Revert
                setIsLiked(!newStatus);
                setLikeCount(prev => !newStatus ? prev + 1 : prev - 1);
            }
        });
    };

    const handleComment = async () => {
        requireAuth(async () => {
            if (!commentText.trim()) return;

            try {
                await api.post('/interactions/interact', {
                    target_id: post.id,
                    target_type: 'post',
                    action: 'comment',
                    content: commentText
                });
                setCommentCount(prev => prev + 1);
                setCommentText("");
                setShowCommentInput(false); // Close or keep open?
            } catch (error) {
                console.error("Comment failed", error);
            }
        });
    };

    const handleFastTip = async (e) => {
        requireAuth(async () => {
            if (isAdmin || isTipping || user?.role === 'model') return;

            // Prevent event bubbling if needed
            e?.preventDefault();
            e?.stopPropagation();

            // 1. Optimistic Update
            setTipsCount(prev => prev + 1);

            // 2. Trigger Animation
            const id = Date.now();
            setAnimations(prev => [...prev, id]);
            setTimeout(() => {
                setAnimations(prev => prev.filter(a => a !== id));
            }, 1000);

            try {
                const res = await api.post('/wallet/tip', {
                    model_id: post.user.id,
                    post_id: post.id
                });
                // Update local user balance in context
                if (res.data.new_balance !== undefined) {
                    const updatedUser = { ...user, balance: res.data.new_balance };
                    updateUser?.(updatedUser);
                }
            } catch (error) {
                console.error("Tip failed", error);
                // Revert on failure
                setTipsCount(prev => prev - 1);
                showToast(error.response?.data?.detail || "Error al enviar moneda. Revisa tu saldo.", "error");
            }
        });
    };

    // Report Logic
    const ReportModal = () => {
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
            if (!reason) return alert("Selecciona un motivo");
            setSubmitting(true);
            try {
                await api.post('/content/report', {
                    post_id: post.id,
                    reason,
                    description: desc
                });
                setShowReportModal(false);
                setShowMenu(false);
                alert("Reporte enviado. Gracias por ayudar a mantener segura la comunidad.");
            } catch (err) {
                alert("Error al enviar reporte");
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <AlertTriangle size={18} className="text-yellow-500" /> Reportar Publicación
                        </h3>
                        <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            {reasons.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${reason === r ? 'bg-pink-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        {reason === 'Otro' && (
                            <textarea
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
                                placeholder="Describe el problema..."
                                rows={3}
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                            />
                        )}
                        <button
                            onClick={submitReport}
                            disabled={submitting}
                            className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            {submitting ? "Enviando..." : "Enviar Reporte"}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div ref={containerRef} className="mb-6 bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 shadow-2xl mx-1 relative group">
                <div className="flex items-center justify-between p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent absolute top-0 w-full z-20">
                    <div className="flex items-center gap-3">
                        <Link to={`/${post.user.username || post.user.id}`}>
                            <Avatar
                                src={post.user.avatar_url || post.user.avatar}
                                name={post.user.artistic_name || post.user.full_name || post.user.username}
                                size="md"
                                isOnline={isOnline}
                            />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-white leading-none shadow-black drop-shadow-md">
                                    {post.user.artistic_name || post.user.full_name || post.user.name}
                                </h3>
                                {post.user.is_verified === true && (
                                    <svg viewBox="0 0 24 24" className="w-[14px] h-[14px]" aria-label="Verificado">
                                        <path fill="#1D9BF0" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.923-3.998-.356 0-.698.05-1.024.136C14.77 2.15 13.486 1.5 12 1.5s-2.77.65-3.643 2.138c-.326-.086-.668-.136-1.024-.136-2.213 0-3.923 1.788-3.923 3.998 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.923 3.998.356 0 .698-.05 1.024-.136C9.23 21.85 10.514 22.5 12 22.5s2.77-.65 3.643-2.138c.326.086.668.136 1.024.136 2.213 0 3.923-1.788 3.923-3.998 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"></path>
                                        <path fill="#FFF" d="M10.236 15.655L6.442 11.85c-.407-.406-1.066-.406-1.472 0-.407.406-.407 1.065 0 1.47l4.53 4.542c.404.406 1.063.406 1.47 0l9.31-9.33c.406-.407.406-1.066 0-1.472-.407-.407-1.065-.407-1.472 0l-8.57 8.595z"></path>
                                    </svg>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-300 font-medium bg-black/50 px-1.5 rounded text-shadow">{timeAgo(post.created_at || post.timestamp)}</span>
                        </div>
                    </div>

                    {/* Menu Trigger */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="text-white bg-black/20 p-2 rounded-full hover:bg-black/60 transition-colors backdrop-blur-sm"
                        >
                            <MoreHorizontal size={20} />
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in origin-top-right">
                                {(isAdmin || user?.id === post.user.id) ? (
                                    <button
                                        onClick={onDelete}
                                        className="w-full text-left px-4 py-3 text-red-500 hover:bg-white/5 flex items-center gap-2 text-sm font-bold"
                                    >
                                        <Trash2 size={16} /> Eliminar
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { setShowReportModal(true); setShowMenu(false); }}
                                        className="w-full text-left px-4 py-3 text-white/70 hover:bg-white/5 hover:text-white flex items-center gap-2 text-sm font-bold"
                                    >
                                        <Flag size={16} /> Reportar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Media Link to Detail */}
                <Link to={`/post/${post.id}`} className="block relative aspect-[4/5] bg-black">
                    {post.media_type === 'video' ? (
                        <>
                            <video
                                ref={videoRef}
                                src={post.media_url}
                                className="w-full h-full object-cover"
                                loop
                                muted={isMuted}
                                playsInline
                                poster={post.thumbnail_url}
                                controlsList="nodownload"
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            <button
                                onClick={toggleMute}
                                className="absolute bottom-4 right-4 p-2 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors z-10"
                            >
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                        </>
                    ) : (
                        <img
                            src={post.media_url || post.image}
                            alt="Post Content"
                            className="w-full h-full object-cover"
                        />
                    )}
                </Link>

                {/* Bottom Actions Area - Liquid glass style */}
                <div className="px-4 pt-2 pb-3 bg-white/5 backdrop-blur-xl border-t border-white/5">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="relative">
                            <motion.button
                                whileTap={user?.role !== 'model' && user?.role !== 'admin' ? { scale: 1.5 } : {}}
                                onClick={handleFastTip}
                                className={clsx(
                                    "flex items-center gap-1.5 transition-all text-white group/tip",
                                    (user?.role !== 'model' && user?.role !== 'admin') && "hover:text-yellow-400"
                                )}
                                title={user?.role === 'model' ? "Monedas recibidas" : "Enviar Moneda ($0.05)"}
                                disabled={user?.role === 'model'}
                            >
                                <div className="relative">
                                    <CircleDollarSign size={24} className={clsx(
                                        user?.role !== 'model' && "group-hover/tip:drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]",
                                        "text-yellow-400"
                                    )} />

                                    {/* Flying Coins Container */}
                                    <AnimatePresence>
                                        {animations.map(id => (
                                            <motion.div
                                                key={id}
                                                initial={{ y: 0, x: 0, opacity: 1, scale: 1 }}
                                                animate={{ y: -60, x: (Math.random() - 0.5) * 40, opacity: 0, scale: 1.5 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-visible"
                                            >
                                                <span className="text-xl">🪙</span>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                                <motion.span
                                    key={tipsCount}
                                    initial={{ scale: 1 }}
                                    animate={animations.length > 0 ? { scale: [1, 1.4, 1] } : {}}
                                    className="text-sm font-bold"
                                >
                                    {tipsCount}
                                </motion.span>
                            </motion.button>
                        </div>

                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-1.5 transition-all active:scale-90 outline-none ${isLiked ? 'text-red-500' : 'text-white'}`}
                        >
                            <Heart size={24} className={isLiked ? 'fill-red-500 [filter:drop-shadow(0_0_8px_rgba(239,68,68,0.4))]' : ''} />
                            <span className="text-sm font-bold">{likeCount}</span>
                        </button>

                        <button
                            onClick={() => requireAuth(() => setShowCommentInput(true))}
                            className="flex items-center gap-1.5 text-white transition-all active:scale-90"
                        >
                            <MessageCircle size={24} />
                            <span className="text-sm font-bold">{commentCount}</span>
                        </button>

                        {/* <button
                            onClick={() => requireAuth(() => { if (user?.role !== 'model') setShowGiftSelector(true); })}
                            className={clsx(
                                "flex items-center gap-1.5 text-white transition-all group",
                                user?.role !== 'model' && "active:scale-110 hover:text-purple-400"
                            )}
                            title={user?.role === 'model' ? "Regalos recibidos" : "Enviar Regalo"}
                        >
                            <Gift size={24} className={clsx(
                                "text-purple-400",
                                user?.role !== 'model' && "group-hover:drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]"
                            )} />
                            <span className="text-sm font-bold">{post.gifts_count || 0}</span>
                        </button> */}
                    </div>

                    <div className="relative mb-1">
                        <p className={clsx(
                            "text-sm text-gray-200 leading-relaxed",
                            !isExpanded && "line-clamp-2"
                        )}>
                            <span className="font-bold text-white mr-2">{post.user.artistic_name || post.user.name}</span>
                            {post.description || post.caption}
                        </p>
                        {(post.description?.length > 80 || post.caption?.length > 80) && (
                            <div className="flex justify-center mt-1">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="text-white/40 hover:text-white/80 transition-colors p-1"
                                >
                                    {isExpanded ? <ChevronUp size={16} strokeWidth={1.5} /> : <ChevronDown size={16} strokeWidth={1.5} />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Links Externos Elegantes */}
                    {(() => {
                        const links = typeof post.external_links === 'string' ? JSON.parse(post.external_links) : (post.external_links || []);
                        if (!links || links.length === 0) return null;

                        return (
                            <div className="flex flex-wrap gap-2 mb-1">
                                {links.map((lnk, idx) => (
                                    <a
                                        key={idx}
                                        href={lnk.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-[11px] font-bold text-white transition-all active:scale-95 group/link"
                                    >
                                        <ExternalLink size={12} className="text-blue-400 group-hover/link:text-blue-300" />
                                        {lnk.label}
                                    </a>
                                ))}
                            </div>
                        );
                    })()}


                </div>
            </div >

            {/* Modals */}
            {showReportModal && <ReportModal />}
            <GiftSelector
                isOpen={showGiftSelector}
                onClose={() => setShowGiftSelector(false)}
                modelId={post.user.id}
                postId={post.id}
                onGiftSent={(gift) => {
                    // Refresh balance if needed
                }}
            />
        </>
    );
}
