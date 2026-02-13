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
    const [filmstrip, setFilmstrip] = useState([]);
    const [isDragging, setIsDragging] = useState(null); // 'start', 'end', or null

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

    const generateFilmstrip = async (video) => {
        const frames = [];
        const count = 10;
        const duration = video.duration;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 160;
        canvas.height = 90;

        for (let i = 0; i < count; i++) {
            const time = (duration / count) * i;
            video.currentTime = time;
            await new Promise(resolve => {
                const onSeek = () => {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    frames.push(canvas.toDataURL('image/jpeg', 0.5));
                    video.removeEventListener('seeked', onSeek);
                    resolve();
                };
                video.addEventListener('seeked', onSeek);
            });
        }
        setFilmstrip(frames);
    };

    const handleVideoMetadata = (e) => {
        const video = e.target;
        const duration = video.duration;
        setVideoDuration(duration);
        setTrimEnd(Math.min(duration, 20));
        generateFilmstrip(video);
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
                        <div className="flex-1 relative flex items-center justify-center p-4 bg-black/50 overflow-hidden">
                            <video
                                ref={videoRef}
                                src={previewUrl}
                                onLoadedMetadata={handleVideoMetadata}
                                className="max-w-full max-h-full rounded-lg shadow-2xl"
                                playsInline
                                webkit-playsinline="true"
                                muted
                                loop
                                preload="auto"
                            />

                            {/* Playback Progress Indicator (Vertical Line) */}
                            <div
                                className="absolute top-0 bottom-0 w-[2px] bg-white/70 z-30 transition-all duration-100 ease-linear pointer-events-none"
                                style={{
                                    left: videoRef.current ? `${(videoRef.current.currentTime / videoDuration) * 100}%` : '0%',
                                    opacity: isDragging ? 0 : 0.8
                                }}
                            />

                            {/* Duration Indicator */}
                            <div className="absolute top-8 right-8 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                <span className={`text-xs font-bold ${(trimEnd - trimStart) > 20.1 ? 'text-red-500' : 'text-yellow-400'}`}>
                                    {(trimEnd - trimStart).toFixed(1)}s / 20s
                                </span>
                            </div>
                        </div>

                        {/* Controls Container - Telegram Style */}
                        <div className="bg-[#111] p-6 pb-12 space-y-10 rounded-t-3xl border-t border-white/10">

                            {/* Filmstrip & Trimmer */}
                            <div className="relative pt-4">
                                <span className="absolute -top-4 left-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Recortar Video</span>

                                <div className="relative h-16 w-full bg-black/40 rounded-lg overflow-hidden flex select-none">
                                    {/* Filmstrip Background */}
                                    {filmstrip.length > 0 ? filmstrip.map((src, i) => (
                                        <img key={i} src={src} className="h-full flex-1 object-cover opacity-60 grayscale-[0.5] pointer-events-none" />
                                    )) : (
                                        <div className="flex-1 h-full bg-white/5 animate-pulse" />
                                    )}

                                    {/* Draggable Shrouds (Darkened areas outside selection) */}
                                    <div className="absolute top-0 left-0 h-full bg-black/60 z-10" style={{ width: `${(trimStart / videoDuration) * 100}%` }} />
                                    <div className="absolute top-0 right-0 h-full bg-black/60 z-10" style={{ width: `${(1 - trimEnd / videoDuration) * 100}%` }} />

                                    {/* Trim Box with Handles */}
                                    <div
                                        className="absolute top-0 h-full border-y-2 border-yellow-500 z-20 pointer-events-none transition-none"
                                        style={{
                                            left: `${(trimStart / videoDuration) * 100}%`,
                                            right: `${(1 - trimEnd / videoDuration) * 100}%`
                                        }}
                                    >
                                        {/* Start Handle */}
                                        <div
                                            className="absolute -left-1.5 top-0 h-full w-4 bg-yellow-500 cursor-ew-resize pointer-events-auto rounded-l-sm flex items-center justify-center p-[2px]"
                                            onMouseDown={() => setIsDragging('start')}
                                            onTouchStart={(e) => { e.preventDefault(); setIsDragging('start'); }}
                                        >
                                            <div className="w-[2px] h-4 bg-black/30 rounded-full" />
                                        </div>

                                        {/* End Handle */}
                                        <div
                                            className="absolute -right-1.5 top-0 h-full w-4 bg-yellow-500 cursor-ew-resize pointer-events-auto rounded-r-sm flex items-center justify-center p-[2px]"
                                            onMouseDown={() => setIsDragging('end')}
                                            onTouchStart={(e) => { e.preventDefault(); setIsDragging('end'); }}
                                        >
                                            <div className="w-[2px] h-4 bg-black/30 rounded-full" />
                                        </div>
                                    </div>

                                    {/* Interaction Overlay */}
                                    <div
                                        className="absolute inset-0 z-30"
                                        onMouseMove={(e) => {
                                            if (!isDragging) return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const pos = (e.clientX - rect.left) / rect.width;
                                            const time = Math.max(0, Math.min(videoDuration, pos * videoDuration));

                                            if (isDragging === 'start') {
                                                setTrimStart(Math.min(time, trimEnd - 0.5));
                                                if (videoRef.current) videoRef.current.currentTime = time;
                                            } else if (isDragging === 'end') {
                                                setTrimEnd(Math.max(time, trimStart + 0.5));
                                                if (videoRef.current) videoRef.current.currentTime = time;
                                            }
                                        }}
                                        onMouseUp={() => setIsDragging(null)}
                                        onMouseLeave={() => setIsDragging(null)}
                                        onTouchMove={(e) => {
                                            if (!isDragging) return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const touch = e.touches[0];
                                            const pos = (touch.clientX - rect.left) / rect.width;
                                            const time = Math.max(0, Math.min(videoDuration, pos * videoDuration));

                                            if (isDragging === 'start') {
                                                setTrimStart(Math.min(time, trimEnd - 0.5));
                                                if (videoRef.current) videoRef.current.currentTime = time;
                                            } else if (isDragging === 'end') {
                                                setTrimEnd(Math.max(time, trimStart + 0.5));
                                                if (videoRef.current) videoRef.current.currentTime = time;
                                            }
                                        }}
                                        onTouchEnd={() => setIsDragging(null)}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
                                    <span>{trimStart.toFixed(1)}s</span>
                                    <span>Fin en {trimEnd.toFixed(1)}s</span>
                                </div>
                            </div>

                            {/* Thumbnail Selector Slider */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Miniatúra Portada</span>
                                    <span className="text-[10px] text-yellow-500 font-bold">{thumbnailTime.toFixed(1)}s</span>
                                </div>
                                <div className="relative h-6 flex items-center">
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
                                        className="w-full h-1.5 appearance-none bg-white/10 rounded-full cursor-pointer accent-yellow-500"
                                    />
                                </div>
                            </div>

                            {/* Error Notification */}
                            {(trimEnd - trimStart) > 20.1 && (
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3">
                                    <div className="p-2 bg-red-500 rounded-lg"><X size={16} className="text-white" /></div>
                                    <p className="text-[11px] text-red-500 font-medium leading-tight">
                                        Duración excedida. Telegram permite hasta 20 segundos por post.
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
