import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Star, Instagram, Twitter, Globe, Lock, Heart, Mail, LayoutDashboard, Share2, TrendingUp, DollarSign, Loader, Music2, Twitch, Linkedin, Github, Link as LinkIcon, Facebook, CheckCircle2, Gamepad2, MessageCircle, UserCheck, MoreVertical } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { isOnline as checkOnline } from '../../utils/date';

export function ProfileHeader({ user, isOwnProfile, customActions }) {
    const { themeColor } = useTheme();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const [isFollowing, setIsFollowing] = useState(false);
    const [loadingFollow, setLoadingFollow] = useState(false);
    const [showMessageAlert, setShowMessageAlert] = useState(false);

    // Fetch follow status if not own profile
    useEffect(() => {
        if (!isOwnProfile && user?.id) {
            const checkFollow = async () => {
                try {
                    const { data } = await api.get(`/interactions/followers/status/${user.id}`);
                    setIsFollowing(data.is_following);
                } catch (err) {
                    console.error("Error checking follow status:", err);
                }
            };
            checkFollow();
        }
    }, [isOwnProfile, user?.id]);

    const handleSubscribe = async () => {
        if (!user?.id) return;
        setLoadingFollow(true);
        try {
            if (isFollowing) {
                await api.delete(`/interactions/followers/${user.id}`);
                setIsFollowing(false);
            } else {
                await api.post('/interactions/followers', { model_id: user.id });
                setIsFollowing(true);
            }
        } catch (err) {
            console.error("Error toggling follow:", err);
        } finally {
            setLoadingFollow(false);
        }
    };

    const handleMessageClick = () => {
        if (currentUser?.role === 'client') {
            setShowMessageAlert(true);
        } else {
            // Abrir Telegram directamente si no es cliente
            const tgUsername = user.username ? user.username.replace('@', '') : user.id;
            window.open(`https://t.me/${tgUsername}`, '_blank');
        }
    };

    // Dynamic Social Links
    const socialLinks = [];

    // Icon Mapping (Should match SocialLinkEditor)
    const getSocialIcon = (network, size = 18) => {
        switch (network) {
            case 'instagram': return <Instagram size={size} />;
            case 'twitter': return <Twitter size={size} />;
            case 'facebook': return <Facebook size={size} />;
            case 'tiktok': return <Music2 size={size} />;
            case 'twitch': return <Twitch size={size} />;
            case 'linkedin': return <Linkedin size={size} />;
            case 'github': return <Github size={size} />;
            case 'onlyfans': return <Star size={size} />;
            case 'website': return <Globe size={size} />;
            default: return <LinkIcon size={size} />;
        }
    };

    const getSocialColor = (network) => {
        switch (network) {
            case 'instagram': return '#E1306C';
            case 'twitter': return '#1DA1F2';
            case 'facebook': return '#1877F2';
            case 'youtube': return '#FF0000';
            case 'tiktok': return '#000000';
            case 'twitch': return '#9146FF';
            case 'linkedin': return '#0A66C2';
            case 'github': return '#333333';
            case 'onlyfans': return '#00AFF0';
            default: return '#10B981'; // Website green
        }
    };

    if (user && user.social_links) {
        let links = user.social_links;

        // Handle legacy object format if strictly needed, but we prefer array now
        if (!Array.isArray(links) && typeof links === 'object') {
            // Convert old object to array for display
            links = Object.keys(links).map(key => ({ network: key, url: links[key] }));
        }

        if (Array.isArray(links)) {
            links.forEach(link => {
                if (link.url) {
                    socialLinks.push({
                        id: link.network + link.url,
                        icon: getSocialIcon(link.network),
                        label: link.network,
                        url: link.url,
                        color: getSocialColor(link.network)
                    });
                }
            });
        }
    }

    if (!user) return null; // Safety check

    return (
        <div className="relative font-display text-slate-900 dark:text-slate-100 pb-4" style={{ '--theme-glow': themeColor || '#b829e3' }}>
            {/* Cover Image Container */}
            <div className="relative w-full h-64 md:h-72">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${user.cover_url || user.cover || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab'}')` }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/80 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent"></div>
            </div>

            {/* Content Container */}
            <div className="px-5 -mt-20 relative z-10 max-w-5xl mx-auto">

                {/* Top Row: Avatar + Stats */}
                <div className="flex items-end justify-between mb-4 w-full">
                    {/* Profile Photo */}
                    <div className="relative group flex-shrink-0 z-20">
                        {/* Glowing aura behind avatar */}
                        <div className="absolute inset-0 rounded-full blur-[10px] opacity-70 transform group-hover:scale-105 transition-transform duration-500 bg-[var(--theme-glow)]"></div>
                        <Avatar
                            src={user.avatar_url || user.avatar}
                            name={user.artistic_name || user.full_name || user.name}
                            alt={user.full_name || user.name}
                            size="xl"
                            isOnline={checkOnline(user.last_seen)}
                            className="w-24 h-24 md:w-32 md:h-32 relative z-10 shadow-2xl"
                            style={{ border: `3px solid var(--theme-glow)`, backgroundColor: '#111' }}
                        />
                    </div>

                    {/* Stats Card */}
                    <div className="flex-grow ml-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 mb-1 grid grid-cols-3 gap-1">
                        <div className="text-center">
                            <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-tighter">Followers</p>
                            <p className="text-sm font-bold text-white leading-tight mt-0.5">
                                {user.followers_count >= 1000 ? (user.followers_count / 1000).toFixed(1) + 'M' : (user.followers_count || '1.2M')}
                            </p>
                        </div>
                        <div className="text-center border-x border-white/10">
                            <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-tighter">Likes</p>
                            <p className="text-sm font-bold text-accent-blue leading-tight text-cyan-400 mt-0.5">
                                {user.total_likes >= 1000 ? '+' + (user.total_likes / 1000).toFixed(0) + 'k' : (user.total_likes ? '+' + user.total_likes : '+12%')}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-tighter">Rating</p>
                            <p className="text-sm font-bold text-accent-magenta leading-tight mt-0.5" style={{ color: 'var(--theme-glow)' }}>
                                {(user.reputation_score !== undefined && user.reputation_score !== null)
                                    ? parseFloat(user.reputation_score).toFixed(1)
                                    : '4.9'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Name, Title & Follow Button Row */}
                <div className="mt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                                {user.artistic_name || user.full_name || user.name || 'Elena Vance'}
                                {user.is_verified && (
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-500 fill-current ml-1" aria-label="Verificado">
                                        <path d="M11.53.513c.278-.291.737-.291 1.015 0l2.213 2.316c.159.167.38.257.61.242l3.193-.207c.4-.026.745.275.772.677l.215 3.203c.015.231.11.45.274.611l2.365 2.302c.296.288.296.756 0 1.044l-2.365 2.302c-.164.161-.259.38-.274.611l-.215 3.203c-.027.402-.372.703-.772.677l-3.193-.207c-.23-.015-.45.075-.61.242L12.545 20.44a.715.715 0 0 1-1.015 0l-2.213-2.316a.856.856 0 0 0-.61-.242l-3.193.207a.717.717 0 0 1-.772-.677l-.215-3.203a.857.857 0 0 0-.274-.611L1.888 11.29a.738.738 0 0 1 0-1.044l2.365-2.302c.164-.161.259-.38.274-.611l.215-3.203a.717.717 0 0 1 .772-.677l3.193.207c.23.015.45-.075.61-.242L11.53.513z"></path>
                                        <path fill="#fff" d="m10.119 14.881-2.905-2.906a.75.75 0 0 0-1.06 1.061l3.435 3.435a.75.75 0 0 0 1.06 0l7.636-7.636a.75.75 0 1 0-1.06-1.061z"></path>
                                    </svg>
                                )}
                            </h1>
                            <div className="flex items-center gap-3 mt-0.5">
                                <p className="text-slate-300 text-[13px] flex items-center gap-1">
                                    <Globe size={14} className="text-[var(--theme-glow)]" /> {user.country || 'Ubicación Desconocida'}
                                </p>
                            </div>
                        </div>

                        {/* Follow Action */}
                        {!isOwnProfile && (
                            <div className="mt-2 md:mt-0">
                                <button
                                    onClick={handleSubscribe}
                                    disabled={loadingFollow}
                                    className="transition-all text-white h-9 px-5 rounded-full text-xs font-bold shadow-lg flex items-center justify-center min-w-[100px]"
                                    style={{
                                        backgroundColor: isFollowing ? 'transparent' : 'var(--theme-glow)',
                                        border: isFollowing ? '1px solid var(--theme-glow)' : 'none',
                                        color: isFollowing ? 'var(--theme-glow)' : '#fff',
                                        boxShadow: isFollowing ? 'none' : '0 10px 15px -3px rgba(184, 41, 227, 0.2)'
                                    }}
                                >
                                    {loadingFollow ? <Loader size={14} className="animate-spin" /> : (
                                        isFollowing ? <><UserCheck size={16} className="mr-1.5" /> SIGUIENDO</> : "FOLLOW"
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Bio Section */}
                    <p className="mt-3 text-slate-400 leading-snug text-sm max-w-[90%]">
                        {user.bio_short || user.bio || 'Redefining the digital aesthetic. High-fashion projects and exclusive digital content. 📍 Based in New York / Paris.'}
                    </p>
                </div>

                {/* Social Icons Row */}
                <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar py-1">
                    {socialLinks.length > 0 ? socialLinks.map((link) => (
                        <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0"
                        >
                            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-white/20 transition-colors">
                                {React.cloneElement(link.icon, { size: 18, color: link.color })}
                            </div>
                        </a>
                    )) : (
                        // Mock icons for design alignment if no data
                        <>
                            {['instagram', 'twitter', 'onlyfans', 'mail', 'website'].map((mock, i) => (
                                <div key={i} className="flex-shrink-0">
                                    <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center">
                                        {getSocialIcon(mock, 18)}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Services/Niches Badges */}
                {user.services && user.services.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5 mb-2">
                        {user.services.map((service, index) => {
                            const dotColors = ['bg-accent-magenta', 'bg-accent-blue', 'bg-[var(--theme-glow)]', 'bg-white'];
                            return (
                                <div
                                    key={index}
                                    className="bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5"
                                >
                                    <div className={`w-1 h-1 rounded-full ${dotColors[index % dotColors.length]}`} style={index === 2 ? { backgroundColor: 'var(--theme-glow)' } : {}}></div>
                                    <span className="text-[10px] font-bold text-slate-200 tracking-wide uppercase">{service}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Main Action Buttons (Client View - Below Services) */}
                {!isOwnProfile && (
                    <div className="flex gap-3 mt-4 mb-2">
                        <button
                            onClick={handleMessageClick}
                            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center transition-all group shadow-lg"
                        >
                            <MessageCircle size={22} className="text-white mb-1 group-hover:scale-110 transition-transform" />
                            <span className="text-white font-bold text-sm">Privado</span>
                            <span className="text-slate-400 text-[10px]">Acordar servicio</span>
                        </button>

                        {isFollowing && (
                            <Link to={`/casino/${user.username}`} className="flex-1">
                                <button
                                    className="w-full h-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-2xl p-3 flex flex-col items-center justify-center transition-all group shadow-lg shadow-yellow-500/5"
                                >
                                    <Gamepad2 size={24} className="text-yellow-500 mb-0.5 group-hover:scale-110 transition-transform" />
                                    <span className="text-yellow-500 font-bold text-sm">Casino</span>
                                    <span className="text-yellow-500/70 text-[10px]">Jugar y ganar</span>
                                </button>
                            </Link>
                        )}
                    </div>
                )}

                {/* Additional Buttons (Own Profile) */}
                {isOwnProfile && (
                    <div className="flex gap-3 mb-2 mt-4">
                        <Link to="/edit-profile" className="flex-1">
                            <Button className="w-full h-12 bg-white/5 border border-white/10 text-white gap-2 text-sm font-bold rounded-2xl transition-all hover:bg-white/10" variant="ghost">
                                <Edit3 size={16} /> Editar Perfil
                            </Button>
                        </Link>
                        <Link to="/admin" className="flex-1">
                            <Button className="w-full h-12 bg-white/5 border border-white/10 text-white gap-2 text-sm font-bold rounded-2xl transition-all hover:bg-white/10" variant="ghost">
                                <LayoutDashboard size={16} className="text-[var(--theme-glow)]" /> Panel Admin
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {/* Modal de Alerta de Mensaje */}
            {showMessageAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <MessageCircle className="text-red-500" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white text-center mb-2">Aviso Importante</h3>
                        <p className="text-sm text-slate-300 text-center mb-6 leading-relaxed">
                            Solo se aceptan chats para adquirir algún servicio o solicitar información.
                            <br /><br />
                            <strong className="text-red-400">Se le advierte que puede entrar a la lista negra y ser expulsado de la app si molesta a las modelos.</strong>
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white"
                                onClick={() => setShowMessageAlert(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold border-none"
                                onClick={() => {
                                    setShowMessageAlert(false);
                                    const tgUsername = user.username ? user.username.replace('@', '') : user.id;
                                    window.open(`https://t.me/${tgUsername}`, '_blank');
                                }}
                            >
                                Entendido
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
