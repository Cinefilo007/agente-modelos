import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X, Loader } from 'lucide-react';
import api from '../api/axios';

function CreatePost() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [description, setDescription] = useState('');
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
        if (description) {
            formData.append('caption', description);
        }

        try {
            await api.post('/content/posts', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
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
                    disabled={!file || loading}
                    className="text-white font-bold text-sm px-4 py-1.5 rounded-full bg-blue-600 disabled:opacity-50 disabled:bg-gray-700 transition-all font-sans flex items-center gap-2"
                >
                    {loading && <Loader size={12} className="animate-spin" />}
                    {loading ? 'Subiendo...' : 'Compartir'}
                </button>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden max-w-md mx-auto w-full">
                {/* Image Area */}
                <div className="flex-1 flex flex-col justify-center min-h-0 mb-4">
                    <div
                        className={`w-full h-full max-h-[50vh] rounded-xl border-2 border-dashed ${file ? 'border-transparent' : 'border-white/20'} flex flex-col items-center justify-center relative overflow-hidden bg-black/50 transition-all`}
                        onClick={() => !file && fileInputRef.current?.click()}
                    >
                        {file ? (
                            <>
                                {file.type.startsWith('video/') ? (
                                    <video src={previewUrl} className="w-full h-full object-contain" controls />
                                ) : (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                )}
                                <div className="absolute top-2 right-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                            setPreviewUrl(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                        className="bg-black/50 p-1 rounded-full text-white hover:bg-black/70"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-center p-6 w-full cursor-pointer hover:bg-white/5 transition-colors h-full justify-center">
                                <div className="mb-4 p-4 bg-white/10 rounded-full">
                                    <ImagePlus size={32} className="text-white/70" />
                                </div>
                                <p className="text-sm text-gray-300 font-medium">Toca para seleccionar foto o video</p>
                                <p className="text-xs text-gray-500 mt-2">Soporta JPG, PNG, MP4</p>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,video/*"
                        />
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
