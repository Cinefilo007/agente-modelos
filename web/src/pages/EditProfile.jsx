import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';

function EditProfile() {
    const { user } = useAuth(); // In real app, we would have a 'updateUser' function
    const navigate = useNavigate();

    // Local state for form
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        bio: user?.bio || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate API update
        console.log("Updating profile:", formData);
        navigate('/profile');
    };

    return (
        <div className="min-h-screen bg-transparent pb-10">
            {/* Header */}
            <div className="p-4 flex items-center gap-4 bg-[var(--card-bg)]/80 backdrop-blur-md border-b border-[var(--glass-border)] sticky top-0 z-10 transition-colors">
                <button onClick={() => navigate(-1)} className="text-[var(--text-primary)]"><ArrowLeft /></button>
                <h1 className="text-lg font-bold text-[var(--text-primary)]">Editar Perfil</h1>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-6">

                {/* Images */}
                <div className="space-y-4">
                    <div className="relative h-32 w-full rounded-xl overflow-hidden bg-[var(--card-bg)] border-2 border-dashed border-[var(--glass-border)] flex items-center justify-center group cursor-pointer">
                        {user?.cover ? (
                            <img src={user.cover} className="w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity" />
                        ) : null}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center text-[var(--text-secondary)]">
                                <ImageIcon size={24} />
                                <span className="text-xs mt-1 font-bold">Cambiar Portada</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center -mt-12 relative z-10">
                        <div className="relative">
                            <Avatar src={user?.avatar} size="xl" className="ring-4 ring-[var(--card-bg)] transition-shadow" />
                            <button type="button" className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full text-white border-2 border-[var(--card-bg)]">
                                <Camera size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Nombre Completo</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--text-primary)]/50 focus:outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Nombre de Usuario</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--text-primary)]/50 focus:outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Biografía</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--text-primary)]/50 focus:outline-none transition-colors min-h-[100px]"
                        />
                    </div>

                    {/* Social Links Section */}
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2 border-t border-[var(--glass-border)] pt-4">
                            Redes Sociales
                        </h3>
                        <div className="space-y-3">
                            {['instagram', 'twitter', 'onlyfans', 'website'].map((platform) => (
                                <div key={platform} className="flex items-center gap-2">
                                    <div className="w-8 flex justify-center text-[var(--text-secondary)]">
                                        {/* Simple Icon Mapping */}
                                        {platform === 'instagram' && '📸'}
                                        {platform === 'twitter' && '🐦'}
                                        {platform === 'onlyfans' && '🔒'}
                                        {platform === 'website' && '🌐'}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                                        value={formData.socials?.[platform] || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            socials: { ...formData.socials, [platform]: e.target.value }
                                        })}
                                        className="flex-1 bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-lg p-2 text-xs text-[var(--text-primary)] focus:border-[var(--text-primary)]/50 focus:outline-none transition-colors"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <Button variant="primary" className="w-full py-3 rounded-xl mt-8">
                    Guardar Cambios
                </Button>

            </form>
        </div>
    );
}

export default EditProfile;
