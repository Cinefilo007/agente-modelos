import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Camera, Image as ImageIcon, Loader, X } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { SocialLinkEditor } from '../components/profile/SocialLinkEditor';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

function EditProfile() {
    const { user, login } = useAuth(); // login used to update context if needed, though usually profile fetch is separate
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        username: '',
        bio_short: '',
        social_links: [], // Array of { network, url, icon }
        services: [], // Array de tags
        services_text: '', // String para el input en curso
        cover_url: '',
        avatar_url: ''
    });

    // Fetch initial data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await api.get('/profile/me');

                let links = data.social_links;
                // Ensure links is an array
                if (!Array.isArray(links)) {
                    if (links && typeof links === 'object') {
                        // Convert legacy object { network: url } to array
                        links = Object.keys(links).map(key => ({
                            network: key,
                            url: links[key],
                            icon: key // default icon key
                        }));
                    } else {
                        links = [];
                    }
                }

                setFormData({
                    full_name: data.full_name || '',
                    artistic_name: data.artistic_name || '',
                    username: data.username || '',
                    bio_short: data.bio_short || '',
                    social_links: links,
                    services: data.services || [],
                    services_text: '',
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

    const handleImageUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        // Optimistic preview
        const previewUrl = URL.createObjectURL(file);
        setFormData(prev => ({
            ...prev,
            [type === 'avatar' ? 'avatar_url' : 'cover_url']: previewUrl
        }));

        // Upload to serve
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('type', type);

        try {
            const { data } = await api.post('/profile/upload-image', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Update with real URL
            setFormData(prev => ({
                ...prev,
                [type === 'avatar' ? 'avatar_url' : 'cover_url']: data.url
            }));
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            showToast(`Error al subir imagen de ${type}`, "error");
            // Revert preview? or just keep it and let user try again? 
            // For now, let's just alert.
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data } = await api.put('/profile/me', {
                bio_short: formData.bio_short,
                social_links: formData.social_links,
                services: [...(formData.services || []), ...(formData.services_text ? formData.services_text.split(',').map(s => s.trim()).filter(Boolean) : [])],
                artistic_name: formData.artistic_name,
                avatar_url: formData.avatar_url,
                cover_url: formData.cover_url
            });
            console.log("Profile updated:", data);
            navigate(`/profile/${formData.username || user.username}`);
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast("Error al actualizar el perfil", "error");
        } finally {
            setSaving(false);
        }
    };

    const removeService = (index) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.filter((_, i) => i !== index)
        }));
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

                {/* Images */}
                <div className="space-y-4">
                    <div className="relative h-32 w-full rounded-xl overflow-hidden bg-[var(--card-bg)] border-2 border-dashed border-[var(--glass-border)] flex items-center justify-center group cursor-pointer" onClick={() => document.getElementById('coverInput').click()}>
                        {formData.cover_url ? (
                            <img src={formData.cover_url} className="w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity" />
                        ) : null}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center text-[var(--text-secondary)]">
                                <ImageIcon size={24} />
                                <span className="text-xs mt-1 font-bold">Cambiar Portada</span>
                            </div>
                        </div>
                        <input
                            id="coverInput"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, 'cover')}
                        />
                    </div>

                    <div className="flex justify-center -mt-12 relative z-10">
                        <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatarInput').click()}>
                            <Avatar
                                src={formData.avatar_url}
                                name={formData.artistic_name || formData.full_name || formData.username}
                                size="xl"
                                className="ring-4 ring-[var(--card-bg)] transition-shadow group-hover:opacity-80"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full">
                                <Camera size={20} className="text-white" />
                            </div>
                            <button type="button" className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full text-white border-2 border-[var(--card-bg)] z-20">
                                <Camera size={16} />
                            </button>
                            <input
                                id="avatarInput"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, 'avatar')}
                            />
                        </div>
                    </div>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                    {/* Read Only Fields (Identity) */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Nombre Completo (Solo Admin)</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            disabled
                            className="w-full bg-[var(--card-bg)]/50 border border-[var(--glass-border)] rounded-xl p-3 text-[var(--text-secondary)] cursor-not-allowed opacity-70"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Nombre de Usuario (No editable)</label>
                        <input
                            type="text"
                            value={formData.username}
                            disabled
                            className="w-full bg-[var(--card-bg)]/50 border border-[var(--glass-border)] rounded-xl p-3 text-[var(--text-secondary)] cursor-not-allowed opacity-70"
                        />
                    </div>

                    {/* Editable Fields */}
                    <div>
                        <label className="block text-xs font-bold text-pink-500 mb-1 uppercase">Nombre Artístico (Público)</label>
                        <input
                            type="text"
                            value={formData.artistic_name}
                            onChange={(e) => setFormData({ ...formData, artistic_name: e.target.value })}
                            className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl p-3 text-[var(--text-primary)] focus:border-pink-500/50 focus:outline-none transition-colors font-bold"
                            placeholder="Tu nombre visible para los fans"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Biografía</label>
                        <textarea
                            value={formData.bio_short}
                            onChange={(e) => setFormData({ ...formData, bio_short: e.target.value })}
                            className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--text-primary)]/50 focus:outline-none transition-colors min-h-[100px]"
                            placeholder="Cuéntanos sobre ti..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Etiquetas de Servicios</label>
                        <div className="bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl p-2 transition-colors focus-within:border-[var(--text-primary)]/50 min-h-[50px] flex flex-wrap gap-2 items-center">
                            {(formData.services || []).map((service, idx) => (
                                <span key={idx} className="bg-[var(--theme-glow)] text-white text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1.5 font-semibold shadow-sm">
                                    {service}
                                    <button type="button" onClick={() => removeService(idx)} className="hover:text-red-300 transition-colors">
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                            <input
                                type="text"
                                value={formData.services_text}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.includes(',')) {
                                        const newTags = val.split(',').map(s => s.trim()).filter(Boolean);
                                        if (newTags.length > 0) {
                                            setFormData(prev => ({
                                                ...prev,
                                                services: [...(prev.services || []), ...newTags],
                                                services_text: ''
                                            }));
                                        } else {
                                            setFormData(prev => ({ ...prev, services_text: '' }));
                                        }
                                    } else {
                                        setFormData(prev => ({ ...prev, services_text: val }));
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = formData.services_text.trim();
                                        if (val) {
                                            setFormData(prev => ({
                                                ...prev,
                                                services: [...(prev.services || []), val],
                                                services_text: ''
                                            }));
                                        }
                                    }
                                }}
                                className="flex-1 bg-transparent min-w-[120px] text-[var(--text-primary)] focus:outline-none text-sm p-1"
                                placeholder={formData.services?.length === 0 ? "Ej. GFE, VIP Chat (escribe una coma para agregar)" : "Añadir más..."}
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Escribe un servicio y usa una coma (,) o Enter para agregarlo.</p>
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
