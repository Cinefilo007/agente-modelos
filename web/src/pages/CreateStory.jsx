import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ImagePlus, Link as LinkIcon, Clock } from 'lucide-react';
import api from '../api/axios';

function CreateStory() {
    const navigate = useNavigate();
    const [mediaUrl, setMediaUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!mediaUrl) return;
        setLoading(true);
        try {
            await api.post('/content/stories', {
                media_url: mediaUrl,
                media_type: mediaUrl.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image'
            });
            navigate('/');
        } catch (error) {
            console.error("Error creating story:", error);
            alert("Error al crear la historia.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-black text-white">
            {/* Header */}
            <div className="absolute top-0 left-0 w-full z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={() => navigate(-1)} className="p-2 bg-black/20 rounded-full backdrop-blur-md">
                    <X size={24} />
                </button>
                <span className="font-bold text-sm tracking-widest uppercase">Nueva Historia</span>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {mediaUrl ? (
                    <div className="relative w-full h-full">
                        {mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                            <video src={mediaUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                        ) : (
                            <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                        )}

                        {/* Remove Button */}
                        <button
                            onClick={() => setMediaUrl('')}
                            className="absolute top-20 right-4 p-2 bg-black/50 rounded-full text-white/80 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        {/* Post Button (Floating) */}
                        <div className="absolute bottom-10 inset-x-0 flex justify-center">
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full font-bold shadow-lg transform active:scale-95 transition-all flex items-center gap-2"
                            >
                                {loading ? 'Subiendo...' : 'Publicar Historia'}
                                <Clock size={18} className="text-white/80" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-6 p-8 w-full max-w-md animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                            <ImagePlus size={40} className="text-white/50" />
                        </div>

                        <div className="w-full">
                            <label className="text-xs text-gray-400 mb-2 block text-center">URL de la imagen o video (9:16 recomendado)</label>
                            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-3">
                                <LinkIcon size={18} className="text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="https://"
                                    className="bg-transparent border-none w-full focus:outline-none text-white text-sm"
                                    value={mediaUrl}
                                    onChange={(e) => setMediaUrl(e.target.value)}
                                />
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 text-center max-w-xs">
                            Tu historia será visible por 24 horas para todos tus seguidores.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CreateStory;
