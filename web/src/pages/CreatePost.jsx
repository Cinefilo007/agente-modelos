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
    const [isEditingVideo, setIsEditingVideo] = useState(false);

    // Video Edit State
    const [videoDuration, setVideoDuration] = useState(0);
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(20);
    const [thumbnailTime, setThumbnailTime] = useState(0.1);

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));

            if (selectedFile.type.startsWith('video/')) {
                setIsEditingVideo(true);
                // Reset trim
                setTrimStart(0);
                setTrimEnd(20);
            }
        }
    };

    const handleVideoMetadata = (e) => {
        const duration = e.target.duration;
        setVideoDuration(duration);
        setTrimEnd(Math.min(duration, 20));
    };

    const handleSubmit = async () => {
        if (!file) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        if (description) {
            formData.append('caption', description);
        }

        // Add Video Editor Params
        if (file.type.startsWith('video/')) {
            formData.append('start_time', trimStart.toString());
            formData.append('end_time', trimEnd.toString());
            formData.append('thumbnail_time', thumbnailTime.toString());
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

            {/* VIDEO EDITOR OVERLAY */}
            {isEditingVideo && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in zoom-in duration-200">
                    <div className="px-4 py-4 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-xl">
                        <button onClick={() => { setIsEditingVideo(false); setFile(null); setPreviewUrl(null); }} className="text-gray-400 hover:text-white p-1">
                            <X size={24} />
                        </button>
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Editar Video</h2>
                        <button
                            onClick={() => setIsEditingVideo(false)}
                            className="bg-white text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition-colors"
                        >
                            Listo
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 bg-black">
                        {/* Video Preview */}
                        <div className="flex-1 relative flex items-center justify-center p-4 bg-black/50">
                            <video
                                ref={videoRef}
                                src={previewUrl}
                                onLoadedMetadata={handleVideoMetadata}
                                className="max-w-full max-h-full rounded-lg shadow-2xl"
                                playsInline
                                muted
                                loop
                            />

                            {/* Duration Indicator */}
                            <div className="absolute top-8 right-8 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                <span className={`text-xs font-bold ${(trimEnd - trimStart) > 20.1 ? 'text-red-500' : 'text-green-400'}`}>
                                    {(trimEnd - trimStart).toFixed(1)}s / 20s
                                </span>
                            </div>
                        </div>

                        {/* Controls Container */}
                        <div className="bg-[#111] p-6 space-y-8 rounded-t-3xl border-t border-white/10">
                            {/* Trim Sliders */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Recorte (Inicio - Fin)</span>
                                </div>
                                <div className="space-y-6">
                                    <div className="relative h-2 bg-white/10 rounded-full">
                                        <input
                                            type="range"
                                            min="0"
                                            max={videoDuration}
                                            step="0.1"
                                            value={trimStart}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setTrimStart(Math.min(val, trimEnd - 0.5));
                                                if (videoRef.current) videoRef.current.currentTime = val;
                                            }}
                                            className="absolute w-full h-full appearance-none bg-transparent cursor-pointer z-20 slider-thumb-pink"
                                        />
                                        <input
                                            type="range"
                                            min="0"
                                            max={videoDuration}
                                            step="0.1"
                                            value={trimEnd}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setTrimEnd(Math.max(val, trimStart + 0.5));
                                                if (videoRef.current) videoRef.current.currentTime = val;
                                            }}
                                            className="absolute w-full h-full appearance-none bg-transparent cursor-pointer z-10 slider-thumb-white"
                                        />
                                        <div
                                            className="absolute h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                                            style={{
                                                left: `${(trimStart / videoDuration) * 100}%`,
                                                width: `${((trimEnd - trimStart) / videoDuration) * 100}%`
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                                        <span>{trimStart.toFixed(1)}s</span>
                                        <span>{trimEnd.toFixed(1)}s</span>
                                    </div>
                                </div>
                            </div>

                            {/* Thumbnail Selector */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Elegir Miniatura</span>
                                    <span className="text-[10px] text-pink-500 font-bold">{thumbnailTime.toFixed(1)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min={trimStart}
                                    max={trimEnd}
                                    step="0.1"
                                    value={thumbnailTime}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setThumbnailTime(val);
                                        if (videoRef.current) {
                                            videoRef.current.currentTime = val;
                                            videoRef.current.pause();
                                        }
                                    }}
                                    className="w-full h-1.5 appearance-none bg-white/10 rounded-full cursor-pointer accent-pink-500"
                                />
                            </div>

                            {/* Info */}
                            {(trimEnd - trimStart) > 20.1 && (
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3">
                                    <div className="p-2 bg-red-500 rounded-lg"><X size={16} className="text-white" /></div>
                                    <p className="text-xs text-red-500 font-medium leading-tight">
                                        El video excede los 20 segundos permitidos. Por favor recórtalo más.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CreatePost;
