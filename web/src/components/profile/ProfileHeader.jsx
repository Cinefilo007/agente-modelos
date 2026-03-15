import React, { useState, useEffect } from 'react';
import { Edit3, Star, Instagram, Twitter, Globe, Lock, Heart, Mail, LayoutDashboard, Share2, TrendingUp, DollarSign, Loader, Music2, Twitch, Linkedin, Github, Link as LinkIcon, Facebook, CheckCircle2, Gamepad2 } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import { isOnline as checkOnline } from '../../utils/date';

export function ProfileHeader({ user, isOwnProfile, customActions }) {
    const { themeColor } = useTheme();
    const [isFollowing, setIsFollowing] = useState(false);
    const [loadingFollow, setLoadingFollow] = useState(false);

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
        <div className="relative pb-4" style={{ '--theme-glow': themeColor || '#e81cff' }}>
            {/* Global background effects for the profile container */}
            <div className="absolute inset-0 bg-background overflow-hidden -z-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--theme-glow)] opacity-10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 opacity-10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
            </div>

            {/* Cover Image */}
            <div className="h-72 w-full overflow-hidden relative">
                <img
                    src={user.cover_url || user.cover || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab'}
                    alt="Cover"
                    className="w-full h-full object-cover"
                />
                {/* Gradient overlay for smooth transition to dark theme */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
            </div>

            {/* Content Container (Offset & Glassmorphism) */}
            <div className="px-4 md:px-8 -mt-24 relative z-10 max-w-5xl mx-auto font-sans">
                {/* Profile Photo Offset to Left */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-4">
                    <div className="relative group flex-shrink-0 mb-4 md:mb-0">
                        {/* Glowing aura behind avatar */}
                        <div className="absolute inset-0 rounded-full blur-[14px] opacity-60 transform group-hover:scale-105 transition-transform duration-500 bg-[var(--theme-glow)]"></div>
                        <Avatar
                            src={user.avatar_url || user.avatar}
                            name={user.artistic_name || user.full_name || user.name}
                            alt={user.full_name || user.name}
                            size="xl"
                            isOnline={checkOnline(user.last_seen)}
                            className="w-32 h-32 md:w-40 md:h-40 relative z-10 shadow-2xl"
                            style={{ border: `4px solid rgba(255, 255, 255, 0.1)`, backgroundColor: '#111' }}
                        />
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex gap-3 relative z-20">
                        {customActions ? customActions : !isOwnProfile && (
                            <>
                                <Link to={`/casino/${user.username || user.id}`}>
                                    <Button
                                        className="h-12 bg-white/5 backdrop-blur-md border border-white/10 text-foreground hover:bg-white/10 gap-2 rounded-xl px-6 shadow-lg transition-all hover:border-white/20"
                                        variant="ghost"
                                    >
                                        <Gamepad2 size={18} className="text-purple-400" />
                                        <span>Probar suerte</span>
                                    </Button>
                                </Link>
                                <Button
                                    onClick={handleSubscribe}
                                    disabled={loadingFollow}
                                    className="h-12 rounded-xl px-8 font-semibold shadow-xl transition-shadow relative overflow-hidden"
                                    style={!isFollowing ? { backgroundColor: 'var(--theme-glow)', color: '#fff' } : {}}
                                    variant={isFollowing ? "outline" : "primary"}
                                >
                                    {loadingFollow ? <Loader size={18} className="animate-spin text-center w-full" /> : (isFollowing ? "Siguiendo" : "Suscribirse")}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Info & Glass Stats */}
                <div className="flex flex-col w-full">
                    {/* Artistic Name & Username */}
                    <div className="mb-4">
                        <h1 className="text-3xl font-extrabold text-foreground drop-shadow-md flex items-center gap-2 mb-1 tracking-tight">
                            {user.artistic_name || user.full_name || user.name}
                            {user.is_verified && <CheckCircle2 size={24} className="text-[#3897f0] fill-[#3897f0] shrink-0" />}
                        </h1>
                        <p className="text-muted-foreground font-medium tracking-wide">
                            @{user.username}
                        </p>
                    </div>

                    {/* Bio Section with Minimal Typography */}
                    {(user.bio_short || user.bio) && (
                        <div className="mb-5 max-w-2xl">
                            <p className="text-foreground/80 text-sm md:text-base leading-relaxed font-light">
                                {user.bio_short || user.bio}
                            </p>
                        </div>
                    )}

                    {/* Social Links (Clean Text with Icons) */}
                    {socialLinks.length > 0 && (
                        <div className="flex flex-wrap gap-4 mb-6">
                            {socialLinks.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors duration-200"
                                    style={{ '--hover-color': link.color }}
                                >
                                    {React.cloneElement(link.icon, { size: 16 })}
                                    <span className="capitalize">{link.label}</span>
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Services/Niches Badges with Glowing Borders */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {/* Mock data until we integrate it with the backend model */}
                        {['Contenido Exclusivo', 'Chat VIP', 'Videollamada', 'GFE'].map((service, index) => (
                            <div 
                                key={index} 
                                className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase backdrop-blur-md bg-white/5 border border-white/10 text-white/90 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:border-[var(--theme-glow)] hover:shadow-[0_0_15px_var(--theme-glow)] transition-all cursor-default"
                            >
                                {service}
                            </div>
                        ))}
                    </div>

                    {/* Stats Horizontal Bar (Glass Background) */}
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex items-center justify-between w-full shadow-2xl overflow-hidden relative">
                        {/* Subtle inner glow for the stats card */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-white/10 to-transparent opacity-20 pointer-events-none"></div>
                        
                        <div className="flex-1 flex flex-col items-center border-r border-white/5">
                            <span className="font-extrabold text-xl md:text-2xl text-foreground !leading-none">{user.followers_count >= 1000 ? (user.followers_count / 1000).toFixed(1) + 'k' : (user.followers_count || 0)}</span>
                            <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-semibold mt-1">Seguidores</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center border-r border-white/5">
                            <span className="font-extrabold text-xl md:text-2xl text-[var(--theme-glow)] !leading-none flex items-center gap-1">
                                {(user.reputation_score !== undefined && user.reputation_score !== null)
                                    ? parseFloat(user.reputation_score).toFixed(1)
                                    : '5.0'} <Star size={16} className="fill-[var(--theme-glow)]" />
                            </span>
                            <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-semibold mt-1">Rating</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                            <span className="font-extrabold text-xl md:text-2xl text-foreground !leading-none">{user.total_likes >= 1000 ? (user.total_likes / 1000).toFixed(1) + 'k' : (user.total_likes || 0)}</span>
                            <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-semibold mt-1">Likes</span>
                        </div>
                    </div>
                </div>

                {/* Actions Button Row (Mobile Only) */}
                <div className="flex md:hidden gap-3 mt-6 w-full relative z-20">
                    {customActions ? (
                        <div className="grid grid-cols-2 gap-3 w-full">
                            {customActions}
                        </div>
                    ) : !isOwnProfile ? (
                        <>
                            <Link to={`/casino/${user.username || user.id}`} className="flex-1">
                                <Button
                                    className="w-full h-14 bg-white/5 backdrop-blur-2xl border border-white/10 text-foreground gap-2 rounded-2xl shadow-lg transition-all"
                                    variant="ghost"
                                >
                                    <Gamepad2 size={20} className="text-purple-400" />
                                    <span className="text-sm font-semibold">Probar suerte</span>
                                </Button>
                            </Link>
                            <Button
                                onClick={handleSubscribe}
                                disabled={loadingFollow}
                                className="flex-1 rounded-2xl h-14 text-sm font-bold shadow-xl shadow-[var(--theme-glow)]/20 hover:shadow-[var(--theme-glow)]/40 transition-shadow"
                                variant={isFollowing ? "outline" : "primary"}
                                style={!isFollowing ? { backgroundColor: 'var(--theme-glow)', color: '#fff', border: 'none' } : {}}
                            >
                                {loadingFollow ? <Loader size={18} className="animate-spin" /> : (isFollowing ? "Siguiendo" : "Suscribirse")}
                            </Button>
                            <Button className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 text-foreground flex items-center justify-center shadow-lg" variant="ghost">
                                <Mail size={22} className="text-white/80" />
                            </Button>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <Link to="/edit-profile" className="flex-1">
                                <Button className="w-full h-14 bg-white/5 backdrop-blur-2xl border border-white/10 text-foreground gap-2 text-sm font-bold rounded-2xl shadow-lg transition-all" variant="ghost">
                                    <Edit3 size={18} className="text-white/80" /> <span>Editar Perfil</span>
                                </Button>
                            </Link>
                            <Link to="/admin" className="flex-1">
                                <Button className="w-full h-14 bg-white/5 backdrop-blur-2xl border border-white/10 text-foreground gap-2 text-sm font-bold rounded-2xl shadow-lg transition-all" variant="ghost">
                                    <LayoutDashboard size={18} className="text-[var(--theme-glow)]" /> <span>Panel Admin</span>
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
