import React from 'react';
import { clsx } from 'clsx';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import { timeAgo } from '../../utils/date';

export function StoryCarousel({ stories, onOpenStory }) {
    const { themeColor } = useTheme();

    return (
        <div className="w-full overflow-x-auto no-scrollbar py-2 pl-4">
            <div className="flex gap-4">
                {/* Add Story Button */}
                <Link to="/create-story" className="flex flex-col items-center gap-1 min-w-[72px]">
                    <div className="w-[72px] h-[72px] rounded-full border border-white/10 flex items-center justify-center bg-white/5 relative hover:bg-white/10 transition-colors">
                        <span className="text-2xl text-white font-light">+</span>
                    </div>
                    <span className="text-xs text-gray-400 truncate w-full text-center">Añadir</span>
                </Link>

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
                            <div className="p-[2px] bg-black rounded-full">
                                <img
                                    src={story.media_url}
                                    alt="Story"
                                    className="w-[64px] h-[64px] rounded-full object-cover transition-transform group-hover:scale-95"
                                />
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
