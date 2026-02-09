import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { StoryCarousel } from '../components/profile/StoryCarousel';
import { ProfileContent } from '../components/profile/ProfileContent';
import { useAuth } from '../context/AuthContext';
import { modelService } from '../api/model';
import { STORIES, POSTS } from '../data/dummy'; // Fallback for now or replace later
import { Heart, X, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function Profile() {
    const { username } = useParams();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const { themeColor } = useTheme();

    const [profileUser, setProfileUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedStory, setSelectedStory] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                if (username) {
                    // Fetch by username
                    // const data = await modelService.getProfile(username);
                    // Mock for now until backend endpoint handles username lookup perfectly
                    console.log("Fetching profile for:", username);
                    // Simulator:
                    setProfileUser({
                        id: 'model-uuid',
                        name: 'Valentina Rose',
                        username: '@valerose',
                        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
                        cover: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e',
                        bio: 'Modelo exclusiva. Contenido diario y chat directo 24/7. 💋',
                        isVerified: true,
                        role: 'model',
                        stats: { followers: '12.5K', following: 150, likes: '45.2K' }
                    });
                } else {
                    // Current User
                    setProfileUser(currentUser || {
                        id: 'me',
                        name: 'Mi Perfil',
                        username: '@me',
                        avatar: 'https://github.com/shadcn.png',
                        role: 'client' // or model
                    });
                }
            } catch (error) {
                console.error("Error fetching profile", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [username, currentUser]);

    if (loading) return <div className="p-10 text-center">Cargando perfil...</div>;
    if (!profileUser) return <div className="p-10 text-center">Perfil no encontrado</div>;

    const isOwnProfile = currentUser?.id === profileUser.id || (!username && currentUser);
    const isModel = profileUser.role === 'model' || true; // Force true for mock

    const handleTelegramChat = () => {
        // Mock Telegram chat
        window.open(`https://t.me/${profileUser.username.replace('@', '')}`, '_blank');
    };

    const CustomActions = !isOwnProfile && isModel ? (
        <>
            <button
                onClick={handleHiring}
                className="w-full h-full bg-card/60 border border-white/10 text-foreground hover:bg-white/10 gap-2 rounded-2xl py-4 shadow-lg backdrop-blur-md transition-all hover:border-white/20 flex items-center justify-center group"
            >
                <ShieldCheck size={18} className="text-pink-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold">Contratar</span>
            </button>
            <button
                onClick={handleTelegramChat}
                className="w-full h-full bg-card/60 border border-white/10 text-foreground hover:bg-white/10 gap-2 rounded-2xl py-4 shadow-lg backdrop-blur-md transition-all hover:border-white/20 flex items-center justify-center group"
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 group-hover:scale-110 transition-transform">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <span className="text-sm font-semibold">Telegram</span>
            </button>
        </>
    ) : null;

    return (
        <div className="pb-20">
            {/* Profile Header */}
            <ProfileHeader
                user={profileUser}
                isOwnProfile={isOwnProfile}
                customActions={CustomActions}
            />

            <div className="mt-4 text-[var(--text-secondary)] text-xs px-4 uppercase tracking-wider font-semibold">
                Historias
            </div>
            <StoryCarousel stories={STORIES} onOpenStory={setSelectedStory} />

            <ProfileContent posts={POSTS} />

            {/* Story Viewer Modal */}
            {selectedStory && (
                <div
                    className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-300"
                    onClick={() => setSelectedStory(null)}
                >
                    <div className="absolute top-4 right-4 z-20">
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedStory(null); }}
                            className="text-white p-3 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={28} />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={selectedStory.image}
                            alt="Story"
                            className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
                        />
                    </div>
                    <div className="p-4 bg-gradient-to-t from-black via-black/50 to-transparent absolute bottom-0 w-full pb-8" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <img src={selectedStory.user.avatar} className="w-10 h-10 rounded-full border-2 border-white/20" />
                            <span className="font-bold text-white shadow-black drop-shadow-md">{selectedStory.user.name}</span>
                        </div>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                placeholder="Enviar mensaje..."
                                className="bg-white/10 border border-white/20 rounded-full px-5 py-3 w-full text-sm placeholder:text-gray-400 focus:outline-none focus:border-white/50 focus:bg-white/20 text-white backdrop-blur-md transition-all"
                            />
                            <button className="p-3 hover:scale-110 transition-transform active:scale-95">
                                <Heart size={28} className="text-white hover:fill-pink-500 hover:text-pink-500 transition-colors" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Profile;

