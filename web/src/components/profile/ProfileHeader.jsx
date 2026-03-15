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
        <div className="relative pb-4 font-sans" style={{ '--theme-glow': themeColor || '#b829e3' }}>
            {/* Global background effects for the profile container */}
            <div className="absolute inset-0 bg-[#0a0a0a] overflow-hidden -z-10">
                {/* Subtle top glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--theme-glow)] opacity-[0.03] blur-[100px] rounded-full pointer-events-none" />
            </div>

            {/* Cover Image */}
            <div className="h-56 md:h-72 w-full overflow-hidden relative">
                <img
                    src={user.cover_url || user.cover || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab'}
                    alt="Cover"
                    className="w-full h-full object-cover opacity-80"
                />
                {/* Gradient overlay for smooth transition to dark background */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent"></div>
            </div>

            {/* Content Container */}
            <div className="px-5 md:px-8 -mt-20 relative z-10 max-w-5xl mx-auto flex flex-col">

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

                    {/* Stats */}
                    <div className="flex gap-4 md:gap-8 mb-2 pb-1">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-white/50 tracking-widest font-bold uppercase mb-0.5">Followers</span>
                            <span className="font-bold text-lg md:text-xl text-white">
                                {user.followers_count >= 1000 ? (user.followers_count / 1000).toFixed(1) + 'M' : (user.followers_count || '1.2M')}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-white/50 tracking-widest font-bold uppercase mb-0.5">Likes</span>
                            <span className="font-bold text-lg md:text-xl text-cyan-400">
                                {user.total_likes >= 1000 ? '+' + (user.total_likes / 1000).toFixed(0) + 'k' : (user.total_likes ? '+' + user.total_likes : '+12%')}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-white/50 tracking-widest font-bold uppercase mb-0.5">Rating</span>
                            <span className="font-bold text-lg md:text-xl text-white flex items-center gap-1">
                                {(user.reputation_score !== undefined && user.reputation_score !== null)
                                    ? parseFloat(user.reputation_score).toFixed(1)
                                    : '4.9'}
                                <Star size={12} className="fill-[var(--theme-glow)] text-[var(--theme-glow)] ml-0.5" />
                            </span>
                        </div>
                    </div>
                </div>

                {/* Name, Title & Follow Button Row */}
                <div className="flex items-center justify-between mb-4 w-full">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
                            {user.artistic_name || user.full_name || user.name || 'Elena Vance'}
                            {user.is_verified && <CheckCircle2 size={18} className="text-[var(--theme-glow)] fill-[var(--theme-glow)] text-black shrink-0" />}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-white/80 font-medium tracking-wide">Elite Creator & Model</span>
                            <span className="w-1 h-1 rounded-full bg-white/30"></span>
                            <span className="text-xs text-white/50 flex items-center gap-1">
                                <Globe size={10} /> United States 🇺🇸
                            </span>
                        </div>
                    </div>

                    {/* Follow Action */}
                    {!isOwnProfile && (
                        <Button
                            onClick={handleSubscribe}
                            disabled={loadingFollow}
                            className="rounded-full px-6 py-2 h-auto text-xs font-bold transition-all"
                            style={!isFollowing ? { backgroundColor: 'var(--theme-glow)', color: '#fff', border: 'none' } : {}}
                            variant={isFollowing ? "outline" : "primary"}
                        >
                            {loadingFollow ? <Loader size={14} className="animate-spin" /> : (isFollowing ? "FOLLOWING" : "FOLLOW")}
                        </Button>
                    )}
                </div>

                {/* Bio Section */}
                <div className="mb-5 max-w-lg">
                    <p className="text-white/60 text-sm leading-relaxed font-light">
                        {user.bio_short || user.bio || 'Redefining the digital aesthetic. High-fashion projects and exclusive digital content. 📍 Based in New York / Paris.'}
                    </p>
                </div>

                {/* Social Icons Row */}
                <div className="flex flex-wrap gap-3 mb-6">
                    {socialLinks.length > 0 ? socialLinks.map((link) => (
                        <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            {React.cloneElement(link.icon, { size: 16 })}
                        </a>
                    )) : (
                        // Mock icons for design alignment if no data
                        <>
                            {['instagram', 'twitter', 'onlyfans', 'mail', 'website'].map((mock, i) => (
                                <div key={i} className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white/50">
                                    {getSocialIcon(mock, 16)}
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Services/Niches Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {['GFE', 'VIDEO-CALL', 'VIP-CHAT', 'PHOTO SHOOT'].map((service, index) => (
                        <div
                            key={index}
                            className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#1a1a1a] text-white/70 border border-white/5 flex items-center gap-2"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-glow)]"></span>
                            {service}
                        </div>
                    ))}
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
