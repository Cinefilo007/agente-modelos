import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Globe, Lock, Mail, LayoutDashboard, Share2, TrendingUp, DollarSign, Loader, Music2, Linkedin, Github, Link as LinkIcon, CheckCircle2, Gamepad2, MessageCircle, UserCheck, MoreVertical, MapPin, Diamond, LogOut } from 'lucide-react';

import {
    SiInstagram, SiX, SiFacebook, SiYoutube,
    SiTiktok, SiTwitch, SiOnlyfans, SiPatreon
} from '@icons-pack/react-simple-icons';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { isOnline as checkOnline } from '../../utils/date';
import { AuthRequiredModal } from '../auth/AuthRequiredModal';
import { useToast } from '../../context/ToastContext';

export function ProfileHeader({ user, isOwnProfile, customActions }) {
    const { themeColor } = useTheme();
    const { user: currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isFollowing, setIsFollowing] = useState(false);
    const [loadingFollow, setLoadingFollow] = useState(false);
    const [showMessageAlert, setShowMessageAlert] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [logoutConfirm, setLogoutConfirm] = useState(false);

    // Auto-resetear confirmación de logout después de 3s
    useEffect(() => {
        if (logoutConfirm) {
            const timer = setTimeout(() => setLogoutConfirm(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [logoutConfirm]);

    const handleLogout = () => {
        if (!logoutConfirm) {
            setLogoutConfirm(true);
            return;
        }
        logout();
    };

    // Fetch follow status if not own profile
    useEffect(() => {
        if (!isOwnProfile && user?.id && currentUser) {
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
    }, [isOwnProfile, user?.id, currentUser]);

    const handleSubscribe = async () => {
        if (!currentUser) {
            setShowAuthModal(true);
            return;
        }
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
        if (!currentUser) {
            setShowAuthModal(true);
            return;
        }
        if (currentUser?.role === 'client') {
            setShowMessageAlert(true);
        } else {
            // Abrir Telegram directamente si no es cliente
            const tgUsername = user.username ? user.username.replace('@', '') : user.id;
            window.open(`https://t.me/${tgUsername}`, '_blank');
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: `Perfil de ${user.artistic_name || user.full_name}`,
                url: url
            }).catch(() => {
                navigator.clipboard.writeText(url);
                showToast("Enlace copiado al portapapeles", "success");
            });
        } else {
            navigator.clipboard.writeText(url);
            showToast("Enlace copiado al portapapeles", "success");
        }
    };

    // Dynamic Social Links
    const socialLinks = [];

    // Icon Mapping (Should match SocialLinkEditor)
    const getSocialIcon = (network, size = 18) => {
        switch (network) {
            case 'instagram': return <SiInstagram size={size} color="#E1306C" />;
            case 'twitter': return <SiX size={size} className="text-white" />;
            case 'facebook': return <SiFacebook size={size} color="#1877F2" />;
            case 'tiktok': return <SiTiktok size={size} className="text-white" />;
            case 'twitch': return <SiTwitch size={size} color="#9146FF" />;
            case 'linkedin': return <Linkedin size={size} color="#0A66C2" />;
            case 'github': return <Github size={size} className="text-white" />;
            case 'onlyfans': return <SiOnlyfans size={size} color="#00AFF0" />;
            case 'fansly': return <Diamond size={size} color="#00AEF0" />;
            case 'patreon': return <SiPatreon size={size} color="#FF424D" />;
            case 'youtube': return <SiYoutube size={size} color="#FF0000" />;
            case 'website': return <Globe size={size} color="#10B981" />;
            default: return <LinkIcon size={size} />;
        }
    };

    const getSocialColor = (network) => {
        return 'transparent'; // Removemos esto porque react-simple-icons lo pintamos desde adentro. Pero para la caja exterior, retornamos transparente o #111
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
                {/* Desvanecimiento suave unicamente en el borde inferior para mezclarse con el fondo */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a060e] to-transparent"></div>
                {/* Linea extra para asegurar que no quede un borde duro de anti-aliasing */}
                <div className="absolute inset-x-0 -bottom-[1px] h-1 bg-[#0a060e]"></div>

                {/* Share Button over cover */}
                <button
                    onClick={handleShare}
                    className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-black/60 transition-all z-20 group active:scale-95"
                >
                    <Share2 size={20} className="group-hover:scale-110 transition-transform" />
                </button>

                {/* Botón de logout discreto — solo visible para el dueño del perfil */}
                {isOwnProfile && (
                    <button
                        onClick={handleLogout}
                        className={`absolute top-4 left-4 backdrop-blur-md border rounded-full text-white transition-all z-20 group active:scale-95 flex items-center gap-2 ${
                            logoutConfirm 
                                ? 'bg-red-500/80 border-red-400/50 px-4 py-2.5 hover:bg-red-600/80' 
                                : 'bg-black/40 border-white/10 p-2.5 hover:bg-black/60'
                        }`}
                    >
                        <LogOut size={18} className={`transition-transform ${logoutConfirm ? 'text-white' : 'group-hover:scale-110'}`} />
                        {logoutConfirm && (
                            <span className="text-xs font-bold text-white whitespace-nowrap">¿Salir?</span>
                        )}
                    </button>
                )}
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
                    <div className="flex-grow ml-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 mb-1 grid grid-cols-3 gap-1">
                        <div className="text-center">
                            <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-tighter">Followers</p>
                            <p className="text-sm font-bold text-white leading-tight mt-0.5">
                                {user.followers_count > 0
                                    ? (user.followers_count >= 1000 ? (user.followers_count / 1000).toFixed(1) + 'K' : user.followers_count)
                                    : '0'}
                            </p>
                        </div>
                        <div className="text-center border-x border-white/10">
                            <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-tighter">Likes</p>
                            <p className="text-sm font-bold text-accent-blue leading-tight text-cyan-400 mt-0.5">
                                {user.total_likes > 0 ? (user.total_likes >= 1000 ? '+' + (user.total_likes / 1000).toFixed(0) + 'k' : '+' + user.total_likes) : '0'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-tighter">Rating</p>
                            <p className="text-sm font-bold text-accent-magenta leading-tight mt-0.5" style={{ color: 'var(--theme-glow)' }}>
                                {(user.reputation_score !== undefined && user.reputation_score !== null && user.reputation_score > 0)
                                    ? parseFloat(user.reputation_score).toFixed(1)
                                    : '0.0'}
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
                                    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] ml-1" aria-label="Verificado">
                                        <path fill="#1D9BF0" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.923-3.998-.356 0-.698.05-1.024.136C14.77 2.15 13.486 1.5 12 1.5s-2.77.65-3.643 2.138c-.326-.086-.668-.136-1.024-.136-2.213 0-3.923 1.788-3.923 3.998 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.923 3.998.356 0 .698-.05 1.024-.136C9.23 21.85 10.514 22.5 12 22.5s2.77-.65 3.643-2.138c.326.086.668.136 1.024.136 2.213 0 3.923-1.788 3.923-3.998 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"></path>
                                        <path fill="#FFF" d="M10.236 15.655L6.442 11.85c-.407-.406-1.066-.406-1.472 0-.407.406-.407 1.065 0 1.47l4.53 4.542c.404.406 1.063.406 1.47 0l9.31-9.33c.406-.407.406-1.066 0-1.472-.407-.407-1.065-.407-1.472 0l-8.57 8.595z"></path>
                                    </svg>
                                )}
                            </h1>
                            <div className="flex items-center gap-3 mt-0.5">
                                <p className="text-slate-300 text-[13px] flex items-center gap-1">
                                    <MapPin size={14} className="text-[var(--theme-glow)]" /> {user.country || 'Ubicación Desconocida'}
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
                    <p className="mt-3 text-slate-400 leading-snug text-sm w-full pr-4">
                        {user.bio_short || user.bio || ''}
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
                                {React.cloneElement(link.icon, { size: 18 })}
                            </div>
                        </a>
                    )) : (
                        // Sin redes sociales configuradas
                        <p className="text-xs text-white/30 italic">Sin redes sociales configuradas</p>
                    )}
                </div>

                {/* Services/Niches Badges */}
                {user.services && user.services.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 mb-2 w-full pr-4">
                        {user.services.map((service, index) => {
                            const dotColors = ['bg-pink-400', 'bg-cyan-400', 'bg-emerald-400', 'bg-amber-400', 'bg-violet-400'];
                            return (
                                <div
                                    key={index}
                                    className="bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5"
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${dotColors[index % dotColors.length]} shadow-[0_0_8px_currentColor]`}></div>
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
                            className="flex-1 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-3 flex items-center justify-center transition-all group shadow-lg gap-2.5"
                        >
                            <MessageCircle size={20} className="text-white group-hover:scale-110 transition-transform flex-shrink-0" />
                            <div className="flex flex-col items-start leading-none mt-px">
                                <span className="text-white font-bold text-[13px] md:text-sm">Privado</span>
                                <span className="text-slate-400 text-[9px] mt-1 uppercase tracking-wider">Acordar servicio</span>
                            </div>
                        </button>

                        {isFollowing && (
                            <Link to={`/casino/${user.username}`} className="flex-1">
                                <button
                                    className="w-full h-12 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-2xl px-3 flex items-center justify-center transition-all group shadow-lg shadow-yellow-500/5 gap-2.5"
                                >
                                    <Gamepad2 size={20} className="text-yellow-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                                    <div className="flex flex-col items-start leading-none mt-px">
                                        <span className="text-yellow-500 font-bold text-[13px] md:text-sm">Casino</span>
                                        <span className="text-yellow-500/70 text-[9px] mt-1 uppercase tracking-wider">Jugar y ganar</span>
                                    </div>
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

            {/* Auth Required Modal */}
            <AuthRequiredModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </div>
    );
}
