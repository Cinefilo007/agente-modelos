import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Camera, Image as ImageIcon, Loader } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { SocialLinkEditor } from '../components/profile/SocialLinkEditor';
import api from '../api/axios';

function EditProfile() {
    const { user, login } = useAuth(); // login used to update context if needed, though usually profile fetch is separate
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        username: '',
        bio_short: '',
        social_links: [], // Array of { network, url, icon }
        cover_url: '',
        avatar_url: ''
    });

    // Fetch initial data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await api.get('/profile/me');
                setFormData({
                    full_name: data.full_name || '',
                    username: data.username || '',
                    bio_short: data.bio_short || '',
                    social_links: data.social_links || [],
                    cover_url: data.cover_url || '',
                    avatar_url: data.avatar_url || ''
                });
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data } = await api.put('/profile/me', {
                bio_short: formData.bio_short,
                social_links: formData.social_links,
                // cover_url and avatar_url would be updated via separate upload handlers usually, 
                // but if we support URL input, we pass them. For now, assuming they are just read/kept.
                // If we want to support text updates for them:
                // cover_url: formData.cover_url,
                // avatar_url: formData.avatar_url
            });
            console.log("Profile updated:", data);
            navigate(`/profile/${formData.username || user.username}`);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Error al actualizar el perfil");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader className="animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent pb-10">
            {/* Header */}
            <div className="p-4 flex items-center gap-4 bg-[var(--card-bg)]/80 backdrop-blur-md border-b border-[var(--glass-border)] sticky top-0 z-10 transition-colors">
                <button onClick={() => navigate(-1)} className="text-[var(--text-primary)]"><ArrowLeft /></button>
                <h1 className="text-lg font-bold text-[var(--text-primary)]">Editar Perfil</h1>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-6">

                {/* Images (Visual only for now, upload logic separate ideally) */}
                <div className="space-y-4">
                    <div className="relative h-32 w-full rounded-xl overflow-hidden bg-[var(--card-bg)] border-2 border-dashed border-[var(--glass-border)] flex items-center justify-center group cursor-pointer">
                        {formData.cover_url ? (
                            <img src={formData.cover_url} className="w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity" />
                        ) : null}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center text-[var(--text-secondary)]">
                                <ImageIcon size={24} />
                                <span className="text-xs mt-1 font-bold">Cambiar Portada (Próximamente)</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center -mt-12 relative z-10">
                        <div className="relative">
                            <Avatar src={formData.avatar_url} size="xl" className="ring-4 ring-[var(--card-bg)] transition-shadow" />
                            <button type="button" className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full text-white border-2 border-[var(--card-bg)]">
                                <Camera size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                    {/* Read Only Fields (Identity) */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Nombre Completo (No editable)</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            disabled
                            className="w-full bg-[var(--card-bg)]/50 border border-[var(--glass-border)] rounded-xl p-3 text-[var(--text-secondary)] cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Nombre de Usuario (No editable)</label>
                        <input
                            type="text"
                            value={formData.username}
                            disabled
                            className="w-full bg-[var(--card-bg)]/50 border border-[var(--glass-border)] rounded-xl p-3 text-[var(--text-secondary)] cursor-not-allowed"
                        />
                    </div>

                    {/* Editable Fields */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Biografía</label>
                        <textarea
                            value={formData.bio_short}
                            onChange={(e) => setFormData({ ...formData, bio_short: e.target.value })}
                            className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--text-primary)]/50 focus:outline-none transition-colors min-h-[100px]"
                            placeholder="Cuéntanos sobre ti..."
                        />
                    </div>

                    {/* Social Links Section */}
                    <div className="bg-[var(--card-bg)]/30 p-4 rounded-xl border border-[var(--glass-border)]">
                        <SocialLinkEditor
                            links={formData.social_links}
                            onChange={(newLinks) => setFormData({ ...formData, social_links: newLinks })}
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    className="w-full py-3 rounded-xl mt-8 font-bold tracking-wide"
                    disabled={saving}
                >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>

            </form>
        </div>
    );
}

export default EditProfile;
