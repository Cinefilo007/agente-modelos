import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { StoryCarousel } from '../components/profile/StoryCarousel';
import { ProfileContent } from '../components/profile/ProfileContent';
import StoryViewer from '../components/profile/StoryViewer';
import ClientProfile from './ClientProfile'; // Import Client View
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Heart, X, ShieldCheck, Loader, Send, UserPlus, UserCheck, Gamepad2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

function Profile() {
    const { username } = useParams(); // username or ID if we change routing
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const { themeColor } = useTheme();
    const { showToast } = useToast();

    const [profileUser, setProfileUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStory, setSelectedStory] = useState(null);
    const [error, setError] = useState(null);

    // 1. Determine if we are viewing "me" or another user
    const isMe = !username ||
        username === 'me' ||
        username === 'profile' ||
        (currentUser && (
            username === currentUser.username ||
            String(username) === String(currentUser.id) ||
            String(username) === String(currentUser.telegram_id)
        ));

    const isClient = currentUser?.role === 'client';

    useEffect(() => {
        // Optimization: Clients viewing themselves don't need to fetch model profile data
        if (isMe && isClient) {
            setLoading(false);
            return;
        }

        const fetchProfileData = async () => {
            setLoading(true);
            try {
                let userIdToFetch = username;

                if (isMe) {
                    userIdToFetch = 'me';
                } else if (!userIdToFetch) {
                    setError("User not found");
                    setLoading(false);
                    return;
                }

                const endpoint = isMe ? '/profile/me' : `/profile/${userIdToFetch}`;
                const { data: userData } = await api.get(endpoint);
                setProfileUser(userData);

                const targetId = userData.id;

                const [postsRes, storiesRes] = await Promise.all([
                    api.get(`/content/posts/${targetId}`),
                    api.get(`/content/stories/${targetId}`)
                ]);

                setPosts(Array.isArray(postsRes.data) ? postsRes.data : []);
                setStories(Array.isArray(storiesRes.data) ? storiesRes.data : []);

            } catch (err) {
                console.error("Error fetching profile:", err);
                setError("No se pudo cargar el perfil.");
            } finally {
                setLoading(false);
            }
        };

        if (currentUser || username) {
            fetchProfileData();
        }
    }, [username, currentUser, isMe]);

    // --- HOOKS MUST BE BEFORE ANY RETURNS ---
    const [isFollowing, setIsFollowing] = useState(false);
    const [loadingFollow, setLoadingFollow] = useState(false);

    useEffect(() => {
        if (!isMe && profileUser?.id) {
            // Record view for analytics
            api.post('/analytics/view', { model_id: profileUser.id }).catch(() => { });

            const checkFollow = async () => {
                try {
                    const { data } = await api.get(`/interactions/followers/status/${profileUser.id}`);
                    setIsFollowing(data.is_following);
                } catch (err) {
                    console.error("Error checking follow status:", err);
                }
            };
            checkFollow();
        }
    }, [isMe, profileUser?.id]);

    const requireAuth = (callback) => {
        if (!currentUser) {
            showToast("¡Únete a nuestra comunidad para interactuar!", "info");
            setTimeout(() => navigate('/onboarding'), 2000);
            return;
        }
        callback();
    };

    const handleSubscribe = async () => {
        requireAuth(async () => {
            if (!profileUser?.id) return;
            setLoadingFollow(true);
            try {
                if (isFollowing) {
                    await api.delete(`/interactions/followers/${profileUser.id}`);
                    setIsFollowing(false);
                } else {
                    await api.post('/interactions/followers', { model_id: profileUser.id });
                    setIsFollowing(true);
                }
            } catch (err) {
                console.error("Error toggling follow:", err);
            } finally {
                setLoadingFollow(false);
            }
        });
    };

    const handleTelegramChat = () => {
        if (profileUser?.username) {
            const username = profileUser.username.startsWith('@')
                ? profileUser.username.substring(1)
                : profileUser.username;
            window.open(`https://t.me/${username}`, '_blank');
        }
    };

    const isOwnProfile = profileUser ? (currentUser?.id === profileUser.id || isMe) : false;

    const CustomActions = (!isOwnProfile && profileUser) ? (
        <>
            <button
                onClick={handleSubscribe}
                disabled={loadingFollow}
                className={`w-full h-full gap-2 rounded-2xl py-4 shadow-lg backdrop-blur-md transition-all flex items-center justify-center group border ${isFollowing
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-primary text-primary-foreground border-transparent'
                    }`}
                style={!isFollowing ? { backgroundColor: themeColor } : {}}
            >
                {loadingFollow ? <Loader size={18} className="animate-spin" /> : (
                    <>
                        {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                        <span className="text-sm font-semibold">{isFollowing ? 'Siguiendo' : 'Seguir'}</span>
                    </>
                )}
            </button>
            <button
                onClick={() => navigate(`/casino/${profileUser.username || profileUser.id}`)}
                className="w-full h-full bg-card/60 border border-white/10 text-foreground hover:bg-white/10 gap-2 rounded-2xl py-4 shadow-lg backdrop-blur-md transition-all hover:border-white/20 flex items-center justify-center group"
            >
                <Gamepad2 size={18} className="text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold">Probar suerte</span>
            </button>
            <button
                onClick={() => requireAuth(handleTelegramChat)}
                className="w-full h-full bg-card/60 border border-white/10 text-foreground hover:bg-white/10 gap-2 rounded-2xl py-4 shadow-lg backdrop-blur-md transition-all hover:border-white/20 flex items-center justify-center group"
            >
                <Send size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold">Telegram</span>
            </button>
        </>
    ) : null;

    // --- FINAL CONDITIONAL RENDERS AFTER ALL HOOKS ---

    // 2. Client Redirection Logic for "me"
    if (isMe && currentUser?.role === 'client') {
        return <ClientProfile />;
    }

    if (error) return (
        <div className="p-10 text-center text-red-400">
            {error || "Perfil no encontrado"}
        </div>
    );

    // If still loading and no user data, show nothing or minimal skeleton
    if (!profileUser && loading) return null;

    if (!profileUser) return null;

    return (
        <div className={`pb-20 transition-opacity duration-700 ease-in-out ${loading ? 'opacity-0' : 'opacity-100'}`}>
            {/* Profile Header */}
            <ProfileHeader
                user={profileUser}
                isOwnProfile={isOwnProfile}
                customActions={CustomActions}
            />

            {/* Stories Section */}
            {/* Stories Section */}
            {(stories.length > 0 || isOwnProfile) && (
                <>
                    <div className="mt-4 text-[var(--text-secondary)] text-xs px-4 uppercase tracking-wider font-semibold">
                        Historias {isOwnProfile && <span className="text-purple-400 text-[10px] ml-2">(+ Crear)</span>}
                    </div>
                    {/* Separar las historias activas (últimas 24h) de las destacadas (guardadas por la modelo) */}
                    {(() => {
                        const now = new Date();
                        const activeStories = stories.filter(s => new Date(s.expires_at) > now);
                        const savedStories = stories.filter(s => s.is_saved).slice(0, 10); // Límite de 10 historias guardadas

                        if (stories.length === 0 && isOwnProfile) {
                            return (
                                <div className="px-4 py-4">
                                    <button
                                        onClick={() => navigate('/create-story')}
                                        className="flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <span className="text-2xl text-white/50">+</span>
                                        <span className="text-[10px] text-white/40 mt-1">Crear</span>
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <div className="flex flex-col gap-2">
                                <StoryCarousel
                                    stories={activeStories}
                                    onOpenStory={(story) => {
                                        const index = activeStories.findIndex(s => s.id === story.id);
                                        setSelectedStory({ list: activeStories, activeIndex: index === -1 ? 0 : index });
                                    }}
                                    title="Historias de hoy"
                                />
                                {savedStories.length > 0 && (
                                    <StoryCarousel
                                        stories={savedStories}
                                        onOpenStory={(story) => {
                                            const index = savedStories.findIndex(s => s.id === story.id);
                                            setSelectedStory({ list: savedStories, activeIndex: index === -1 ? 0 : index });
                                        }}
                                        title="Destacados"
                                    />
                                )}
                            </div>
                        );
                    })()}
                </>
            )}

            {/* Content Tabs (Posts, Shop & Reviews) */}
            <ProfileContent
                posts={posts}
                modelId={profileUser.id}
                username={profileUser.username}
                isOwnProfile={isOwnProfile}
                onPostClick={(id) => requireAuth(() => navigate(`/post/${id}`))}
            />

            {/* Story Viewer Modal */}
            {selectedStory !== null && (
                <StoryViewer
                    stories={selectedStory.list}
                    initialStoryIndex={selectedStory.activeIndex}
                    onClose={() => setSelectedStory(null)}
                    user={profileUser}
                    onStoryDeleted={(id) => {
                        setStories(prev => prev.filter(s => s.id !== id));
                        setSelectedStory(null);
                    }}
                />
            )}
        </div>
    );
}

export default Profile;
