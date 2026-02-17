import React, { useMemo } from 'react';
import clsx from 'clsx';
import { User, Shield, Star, Crown, Diamond } from 'lucide-react';

const EliteAvatar = ({ user, size = "md", className = "" }) => {
    // Determine elite level based on total_spent/spending_level
    // spending_level could be passed or calculated from total_spent
    const spending = user?.total_spent || 0;

    const level = useMemo(() => {
        if (spending >= 5000) return 'diamond';
        if (spending >= 1000) return 'gold';
        if (spending >= 250) return 'silver';
        if (spending >= 50) return 'bronze';
        return 'none';
    }, [spending]);

    const sizeClasses = {
        xs: "w-8 h-8",
        sm: "w-10 h-10",
        md: "w-12 h-12",
        lg: "w-16 h-16",
        xl: "w-24 h-24"
    };

    const borderStyles = {
        none: "border-2 border-white/10",
        bronze: "border-2 border-[#CD7F32] shadow-[0_0_10px_rgba(205,127,50,0.3)]",
        silver: "border-2 border-[#C0C0C0] shadow-[0_0_10px_rgba(192,192,192,0.4)]",
        gold: "border-2 border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.5)] animate-pulse-slow",
        diamond: "border-2 border-[#B9F2FF] shadow-[0_0_20px_rgba(185,242,255,0.6)] animate-glow-blue"
    };

    const LevelIcon = () => {
        switch (level) {
            case 'bronze': return <Shield size={12} className="text-[#CD7F32] fill-[#CD7F32]/20" />;
            case 'silver': return <Star size={12} className="text-[#C0C0C0] fill-[#C0C0C0]/20" />;
            case 'gold': return <Crown size={12} className="text-[#FFD700] fill-[#FFD700]/20" />;
            case 'diamond': return <Diamond size={12} className="text-[#B9F2FF] fill-[#B9F2FF]/20" />;
            default: return null;
        }
    };

    return (
        <div className={clsx("relative inline-block shrink-0", className)}>
            <div className={clsx(
                "rounded-full overflow-hidden flex items-center justify-center bg-zinc-900 transition-all duration-500",
                sizeClasses[size],
                borderStyles[level]
            )}>
                {user?.avatar_url ? (
                    <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <User className="text-zinc-600" size={size === 'xs' ? 16 : 24} />
                )}
            </div>

            {level !== 'none' && (
                <div className={clsx(
                    "absolute -bottom-1 -right-1 p-1 rounded-full border border-black/50 backdrop-blur-md z-10",
                    level === 'bronze' && "bg-[#CD7F32]/20",
                    level === 'silver' && "bg-[#C0C0C0]/20",
                    level === 'gold' && "bg-[#FFD700]/20",
                    level === 'diamond' && "bg-[#B9F2FF]/20"
                )}>
                    <LevelIcon />
                </div>
            )}
        </div>
    );
};

export default EliteAvatar;
