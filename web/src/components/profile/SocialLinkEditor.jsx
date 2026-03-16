import React, { useState } from 'react';
import {
    Globe, Linkedin, Github, Link as LinkIcon,
    Plus, Trash2, X, Diamond
} from 'lucide-react';
import {
    SiInstagram, SiX, SiFacebook, SiYoutube,
    SiTiktok, SiTwitch, SiOnlyfans, SiPatreon
} from '@icons-pack/react-simple-icons';

const AVAILABLE_ICONS = [
    { id: 'instagram', icon: SiInstagram, label: 'Instagram', color: '#E1306C' },
    { id: 'twitter', icon: SiX, label: 'X (Twitter)', color: '#000000' }, // o text-white segun tema
    { id: 'facebook', icon: SiFacebook, label: 'Facebook', color: '#1877F2' },
    { id: 'tiktok', icon: SiTiktok, label: 'TikTok', color: '#000000' },
    { id: 'youtube', icon: SiYoutube, label: 'YouTube', color: '#FF0000' },
    { id: 'twitch', icon: SiTwitch, label: 'Twitch', color: '#9146FF' },
    { id: 'onlyfans', icon: SiOnlyfans, label: 'OnlyFans', color: '#00AFF0' },
    { id: 'fansly', icon: Diamond, label: 'Fansly', color: '#00AEF0' },
    { id: 'patreon', icon: SiPatreon, label: 'Patreon', color: '#FF424D' },
    { id: 'website', icon: Globe, label: 'Website', color: '#10B981' }, // Default color for globe
    { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: '#0A66C2' },
    { id: 'github', icon: Github, label: 'GitHub', color: '#333333' },
    { id: 'other', icon: LinkIcon, label: 'Otro', color: '#6B7280' },
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
                                <SelectedIcon size={20} color={SelectedIconObj.id === 'tiktok' || SelectedIconObj.id === 'twitter' || SelectedIconObj.id === 'github' ? 'currentColor' : SelectedIconObj.color} className={SelectedIconObj.id === 'tiktok' || SelectedIconObj.id === 'twitter' || SelectedIconObj.id === 'github' ? 'text-[var(--text-primary)]' : ''} />
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
                                            <item.icon size={20} color={item.id === 'tiktok' || item.id === 'twitter' || item.id === 'github' ? 'currentColor' : item.color} className={item.id === 'tiktok' || item.id === 'twitter' || item.id === 'github' ? 'text-[var(--text-primary)]' : ''} />
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
