import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { StoryCarousel } from '../components/profile/StoryCarousel';
import { ProfileContent } from '../components/profile/ProfileContent';
import StoryViewer from '../components/profile/StoryViewer';
import ClientProfile from './ClientProfile'; // Import Client View
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Heart, X, ShieldCheck, Loader } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function Profile() {
    const { username } = useParams(); // username or ID if we change routing
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const { themeColor } = useTheme();

    const [profileUser, setProfileUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStory, setSelectedStory] = useState(null);
    const [error, setError] = useState(null);

    // 1. Determine if we are viewing "me" or another user
    // If username is "me" or undefined with no params, it's current user
    const isMe = !username || username === 'me' || (currentUser && username === currentUser.username);

    // 2. Client Redirection Logic
    if (isMe && currentUser?.role === 'client') {
        return <ClientProfile />;
    }

    useEffect(() => {
        const fetchProfileData = async () => {
            setLoading(true);
            try {
                let userIdToFetch = username;

                if (isMe) {
                    userIdToFetch = 'me';
                } else if (!userIdToFetch) {
                    // If no username and not me (shouldn't happen with correct routing), fail
                    setError("User not found");
                    setLoading(false);
                    return;
                }

                // Fetch Profile
                // If it's 'me', API handles it. If it's a username/ID (we need to support ID in API or username)
                // For now assuming API supports ID or "me"
                // To support username, we might need a lookup endpoint or 'me' logic in frontend to pass ID

                // HACK: for now, if it's 'me', use 'me'. If it's another user, we assume 'username' is actually an ID for simplicity 
                // OR we need an endpoint /api/profile/by-username/{username}
                // Let's assume the route /api/profile/{id} works for ID. 
                // If the URL is /profile/@username, we need to resolve it. 
                // For this iteration, let's assume we pass ID in URL or 'me'. 
                // If we really want username, we'd need a backend change.

                const endpoint = isMe ? '/profile/me' : `/profile/${userIdToFetch}`;
                const { data: userData } = await api.get(endpoint);
                setProfileUser(userData);

                // Fetch Content (Posts & Stories)
                const targetId = userData.id; // Always use the fetched user's ID

                const [postsRes, storiesRes] = await Promise.all([
                    api.get(`/content/posts/${targetId}`),
                    api.get(`/content/stories/${targetId}`)
                ]);

                setPosts(postsRes.data);
                setStories(storiesRes.data);

            } catch (err) {
                console.error("Error fetching profile:", err);
                setError("No se pudo cargar el perfil.");
                // If 404 and isMe, maybe redirect to setup?
            } finally {
                setLoading(false);
            }
        };

        if (currentUser || username) {
            fetchProfileData();
        }
    }, [username, currentUser, isMe]);

    if (loading) return (
        <div className="flex h-screen items-center justify-center">
            <Loader className="animate-spin text-purple-500" size={40} />
        </div>
    );

    if (error || !profileUser) return (
        <div className="p-10 text-center text-red-400">
            {error || "Perfil no encontrado"}
        </div>
    );

    const isOwnProfile = currentUser?.id === profileUser.id || isMe;
    const isModel = profileUser.role === 'model' || true; // profileUser table is 'models', so always true if found via generic route?

    const handleTelegramChat = () => {
        // Use provided username or fallback
        if (profileUser.username) {
            window.open(`https://t.me/${profileUser.username.replace('@', '')}`, '_blank');
        }
    };

    const handleOpenStory = (index) => {
        setSelectedStory(index);
    };

    const CustomActions = !isOwnProfile ? (
        <>
            <button
                className="w-full h-full bg-card/60 border border-white/10 text-foreground hover:bg-white/10 gap-2 rounded-2xl py-4 shadow-lg backdrop-blur-md transition-all hover:border-white/20 flex items-center justify-center group"
            >
                <ShieldCheck size={18} className="text-pink-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold">Contratar</span>
            </button>
            <button
                onClick={handleTelegramChat}
                className="w-full h-full bg-card/60 border border-white/10 text-foreground hover:bg-white/10 gap-2 rounded-2xl py-4 shadow-lg backdrop-blur-md transition-all hover:border-white/20 flex items-center justify-center group"
            >
                <Send size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
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

            {/* Stories Section */}
            {(stories.length > 0 || isOwnProfile) && (
                <>
                    <div className="mt-4 text-[var(--text-secondary)] text-xs px-4 uppercase tracking-wider font-semibold">
                        Historias {isOwnProfile && <span className="text-purple-400 text-[10px] ml-2">(+ Crear)</span>}
                    </div>
                    {stories.length === 0 && isOwnProfile ? (
                        <div className="px-4 py-4">
                            <button
                                onClick={() => navigate('/create-story')}
                                className="flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <span className="text-2xl text-white/50">+</span>
                                <span className="text-[10px] text-white/40 mt-1">Crear</span>
                            </button>
                        </div>
                    ) : (
                        <StoryCarousel stories={stories} onOpenStory={(story) => {
                            const idx = stories.findIndex(s => s.id === story.id);
                            if (idx >= 0) setSelectedStory(idx);
                        }} />
                    )}
                </>
            )}

            {/* Content Tabs (Posts & Reviews) */}
            <ProfileContent
                posts={posts}
                modelId={profileUser.id}
                isOwnProfile={isOwnProfile}
                onPostClick={(id) => navigate(`/post/${id}`)}
            />

            {/* Story Viewer Modal */}
            {selectedStory !== null && (
                <StoryViewer
                    stories={stories}
                    initialStoryIndex={selectedStory}
                    onClose={() => setSelectedStory(null)}
                />
            )}
        </div>
    );
}

export default Profile;
