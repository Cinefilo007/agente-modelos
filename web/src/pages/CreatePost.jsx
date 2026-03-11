import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X, Loader, Play, Pause, Link, Calendar, Plus, Trash2, Clock, Sparkles } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import clsx from 'clsx';
import { AIPhotoEditor } from '../components/ai/AIPhotoEditor';

function CreatePost() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEditingVideo, setIsEditingVideo] = useState(false);
    const { showToast } = useToast();
    const [links, setLinks] = useState([]); // { label: '', url: '' }
    const [newLink, setNewLink] = useState({ label: '', url: '' });
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [showLinkPanel, setShowLinkPanel] = useState(false);
    const [showAIEditor, setShowAIEditor] = useState(false);

    // Video Edit State
    const [videoDuration, setVideoDuration] = useState(0);
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(20);
    const [thumbnailTime, setThumbnailTime] = useState(0.1);
    const [filmstrip, setFilmstrip] = useState([]);
    const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isDragging, setIsDragging] = useState(null); // 'start', 'end', or null

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const mainVideoRef = useRef(null);
    const canvasRef = useRef(null);

    const getVideoDuration = (file) => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            const handleResolved = (duration) => {
                resolve(duration);
                URL.revokeObjectURL(video.src);
            };

            video.onloadedmetadata = () => {
                if (video.duration === Math.pow(10, 1000) || video.duration === Infinity || isNaN(video.duration)) {
                    video.currentTime = 1e101;
                    video.ontimeupdate = () => {
                        video.ontimeupdate = null;
                        handleResolved(video.duration);
                    };
                } else {
                    handleResolved(video.duration);
                }
            };
            video.onerror = () => handleResolved(0);

            video.src = URL.createObjectURL(file);
        });
    };

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));

            if (selectedFile.type.startsWith('video/')) {
                setIsEditingVideo(true);
                setTrimStart(0);
                setTrimEnd(20);
                setVideoDuration(0);

                // Forzar lectura de la duración exacta para arreglar bugs de Safari/iOS
                const duration = await getVideoDuration(selectedFile);
                if (duration > 0 && duration !== Infinity && !isNaN(duration)) {
                    setVideoDuration(duration);
                    setTrimEnd(Math.min(duration, 20));
                }
            }
        }
    };

    const generateFilmstrip = async (videoSrc, knownDuration) => {
        setIsGeneratingFrames(true);
        const frames = [];
        const count = 10;

        // Create hidden video element for extraction
        const video = document.createElement('video');
        video.src = videoSrc;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';

        await new Promise(resolve => {
            video.onloadeddata = () => resolve();
            video.onerror = () => resolve();
            video.load();
        });

        const duration = knownDuration || video.duration || 0;
        if (duration === 0 || duration === Infinity || isNaN(duration)) {
            setIsGeneratingFrames(false);
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = 160;
        canvas.height = 90;

        for (let i = 0; i < count; i++) {
            const time = (duration / count) * i;
            video.currentTime = time;

            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        video.removeEventListener('seeked', onSeek);
                        resolve(); // Skip this frame if it takes too long
                    }, 2000);

                    const onSeek = () => {
                        clearTimeout(timeout);
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        frames.push(canvas.toDataURL('image/jpeg', 0.6));
                        video.removeEventListener('seeked', onSeek);
                        resolve();
                    };
                    video.addEventListener('seeked', onSeek);
                    video.load(); // Some browsers need load() or play() to trigger seek on invisible elements
                });
            } catch (e) {
                console.warn("Failed to capture frame at", time);
            }
        }
        setFilmstrip(frames);
        setIsGeneratingFrames(false);
    };

    useEffect(() => {
        if (isEditingVideo && videoRef.current) {
            videoRef.current.load();
        }
    }, [isEditingVideo]);

    const handleVideoMetadata = (e) => {
        const video = e.target;
        const duration = video.duration;

        if (!duration || isNaN(duration) || duration === Infinity || duration < 0.1) {
            if (video.duration === Infinity || isNaN(video.duration)) {
                video.currentTime = 1e101; // Workaround Safari
            }
            return;
        }

        setVideoDuration(prev => {
            if (!prev || Math.abs(prev - duration) > 0.5) return duration;
            return prev;
        });

        setTrimEnd(prev => {
            if (prev === 20 || prev === 0 || prev > duration) return Math.min(duration, 20);
            // Fix iOS clamp bug: if trim was clamped to the old incorrect short duration, expand it now
            if (videoDuration > 0 && Math.abs(prev - videoDuration) < 0.5 && duration > videoDuration) {
                return Math.min(duration, 20);
            }
            return prev;
        });

        if (previewUrl && filmstrip.length === 0 && !isGeneratingFrames) {
            generateFilmstrip(previewUrl, duration);
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
    };

    const handleTimeUpdate = (e) => {
        const time = e.target.currentTime;
        setCurrentTime(time);

        // Loop within trimmed range
        if (time >= trimEnd) {
            e.target.currentTime = trimStart;
        } else if (time < trimStart) {
            e.target.currentTime = trimStart;
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

        // Add Video Editor Params
        if (file.type.startsWith('video/')) {
            formData.append('start_time', trimStart.toString());
            formData.append('end_time', trimEnd.toString());
            formData.append('thumbnail_time', thumbnailTime.toString());
        }

        // Add New Features: Links and Scheduling
        if (links.length > 0) {
            formData.append('external_links', JSON.stringify(links));
        }
        if (isScheduling && scheduledAt) {
            formData.append('scheduled_at', scheduledAt);
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
            showToast("Error al crear la publicación. Intenta de nuevo.", "error");
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
                                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                                        <video
                                            ref={mainVideoRef}
                                            src={previewUrl}
                                            className="w-full h-full object-contain"
                                            playsInline
                                            disablePictureInPicture
                                            controlsList="nodownload nofullscreen"
                                            onLoadedData={(e) => {
                                                e.target.currentTime = trimStart;
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (mainVideoRef.current.paused) {
                                                    mainVideoRef.current.play();
                                                    setIsPreviewPlaying(true);
                                                } else {
                                                    mainVideoRef.current.pause();
                                                    setIsPreviewPlaying(false);
                                                }
                                            }}
                                            onTimeUpdate={(e) => {
                                                if (e.target.currentTime >= trimEnd) {
                                                    e.target.currentTime = trimStart;
                                                    e.target.pause();
                                                    setIsPreviewPlaying(false);
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (mainVideoRef.current.paused) {
                                                    mainVideoRef.current.play();
                                                    setIsPreviewPlaying(true);
                                                } else {
                                                    mainVideoRef.current.pause();
                                                    setIsPreviewPlaying(false);
                                                }
                                            }}
                                            className={`absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity z-40 ${isPreviewPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}
                                        >
                                            <div className="p-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                                                {isPreviewPlaying ? <Pause size={24} className="text-white fill-white" /> : <Play size={24} className="text-white fill-white ml-1" />}
                                            </div>
                                        </button>
                                    </div>
                                ) : (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                )}
                                <div className="absolute top-2 right-2 flex gap-2">
                                    {!file.type.startsWith('video/') && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowAIEditor(true);
                                            }}
                                            className="bg-blue-600/80 backdrop-blur-md p-2 rounded-full text-white hover:bg-blue-600 transition-colors shadow-lg"
                                            title="Editar con IA"
                                        >
                                            <Sparkles size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                            setPreviewUrl(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                        className="bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition-colors"
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

                {/* --- NUEVAS MEJORAS: LINKS Y PROGRAMACIÓN --- */}
                <div className="mt-6 space-y-4 pb-20">
                    {/* Botones de Acción Rápidos */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowLinkPanel(!showLinkPanel)}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all active:scale-95",
                                links.length > 0 || showLinkPanel ? "bg-blue-600/20 border-blue-500/50 text-blue-400" : "bg-white/5 border-white/10 text-gray-400"
                            )}
                        >
                            <Link size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">
                                {links.length > 0 ? `${links.length} Links` : 'Añadir Links'}
                            </span>
                        </button>
                        <button
                            onClick={() => setIsScheduling(!isScheduling)}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all active:scale-95",
                                isScheduling ? "bg-purple-600/20 border-purple-500/50 text-purple-400" : "bg-white/5 border-white/10 text-gray-400"
                            )}
                        >
                            <Calendar size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">
                                {isScheduling ? 'Programado' : 'Programar'}
                            </span>
                        </button>
                    </div>

                    {/* Panel de Links */}
                    {showLinkPanel && (
                        <div className="bg-card/40 border border-white/10 rounded-2xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Gestionar Enlaces</h3>
                                <button onClick={() => setShowLinkPanel(false)}><X size={14} className="text-gray-500" /></button>
                            </div>

                            {/* Lista de Links Actuales */}
                            {links.map((lnk, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{lnk.label}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{lnk.url}</p>
                                    </div>
                                    <button
                                        onClick={() => setLinks(links.filter((_, i) => i !== idx))}
                                        className="text-red-400 p-2 hover:bg-red-400/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}

                            {/* Formulario Nuevo Link */}
                            <div className="space-y-3 pt-2 border-t border-white/5">
                                <input
                                    type="text"
                                    placeholder="Nombre del botón (ej: Mi Web)"
                                    value={newLink.label}
                                    onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="URL (https://...)"
                                        value={newLink.url}
                                        onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                    <button
                                        onClick={() => {
                                            if (newLink.label && newLink.url) {
                                                setLinks([...links, newLink]);
                                                setNewLink({ label: '', url: '' });
                                            }
                                        }}
                                        className="bg-blue-600 p-2.5 rounded-xl text-white hover:bg-blue-500 active:scale-90 transition-all shadow-lg shadow-blue-600/20"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Panel de Programación */}
                    {isScheduling && (
                        <div className="bg-card/40 border border-purple-500/30 rounded-2xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
                                    <Clock size={20} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xs font-bold text-white">Publicación Programada</h3>
                                    <p className="text-[10px] text-gray-500">¿Cuándo quieres que se publique?</p>
                                </div>
                            </div>
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)} // Min 5 min from now
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 accent-purple-500 color-scheme-dark"
                            />
                            {scheduledAt && (
                                <p className="text-[10px] text-purple-400 bg-purple-400/10 p-2 rounded-lg border border-purple-400/20 animate-pulse">
                                    El post se publicará automáticamente en la fecha seleccionada.
                                </p>
                            )}
                        </div>
                    )}
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
                                onDurationChange={handleVideoMetadata}
                                onTimeUpdate={handleTimeUpdate}
                                className="max-w-full max-h-full rounded-lg shadow-2xl"
                                playsInline
                                webkit-playsinline="true"
                                autoPlay
                                loop
                                preload="auto"
                                onClick={togglePlay}
                                onCanPlay={() => {
                                    if (!isMetadataReady) handleVideoMetadata({ target: videoRef.current });
                                }}
                            />

                            {/* Play/Pause Button Overlay */}
                            <button
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                className={`absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity z-40 ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}
                            >
                                <div className="p-5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl scale-125">
                                    {isPlaying ? <Pause size={32} className="text-white fill-white" /> : <Play size={32} className="text-white fill-white ml-1" />}
                                </div>
                            </button>

                            {/* Playback Progress Indicator (Vertical Line) */}
                            <div
                                className="absolute top-0 bottom-0 w-[2px] bg-white/70 z-30 transition-all duration-100 ease-linear pointer-events-none"
                                style={{
                                    left: (videoRef.current && videoDuration > 0) ? `${(videoRef.current.currentTime / videoDuration) * 100}%` : '0%',
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

                                <div
                                    className="relative h-16 w-full bg-black/40 rounded-lg overflow-hidden flex select-none touch-none"
                                    onMouseMove={(e) => {
                                        if (!isDragging || !videoDuration || videoDuration <= 0) return;
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
                                        if (!isDragging || !videoDuration || videoDuration <= 0) return;
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
                                >
                                    {/* Filmstrip Background */}
                                    {filmstrip.length > 0 ? (
                                        filmstrip.map((src, i) => (
                                            <img key={i} src={src} className="h-full flex-1 object-cover opacity-60 grayscale-[0.5] pointer-events-none" />
                                        ))
                                    ) : (
                                        <div className="flex-1 h-full bg-white/5 flex items-center justify-center pointer-events-none">
                                            {isGeneratingFrames ? <Loader size={20} className="animate-spin text-white/20" /> : <div className="h-full w-full" />}
                                        </div>
                                    )}

                                    {/* Draggable Shrouds (Darkened areas outside selection) */}
                                    <div className="absolute top-0 left-0 h-full bg-black/70 z-10 pointer-events-none" style={{ width: `${videoDuration > 0 ? (trimStart / videoDuration) * 100 : 0}%` }} />
                                    <div className="absolute top-0 right-0 h-full bg-black/70 z-10 pointer-events-none" style={{ width: `${videoDuration > 0 ? Math.max(0, (1 - trimEnd / videoDuration) * 100) : 0}%` }} />

                                    {/* Trim Box with Handles */}
                                    <div
                                        className="absolute top-0 h-full border-y-2 border-yellow-500 z-20 pointer-events-none transition-none"
                                        style={{
                                            left: `${videoDuration > 0 ? (trimStart / videoDuration) * 100 : 0}%`,
                                            width: `${videoDuration > 0 ? ((trimEnd - trimStart) / videoDuration) * 100 : 100}%`
                                        }}
                                    >
                                        {/* Start Handle */}
                                        <div
                                            className="absolute -left-3 top-[-4px] bottom-[-4px] w-6 bg-yellow-500 cursor-ew-resize pointer-events-auto rounded-l-md flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)] z-30 touch-none"
                                            onMouseDown={(e) => { e.stopPropagation(); setIsDragging('start'); }}
                                            onTouchStart={(e) => { e.stopPropagation(); setIsDragging('start'); }}
                                        >
                                            <div className="w-[3px] h-6 bg-black/40 rounded-full" />
                                        </div>

                                        {/* End Handle */}
                                        <div
                                            className="absolute -right-3 top-[-4px] bottom-[-4px] w-6 bg-yellow-500 cursor-ew-resize pointer-events-auto rounded-r-md flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)] z-30 touch-none"
                                            onMouseDown={(e) => { e.stopPropagation(); setIsDragging('end'); }}
                                            onTouchStart={(e) => { e.stopPropagation(); setIsDragging('end'); }}
                                        >
                                            <div className="w-[3px] h-6 bg-black/40 rounded-full" />
                                        </div>
                                    </div>
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
                                        max={videoDuration || 20}
                                        step="0.1"
                                        value={thumbnailTime}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setThumbnailTime(val);
                                            if (videoRef.current) {
                                                videoRef.current.currentTime = val;
                                                videoRef.current.pause();
                                                setIsPlaying(false);
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
            {/* AI EDITOR MODAL */}
            {showAIEditor && file && (
                <AIPhotoEditor
                    originalImage={file}
                    onClose={() => setShowAIEditor(false)}
                    onApply={(newFile, newPreview) => {
                        setFile(newFile);
                        setPreviewUrl(newPreview);
                    }}
                />
            )}
        </div>
    );
}

export default CreatePost;
