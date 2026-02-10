import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { timeAgo } from '../../utils/date';

const StoryViewer = ({ stories, initialStoryIndex = 0, onClose, user }) => {
    const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef(null);
    const STORY_DURATION = 5000; // 5 seconds for images

    const currentStory = stories[currentIndex] || stories[0];

    // Extract user info from current story (API returns 'models' object) or fallback to user prop
    const storyUser = currentStory?.models || user || {};
    const username = storyUser.artistic_name || storyUser.name || storyUser.username || 'Unknown';
    const avatarUrl = storyUser.avatar_url || storyUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    // Auto-advance logic
    useEffect(() => {
        if (!currentStory) return;

        let animationFrame;
        let startTime;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;

            if (currentStory.media_type === 'video') {
                // Video handles its own progress via timeupdate
                return;
            }

            const newProgress = (elapsed / STORY_DURATION) * 100;

            if (newProgress >= 100) {
                handleNext();
            } else {
                setProgress(newProgress);
                animationFrame = requestAnimationFrame(animate);
            }
        };

        if (currentStory.media_type !== 'video') {
            animationFrame = requestAnimationFrame(animate);
        }

        return () => cancelAnimationFrame(animationFrame);
    }, [currentIndex, currentStory]);

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        }
    };

    const handleVideoTimeUpdate = () => {
        if (videoRef.current) {
            const duration = videoRef.current.duration;
            const currentTime = videoRef.current.currentTime;
            if (duration > 0) {
                setProgress((currentTime / duration) * 100);
            }
        }
    };

    const handleVideoEnded = () => {
        handleNext();
    };

    if (!currentStory) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/50 rounded-full text-white backdrop-blur-md transition-colors"
            >
                <X size={24} />
            </button>

            {/* Progress Bars */}
            <div className="absolute top-4 left-0 w-full px-2 flex gap-1 z-40">
                {stories.map((story, idx) => (
                    <div key={story.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-100 linear"
                            style={{
                                width: idx < currentIndex ? '100%' :
                                    idx === currentIndex ? `${progress}%` : '0%'
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Media Container */}
            <div className="relative w-full h-full md:max-w-md md:aspect-[9/16] bg-black">
                {/* Click Areas for Navigation */}
                <div className="absolute inset-y-0 left-0 w-1/3 z-30" onClick={handlePrev}></div>
                <div className="absolute inset-y-0 right-0 w-1/3 z-30" onClick={handleNext}></div>

                {/* Media */}
                {currentStory.media_type === 'video' ? (
                    <video
                        ref={videoRef}
                        src={currentStory.media_url}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted={false}
                        playsInline
                        onTimeUpdate={handleVideoTimeUpdate}
                        onEnded={handleVideoEnded}
                        controlsList="nodownload"
                        onContextMenu={(e) => e.preventDefault()}
                    />
                ) : (
                    <img
                        src={currentStory.media_url}
                        alt="Story"
                        className="w-full h-full object-cover transform scale-125"
                    />
                )}

                {/* User Info Overlay */}
                <div className="absolute top-8 left-4 z-30 flex items-center gap-2">
                    <img
                        src={avatarUrl}
                        alt={username}
                        className="w-8 h-8 rounded-full border border-white/50 object-cover"
                    />
                    <div className="flex flex-col">
                        <span className="text-white font-semibold text-sm drop-shadow-md">
                            {username}
                        </span>
                        <span className="text-white/60 text-xs shadow-black">
                            {timeAgo(currentStory.created_at)}
                        </span>
                    </div>
                </div>

                {/* Footer / Action */}
                <div className="absolute bottom-0 w-full p-8 flex justify-center pb-12 z-40 bg-gradient-to-t from-black/90 to-transparent">
                    <button
                        onClick={() => {
                            onClose();
                            // Navigate logic would be here, but simpler to use an anchor/Link if possible or just window.location for now if hook not passed
                            // Let's assume passed user object might help or parent handles.
                            // Better: Just use a styled link if router context exists.
                            window.location.href = `/profile/${storyUser.username || storyUser.id}`;
                        }}
                        className="px-6 py-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-white/90 text-sm font-medium hover:bg-white/20 transition-all"
                    >
                        Ver Perfil
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoryViewer;
