import React from 'react';
import { clsx } from 'clsx';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import { timeAgo } from '../../utils/date';
import { useAuth } from '../../context/AuthContext';

export function StoryCarousel({ stories, onOpenStory }) {
    const { user } = useAuth();
    const isModel = user?.role === 'model';

    return (
        <div className="w-full overflow-x-auto no-scrollbar py-2 pl-4">
            <div className="flex gap-4">
                {/* Add Story Button (Models only) */}
                {isModel && (
                    <Link to="/create-story" className="flex flex-col items-center gap-1 min-w-[72px]">
                        <div className="w-[72px] h-[72px] rounded-full border border-white/10 flex items-center justify-center bg-white/5 relative hover:bg-white/10 transition-colors">
                            <span className="text-2xl text-white font-light">+</span>
                        </div>
                        <span className="text-xs text-gray-400 truncate w-full text-center">Añadir</span>
                    </Link>
                )}

                {stories.map((story) => (
                    <button
                        key={story.id}
                        onClick={() => onOpenStory(story)}
                        className="flex flex-col items-center gap-1 min-w-[72px] group"
                    >
                        <div
                            className="p-[2px] rounded-full"
                            style={{
                                background: story.viewed
                                    ? '#374151'
                                    : `linear-gradient(45deg, #F59E0B, ${themeColor})`
                            }}
                        >
                            <div className="p-[2px] bg-black rounded-full w-[64px] h-[64px] overflow-hidden">
                                {story.media_type === 'video' || story.media_url.endsWith('.mp4') ? (
                                    <video
                                        src={story.media_url + "#t=0.1"} // Try to get 1st frame
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110 transform scale-125"
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <img
                                        src={story.media_url}
                                        alt="Story"
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110 transform scale-125"
                                    />
                                )}
                            </div>
                        </div>
                        <span className="text-xs text-gray-300 truncate w-full text-center">
                            {timeAgo(story.created_at)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
