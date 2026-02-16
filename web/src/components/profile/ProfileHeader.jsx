import React, { useState, useEffect } from 'react';
import { Edit3, Star, Instagram, Twitter, Globe, Lock, Heart, Mail, LayoutDashboard, Share2, TrendingUp, DollarSign, Loader, Music2, Twitch, Linkedin, Github, Link as LinkIcon, Facebook } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';

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
            case 'youtube': return <Youtube size={size} />;
            case 'tiktok': return <Music2 size={size} />;
            case 'twitch': return <Twitch size={size} />;
            case 'linkedin': return <Linkedin size={size} />;
            case 'github': return <Github size={size} />;
            case 'onlyfans': return <Star size={size} />;
            case 'website': return <Globe size={size} />;
            default: return <LinkIcon size={size} />; // LinkIcon needs import check
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

    /* console.log("ProfileHeader user:", user); */ // Uncomment for debugging if needed

    if (!user) return null; // Safety check

    return (
        <div className="relative pb-4">
            {/* Cover Image with Smooth Fade */}
            <div className="h-64 w-full overflow-hidden relative">
                <img
                    src={user.cover_url || user.cover || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab'}
                    alt="Cover"
                    className="w-full h-full object-cover"
                    style={{
                        maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
                    }}
                />
            </div>

            {/* Unified Glass Card */}
            <div className="px-4 -mt-32 relative z-10 font-sans">
                <div className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 pt-0 flex flex-col items-center shadow-2xl relative overflow-visible">

                    {/* Avatar - Elegant Border */}
                    <div className="-mt-14 mb-3 relative group">
                        <div className="absolute inset-0 rounded-full blur-md opacity-50 transform group-hover:scale-105 transition-transform duration-500" style={{ backgroundColor: themeColor }}></div>
                        <Avatar
                            src={user.avatar_url || user.avatar}
                            name={user.artistic_name || user.full_name || user.name}
                            alt={user.full_name || user.name}
                            size="xl"
                            isOnline={user.isOnline}
                            className="w-28 h-28 relative z-10"
                            style={{ border: `3px solid ${themeColor}` }}
                        />
                    </div>

                    {/* User Info & Metrics Consolidated */}
                    <div className="text-center w-full mb-4 flex flex-col items-center">
                        <h1 className="text-2xl font-bold text-foreground drop-shadow-lg flex justify-center items-center gap-2 mb-0.5">
                            {user.artistic_name || user.full_name || user.name}
                            {user.isVerified && <span className="bg-blue-500 text-white rounded-full p-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>}
                        </h1>
                        <p className="text-muted-foreground text-sm font-medium tracking-wide mb-4">@{user.username}</p>

                        {/* Compact Metrics Row */}
                        <div className="flex items-center justify-center gap-6 mb-5 w-full">
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-lg text-foreground leading-none">{user.followers_count || 0}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Seguidores</span>
                            </div>
                            <div className="w-px h-6 bg-white/10"></div>
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-lg text-foreground leading-none flex items-center gap-1">
                                    {user.reputation_score || 0} <Star size={12} className="fill-amber-400 text-amber-400" />
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Puntos</span>
                            </div>
                            <div className="w-px h-6 bg-white/10"></div>
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-lg text-foreground leading-none">{user.total_likes || 0}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Likes</span>
                            </div>
                        </div>

                        {/* Social Links Row */}
                        {socialLinks.length > 0 && (
                            <div className="flex justify-center gap-3 mb-5 flex-wrap">
                                {socialLinks.map((link) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded-full bg-secondary/30 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-1 border border-transparent hover:border-white/10 shadow-sm"
                                        style={{ '--hover-color': link.color }}
                                    >
                                        {link.icon}
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* Bio - At the bottom */}
                        {(user.bio_short || user.bio) && (
                            <div className="w-full px-2">
                                <p className="text-center text-foreground/90 text-sm leading-relaxed max-w-md mx-auto">
                                    {user.bio_short || user.bio}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions Button Row */}
                <div className="flex gap-3 mt-4 w-full relative z-20 px-1">
                    {customActions ? (
                        <div className="grid grid-cols-2 gap-3 w-full">
                            {customActions}
                        </div>
                    ) : !isOwnProfile ? (
                        <>
                            <Button
                                onClick={handleSubscribe}
                                disabled={loadingFollow}
                                className="flex-1 rounded-2xl py-6 text-base font-semibold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-shadow"
                                variant={isFollowing ? "outline" : "primary"}
                                style={!isFollowing ? { backgroundColor: themeColor, color: '#fff' } : {}}
                            >
                                {loadingFollow ? <Loader size={18} className="animate-spin" /> : (isFollowing ? "Siguiendo" : "Suscribirse")}
                            </Button>
                            <Button className="w-14 h-14 rounded-2xl bg-card border border-white/10 text-foreground hover:bg-white/5 flex items-center justify-center shadow-lg" variant="ghost">
                                <Mail size={22} />
                            </Button>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <Link to="/edit-profile" className="flex-1">
                                <Button className="w-full h-full bg-card/60 border border-white/10 text-foreground hover:bg-white/10 gap-2 rounded-2xl py-4 shadow-lg backdrop-blur-md transition-all hover:border-white/20" variant="ghost">
                                    <Edit3 size={18} /> <span className="text-sm font-semibold">Editar</span>
                                </Button>
                            </Link>
                            <Link to="/admin-panel" className="flex-1">
                                <Button className="w-full h-full bg-card/60 border border-white/10 text-foreground hover:bg-white/10 gap-2 rounded-2xl py-4 shadow-lg backdrop-blur-md transition-all hover:border-white/20" variant="ghost">
                                    <LayoutDashboard size={18} /> <span className="text-sm font-semibold">Panel</span>
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
