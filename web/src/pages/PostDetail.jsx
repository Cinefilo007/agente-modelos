import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Volume2, VolumeX, Send, X, Maximize2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from '../components/ui/Avatar';
import { POSTS } from '../data/dummy';

export default function PostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { themeColor } = useTheme();
    const [post, setPost] = useState(null);
    const [isLiked, setIsLiked] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const foundPost = POSTS.find(p => p.id === parseInt(id)) || POSTS[0];
        setPost(foundPost);
    }, [id]);

    if (!post) return <div className="text-white text-center mt-20">Cargando...</div>;

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
                <div className="w-full aspect-[4/5] bg-black/5 relative group mb-4">
                    <img
                        src={post.image}
                        onClick={() => setIsFullscreen(true)}
                        className="w-full h-full object-contain cursor-pointer"
                        alt="Post Content"
                    />
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-lg">
                            <Maximize2 size={16} className="text-white/80" />
                        </div>
                    </div>
                </div>

                {/* Post Info */}
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar src={post.user.avatar} size="md" isOnline={post.user.isOnline} />
                        <div className="flex-1">
                            <h3 className="text-[var(--text-primary)] font-bold text-base">{post.user.name}</h3>
                            <p className="text-[var(--text-secondary)] text-xs">{post.timestamp}</p>
                        </div>
                        <button className="px-4 py-1 rounded-full bg-[var(--card-bg)] border border-[var(--glass-border)] text-xs font-semibold text-[var(--text-primary)] hover:opacity-80 transition-colors">
                            Seguir
                        </button>
                    </div>

                    <p className="text-[var(--text-primary)] opacity-90 text-sm leading-relaxed mb-4 font-light">
                        {post.description}
                    </p>

                    {/* Stats Bar */}
                    <div className="flex items-center gap-6 py-3 border-y border-[var(--glass-border)]">
                        <button onClick={() => setIsLiked(!isLiked)} className="flex items-center gap-2 group">
                            <Heart size={22} className={`transition-all ${isLiked ? 'fill-pink-500 text-pink-500 scale-110' : 'text-[var(--text-primary)] group-active:scale-95'}`} />
                            <span className="text-sm font-medium text-[var(--text-primary)] opacity-90">{post.likes}</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <MessageCircle size={22} className="text-[var(--text-primary)]" />
                            <span className="text-sm font-medium text-[var(--text-primary)] opacity-90">15</span>
                        </div>
                        <div className="flex-1"></div>
                        <Share2 size={22} className="text-[var(--text-primary)] opacity-80" />
                    </div>

                    {/* Comments List */}
                    <div className="mt-6 space-y-4">
                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Comentarios Recientes</h4>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--card-bg)] flex-shrink-0 overflow-hidden">
                                    <img src={`https://i.pravatar.cc/150?u=${i + 50}`} alt="U" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-sm font-semibold text-[var(--text-primary)]">fan_user_{i}</span>
                                        <span className="text-[10px] text-[var(--text-secondary)]">2h</span>
                                    </div>
                                    <p className="text-sm text-[var(--text-primary)] opacity-70 font-light">
                                        Increíble contenido! 😍 Me encanta la estética.
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* FIXED INPUT AREA */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-[var(--card-bg)]/80 backdrop-blur-xl border-t border-[var(--glass-border)] z-20">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-[1px]">
                        <div className="w-full h-full rounded-full bg-[var(--card-bg)] overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" className="w-full h-full object-cover opacity-80" />
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Agrega un comentario..."
                            className="w-full bg-[var(--glass-border)] border border-[var(--glass-border)] rounded-full h-10 pl-4 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--text-secondary)] transition-colors"
                            style={{ caretColor: themeColor }}
                        />
                        <button
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-[var(--glass-border)] text-[var(--text-primary)] transition-colors"
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
