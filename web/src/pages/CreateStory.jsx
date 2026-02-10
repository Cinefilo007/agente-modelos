import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ImagePlus, Clock, Loader } from 'lucide-react';
import api from '../api/axios';

function CreateStory() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleSubmit = async () => {
        if (!file) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post('/content/stories', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
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
            <div className="absolute top-0 left-0 w-full z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <button onClick={() => navigate(-1)} className="p-2 bg-black/20 rounded-full backdrop-blur-md pointer-events-auto">
                    <X size={24} />
                </button>
                <span className="font-bold text-sm tracking-widest uppercase text-shadow">Nueva Historia</span>
                <div className="w-10"></div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full">
                {file ? (
                    <div className="relative w-full h-full">
                        {file.type.startsWith('video/') ? (
                            <video src={previewUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                        ) : (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        )}

                        {/* Remove Button */}
                        <button
                            onClick={() => {
                                setFile(null);
                                setPreviewUrl(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="absolute top-20 right-4 p-2 bg-black/50 rounded-full text-white/80 hover:text-white pointer-events-auto z-20"
                        >
                            <X size={20} />
                        </button>

                        {/* Post Button (Floating) */}
                        <div className="absolute bottom-10 inset-x-0 flex justify-center z-20 pointer-events-auto">
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full font-bold shadow-lg transform active:scale-95 transition-all flex items-center gap-2"
                            >
                                {loading && <Loader size={18} className="animate-spin" />}
                                {loading ? 'Subiendo...' : 'Publicar Historia'}
                                {!loading && <Clock size={18} className="text-white/80" />}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div
                        className="flex flex-col items-center gap-6 p-8 w-full max-w-md animate-in fade-in zoom-in duration-300 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors">
                            <ImagePlus size={40} className="text-white/50" />
                        </div>

                        <div className="text-center">
                            <h3 className="text-xl font-bold mb-2">Crear Historia</h3>
                            <p className="text-sm text-gray-400 max-w-xs mx-auto">
                                Comparte momentos efímeros. Desaparecen en 24 horas.
                            </p>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,video/*"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default CreateStory;
