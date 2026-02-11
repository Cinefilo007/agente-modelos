import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Play, Volume2, VolumeX, AlertTriangle, Send, X } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import { timeAgo } from '../../utils/date';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export function FeedPostCard({ post, isAdmin, onDelete }) {
    const { user } = useAuth();
    const { themeColor } = useTheme();

    // State
    const [isLiked, setIsLiked] = useState(post.is_liked || false);
    const [likeCount, setLikeCount] = useState(Number(post.likes_count) || 0);
    const [commentCount, setCommentCount] = useState(Number(post.comments_count) || 0);
    const [isMuted, setIsMuted] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [showCommentInput, setShowCommentInput] = useState(false);

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
    };

    const handleComment = async () => {
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
                            <label className="text-xs font-bold text-gray-500 uppercase">Motivo</label>
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
            <div ref={containerRef} className="mb-6 glass-panel rounded-xl overflow-hidden border border-white/5 shadow-2xl mx-1 relative group">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md absolute top-0 w-full z-20 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Link to={`/profile/${post.user.id}`}>
                            <Avatar
                                src={post.user.avatar_url || post.user.avatar}
                                size="md"
                                isOnline={post.is_online}
                            />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-white leading-none shadow-black drop-shadow-md">
                                    {post.user.artistic_name || post.user.full_name || post.user.name}
                                </h3>
                                {post.user.is_verified && <span className="text-blue-400 text-[10px]">Verify</span>}
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
                                        <X size={16} /> Eliminar Publicación
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { setShowReportModal(true); setShowMenu(false); }}
                                        className="w-full text-left px-4 py-3 text-yellow-500 hover:bg-white/5 flex items-center gap-2 text-sm font-bold"
                                    >
                                        <AlertTriangle size={16} /> Reportar
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

                {/* Bottom Actions Area */}
                <div className="p-4 bg-black/40 backdrop-blur-md">
                    <div className="flex items-center gap-4 mb-3">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-1.5 transition-all active:scale-90 ${isLiked ? 'text-pink-500' : 'text-white'}`}
                        >
                            <Heart size={24} className={isLiked ? 'fill-pink-500' : ''} />
                            <span className="text-sm font-bold">{likeCount}</span>
                        </button>

                        <button
                            onClick={() => setShowCommentInput(true)}
                            className="flex items-center gap-1.5 text-white transition-all active:scale-90"
                        >
                            <MessageCircle size={24} />
                            <span className="text-sm font-bold">{commentCount}</span>
                        </button>
                    </div>

                    <p className="text-sm text-gray-200 mb-3 line-clamp-3">
                        <span className="font-bold text-white mr-2">{post.user.artistic_name || post.user.name}</span>
                        {post.description}
                    </p>

                    {/* Quick Comment Input - Simplified */}
                    {!isAdmin && (
                        <div className="flex gap-2 items-center pt-3 border-t border-white/5">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Añade un comentario..."
                                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 px-4 text-sm text-white focus:outline-none focus:border-pink-500/50 placeholder-gray-500 transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                                />
                                {commentText.trim() && (
                                    <button
                                        onClick={handleComment}
                                        className="absolute right-1 top-1 p-1.5 bg-pink-600 rounded-full text-white hover:bg-pink-500 transition-colors"
                                    >
                                        <Send size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showReportModal && <ReportModal />}
        </>
    );
}
