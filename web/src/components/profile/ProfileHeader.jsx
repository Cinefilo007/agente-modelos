import React from 'react';
import { Edit3, Star, Instagram, Twitter, Globe, Lock, Heart, Mail, LayoutDashboard, Share2, TrendingUp, DollarSign } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export function ProfileHeader({ user, isOwnProfile, customActions }) {
    const { themeColor } = useTheme();

    // Dummy social links data (in real app, this comes from user object)
    const socialLinks = [
        { id: 'ig', icon: <Instagram size={18} />, label: 'Instagram', url: '#', color: '#E1306C' },
        { id: 'tw', icon: <Twitter size={18} />, label: 'Twitter', url: '#', color: '#1DA1F2' },
        { id: 'of', icon: <Lock size={18} />, label: 'OnlyFans', url: '#', color: '#00AFF0' }, // Simulated brand color
        { id: 'fansly', icon: <Heart size={18} />, label: 'Fansly', url: '#', color: '#dca54e' },
    ];

    return (
        <div className="relative pb-4">
            {/* Cover Image with Smooth Fade */}
            <div className="h-64 w-full overflow-hidden relative">
                <img
                    src={user.cover || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab'}
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
                            src={user.avatar}
                            alt={user.name}
                            size="xl"
                            isOnline={user.isOnline}
                            className="w-28 h-28 relative z-10"
                            style={{ border: `3px solid ${themeColor}` }}
                        />
                    </div>

                    {/* User Info & Metrics Consolidated */}
                    <div className="text-center w-full mb-4 flex flex-col items-center">
                        <h1 className="text-2xl font-bold text-foreground drop-shadow-lg flex justify-center items-center gap-2 mb-0.5">
                            {user.name}
                            {user.isVerified && <span className="bg-blue-500 text-white rounded-full p-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>}
                        </h1>
                        <p className="text-muted-foreground text-sm font-medium tracking-wide mb-4">@{user.username}</p>

                        {/* Compact Metrics Row */}
                        <div className="flex items-center justify-center gap-6 mb-5 w-full">
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-lg text-foreground leading-none">{user.stats.followers}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Fans</span>
                            </div>
                            <div className="w-px h-6 bg-white/10"></div>
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-lg text-foreground leading-none flex items-center gap-1">
                                    {user.stats.score} <Star size={12} className="fill-amber-400 text-amber-400" />
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Score</span>
                            </div>
                            <div className="w-px h-6 bg-white/10"></div>
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-lg text-foreground leading-none">{user.stats.likes}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Likes</span>
                            </div>
                        </div>

                        {/* Social Links Row */}
                        <div className="flex justify-center gap-3 mb-5 flex-wrap">
                            {socialLinks.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    className="p-2.5 rounded-full bg-secondary/30 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-1 border border-transparent hover:border-white/10 shadow-sm"
                                    style={{ '--hover-color': link.color }}
                                >
                                    {link.icon}
                                </a>
                            ))}
                            <button className="p-2.5 rounded-full bg-secondary/30 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all hover:scale-110 border border-transparent hover:border-white/10 shadow-sm">
                                <Mail size={18} />
                            </button>
                        </div>

                        {/* Bio - At the bottom */}
                        <div className="w-full px-2">
                            <p className="text-center text-foreground/90 text-sm leading-relaxed max-w-md mx-auto">
                                {user.bio || "Digital Soul | Creating magic in the metaverse 💜"}
                            </p>
                        </div>
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
                            <Button className="flex-1 rounded-2xl py-6 text-base font-semibold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-shadow" variant="primary" style={{ backgroundColor: themeColor, color: '#fff' }}>
                                Suscribirse
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
