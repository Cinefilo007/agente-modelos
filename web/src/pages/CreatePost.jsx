import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X, Link as LinkIcon } from 'lucide-react';
import api from '../api/axios';

function CreatePost() {
    const navigate = useNavigate();
    const [mediaUrl, setMediaUrl] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [inputType, setInputType] = useState('url'); // 'file' or 'url'

    const handleSubmit = async () => {
        if (!mediaUrl) return;
        setLoading(true);
        try {
            await api.post('/content/posts', {
                media_url: mediaUrl,
                media_type: mediaUrl.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image', // Basic detection
                caption: description
            });
            navigate('/');
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Error al crear la publicación. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/10 bg-card/40 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-1 rounded-full transition-colors"><X size={24} /></button>
                    <h1 className="text-sm font-bold uppercase tracking-wider">Nueva Publicación</h1>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={!mediaUrl || loading}
                    className="text-white font-bold text-sm px-4 py-1.5 rounded-full bg-blue-600 disabled:opacity-50 disabled:bg-gray-700 transition-all font-sans"
                >
                    {loading ? 'Publicando...' : 'Compartir'}
                </button>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden max-w-md mx-auto w-full">
                {/* Image Area */}
                <div className="flex-1 flex flex-col justify-center min-h-0 mb-4">
                    <div className="w-full h-full max-h-[50vh] rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center relative overflow-hidden bg-black/50">
                        {mediaUrl ? (
                            <>
                                {mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                                    <video src={mediaUrl} className="w-full h-full object-contain" controls />
                                ) : (
                                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain" />
                                )}
                                <div className="absolute top-2 right-2">
                                    <button onClick={() => setMediaUrl('')} className="bg-black/50 p-1 rounded-full text-white"><X size={16} /></button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-center p-6 w-full">
                                <div className="mb-4">
                                    <ImagePlus size={48} className="text-gray-500 mb-2" />
                                </div>
                                <p className="text-sm text-gray-400 mb-4">Ingresa la URL de tu imagen o video</p>
                                <div className="flex items-center gap-2 w-full max-w-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                                    <LinkIcon size={16} className="text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        className="bg-transparent border-none text-sm w-full focus:outline-none text-white placeholder-gray-600"
                                        value={mediaUrl}
                                        onChange={(e) => setMediaUrl(e.target.value)}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-600 mt-2">
                                    Tip: Usa enlaces directos de imágenes (Unsplash, Imgur, etc.)
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Caption Area */}
                <div className="flex-none bg-card/20 rounded-xl p-3 border border-white/10 focus-within:border-white/30 transition-colors">
                    <textarea
                        placeholder="Escribe un pie de foto..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-transparent border-none text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-0 resize-none min-h-[80px]"
                    />
                </div>
            </div>
        </div>
    );
}

export default CreatePost;
