import React, { useState } from 'react';
import {
    Instagram, Twitter, Facebook, Youtube, Globe,
    Linkedin, Github, Twitch, Music2, Star, Link as LinkIcon,
    Plus, Trash2, X
} from 'lucide-react';

const AVAILABLE_ICONS = [
    { id: 'instagram', icon: Instagram, label: 'Instagram', color: 'text-pink-500' },
    { id: 'twitter', icon: Twitter, label: 'Twitter / X', color: 'text-blue-400' },
    { id: 'facebook', icon: Facebook, label: 'Facebook', color: 'text-blue-600' },
    { id: 'tiktok', icon: Music2, label: 'TikTok', color: 'text-black dark:text-white' }, // Fallback
    { id: 'youtube', icon: Youtube, label: 'YouTube', color: 'text-red-500' },
    { id: 'twitch', icon: Twitch, label: 'Twitch', color: 'text-purple-500' },
    { id: 'onlyfans', icon: Star, label: 'OnlyFans', color: 'text-blue-400' }, // Fallback
    { id: 'website', icon: Globe, label: 'Website', color: 'text-green-500' },
    { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'text-blue-700' },
    { id: 'github', icon: Github, label: 'GitHub', color: 'text-gray-800 dark:text-white' },
    { id: 'other', icon: LinkIcon, label: 'Otro', color: 'text-gray-500' },
];

export function SocialLinkEditor({ links = [], onChange }) {
    const [isSelectorOpen, setIsSelectorOpen] = useState(null); // Index of row opening selector

    const handleAddLink = () => {
        if (links.length >= 5) return;
        onChange([...links, { network: 'website', url: '', icon: 'website' }]);
    };

    const handleRemoveLink = (index) => {
        const newLinks = [...links];
        newLinks.splice(index, 1);
        onChange(newLinks);
    };

    const handleUpdateLink = (index, field, value) => {
        const newLinks = [...links];
        newLinks[index] = { ...newLinks[index], [field]: value };
        onChange(newLinks);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Redes Sociales</h3>
                <span className="text-xs text-[var(--text-secondary)]">{links.length}/5</span>
            </div>

            <div className="space-y-3">
                {links.map((link, index) => {
                    const SelectedIconObj = AVAILABLE_ICONS.find(i => i.id === link.network) || AVAILABLE_ICONS.find(i => i.id === 'other');
                    const SelectedIcon = SelectedIconObj.icon;

                    return (
                        <div key={index} className="flex items-center gap-2 group relative">
                            {/* Icon Selector Button */}
                            <button
                                type="button"
                                onClick={() => setIsSelectorOpen(isSelectorOpen === index ? null : index)}
                                className="w-10 h-10 rounded-lg bg-[var(--card-bg)] border border-[var(--glass-border)] flex items-center justify-center hover:bg-[var(--glass-border)] transition-colors flex-shrink-0"
                            >
                                <SelectedIcon size={20} className={SelectedIconObj.color} />
                            </button>

                            {/* Icon Selector Dropdown */}
                            {isSelectorOpen === index && (
                                <div className="absolute top-12 left-0 z-50 bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl shadow-xl p-2 grid grid-cols-4 gap-2 w-64 backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                                    <div className="col-span-4 flex justify-between items-center px-2 pb-2 mb-2 border-b border-[var(--glass-border)]">
                                        <span className="text-xs font-bold text-[var(--text-secondary)]">Selecciona Icono</span>
                                        <button onClick={() => setIsSelectorOpen(null)}><X size={14} /></button>
                                    </div>
                                    {AVAILABLE_ICONS.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                handleUpdateLink(index, 'network', item.id);
                                                setIsSelectorOpen(null);
                                            }}
                                            className={`p-2 rounded-lg flex flex-col items-center gap-1 hover:bg-white/10 transition-colors ${link.network === item.id ? 'bg-white/10 ring-1 ring-white/20' : ''}`}
                                            title={item.label}
                                        >
                                            <item.icon size={20} className={item.color} />
                                            {/* <span className="text-[9px] truncate w-full text-center opacity-70">{item.label}</span> */}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* URL Input */}
                            <input
                                type="text"
                                placeholder="https://..."
                                value={link.url}
                                onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                                className="flex-1 bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-lg p-2 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)]/50 focus:outline-none transition-colors min-w-0"
                            />

                            {/* Remove Button */}
                            <button
                                type="button"
                                onClick={() => handleRemoveLink(index)}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {links.length < 5 && (
                <button
                    type="button"
                    onClick={handleAddLink}
                    className="w-full py-2 border border-dashed border-[var(--glass-border)] rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/30 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={16} />
                    Agregar Red Social
                </button>
            )}
        </div>
    );
}
