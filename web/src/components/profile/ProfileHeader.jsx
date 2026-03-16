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
        <div className="relative font-display text-slate-900 dark:text-slate-100 min-h-screen pb-24" style={{ '--theme-glow': themeColor || '#b829e3' }}>
            {/* Cover Image Container */}
            <div className="relative w-full h-56">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${user.cover_url || user.cover || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab'}')` }}></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background-dark/95"></div>
            </div>

            {/* Content Container */}
            <div className="px-5 -mt-20 relative z-10 max-w-5xl mx-auto">

                {/* Top Row: Avatar + Stats */}
                <div className="flex items-end gap-5 mb-4">
                    {/* Profile Photo */}
                    <div className="flex-shrink-0">
                        <div className="p-1 rounded-full bg-gradient-to-tr from-[var(--theme-glow)] to-accent-magenta shadow-xl shadow-[var(--theme-glow)]/20">
                            <div
                                className="w-24 h-24 rounded-full border-4 border-background-dark bg-cover bg-center"
                                style={{ backgroundImage: `url('${user.avatar_url || user.avatar}')` }}
                            ></div>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="flex-grow bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 mb-1 grid grid-cols-3 gap-1">
                        <div className="text-center">
                            <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Followers</p>
                            <p className="text-sm font-bold text-white leading-tight">
                                {user.followers_count >= 1000 ? (user.followers_count / 1000).toFixed(1) + 'M' : (user.followers_count || '1.2M')}
                            </p>
                        </div>
                        <div className="text-center border-x border-white/10">
                            <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Likes</p>
                            <p className="text-sm font-bold text-accent-blue leading-tight text-cyan-400">
                                {user.total_likes >= 1000 ? '+' + (user.total_likes / 1000).toFixed(0) + 'k' : (user.total_likes ? '+' + user.total_likes : '+12%')}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Rating</p>
                            <p className="text-sm font-bold text-accent-magenta leading-tight" style={{ color: 'var(--theme-glow)' }}>
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
                                {user.is_verified && <span className="material-symbols-outlined text-[var(--theme-glow)] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
                            </h1>
                            <div className="flex items-center gap-3 mt-0.5">
                                <p className="text-slate-300 text-xs font-medium tracking-wide">Elite Creator & Model</p>
                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                <p className="text-slate-400 text-[11px] flex items-center gap-1">
                                    <Globe size={12} className="text-slate-400" /> United States 🇺🇸
                                </p>
                            </div>
                        </div>

                        {/* Follow Action */}
                        {!isOwnProfile && (
                            <button
                                onClick={handleSubscribe}
                                disabled={loadingFollow}
                                className="transition-all text-white px-5 py-2 rounded-full text-xs font-bold shadow-lg flex items-center justify-center min-w-[80px]"
                                style={{
                                    backgroundColor: isFollowing ? 'transparent' : 'var(--theme-glow)',
                                    border: isFollowing ? '1px solid var(--theme-glow)' : 'none',
                                    color: isFollowing ? 'var(--theme-glow)' : '#fff',
                                    boxShadow: isFollowing ? 'none' : '0 10px 15px -3px rgba(184, 41, 227, 0.2)'
                                }}
                            >
                                {loadingFollow ? <Loader size={14} className="animate-spin" /> : (isFollowing ? "FOLLOWING" : "FOLLOW")}
                            </button>
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
                <div className="mt-4 flex flex-wrap gap-1.5 mb-2">
                    {['GFE', 'VIDEO CALL', 'VIP CHAT', 'PHOTO SHOOT'].map((service, index) => {
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

                {/* Additional Buttons (Own Profile) */}
                {isOwnProfile && (
                    <div className="flex gap-3 mb-6">
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
        </div>
    );
}
