import React, { useState } from 'react';
import { Sparkles, Image as ImageIcon, Palmtree, Shovel, Wand2, Loader2, Check, X, RefreshCw, AlertCircle, Download, Coins } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export function AIPhotoEditor({ originalImage, onApply, onClose }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedImage, setProcessedImage] = useState(null);
    const [activeTab, setActiveTab] = useState('touchup'); // 'touchup' or 'background'
    const [bgPrompt, setBgPrompt] = useState('playa paradisíaca al atardecer, estilo cine');
    const [originalUrl, setOriginalUrl] = useState(null);
    const [imageError, setImageError] = useState(false);
    const { showToast } = useToast();
    const { themeColor } = useTheme();
    const { user, updateUser } = useAuth();

    // Gestionar la URL de la imagen original (File vs String)
    React.useEffect(() => {
        if (!originalImage) return;

        if (typeof originalImage === 'string') {
            setOriginalUrl(originalImage);
        } else if (originalImage instanceof File || originalImage instanceof Blob) {
            const url = URL.createObjectURL(originalImage);
            setOriginalUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [originalImage]);

    const handleAction = async (type) => {
        setIsProcessing(true);
        setImageError(false);
        try {
            // originalImage es un File si viene de CreatePost
            const formData = new FormData();
            formData.append('image', originalImage);

            let endpoint = '/ai-editor/touch-up';
            if (type === 'background') {
                endpoint = '/ai-editor/change-background';
                formData.append('background_prompt', bgPrompt);
            }

            const response = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setProcessedImage(response.data.processed_url);
            if (response.data.new_balance !== undefined) {
                updateUser({ credits_balance: response.data.new_balance });
            }
            showToast("Imagen procesada con éxito", "success");
        } catch (error) {
            console.error("Error processing AI image:", error);
            showToast(error.response?.data?.detail || "Error al procesar la imagen", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const predefinedBackgrounds = [
        { label: 'Playa', prompt: 'playa paradisíaca, arena blanca, palmeras, mar turquesa, luz dorada al atardecer' },
        { label: 'Lujo', prompt: 'apartamento de lujo en dubai, ventanales grandes, ciudad de noche, diseño minimalista moderno' },
        { label: 'Estudio', prompt: 'estudio profesional de fotografía, fondo gris suave, iluminación de estudio de alta gama, softboxes' },
        { label: 'Naturaleza', prompt: 'bosque encantado brillante, rayos de sol a través de las hojas, verde vibrante, mágico' },
        { label: 'Urbano', prompt: 'calle de nueva york de noche, luces de neón desenfocadas, estilo cyberpunk, lluvia ligera' },
        { label: 'Mansión', prompt: 'piscina infinita en una mansión de miami, palmeras, cielo azul despejado, sol brillante' },
        { label: 'Cama', prompt: 'cama king size con sábanas de seda blanca, habitación lujosa de hotel de 5 estrellas, luz de mañana tenue' },
        { label: 'Abstracto', prompt: 'fondo abstracto con luces led moradas y rosadas, humo sutil, ambiente de club nocturno premium' }
    ];

    return (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <Button variant="ghost" className="p-2" onClick={onClose}><X size={24} /></Button>
                <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-400" />
                    Editor IA
                </h2>
                <div className="flex items-center gap-1.5 bg-yellow-400/10 px-3 py-1.5 rounded-full border border-yellow-400/20">
                    <Coins size={14} className="text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400">{user?.credits_balance || 0}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 max-w-2xl mx-auto w-full">
                {/* Visualizer */}
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl">
                    {!processedImage ? (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            {originalUrl ? (
                                <img
                                    src={originalUrl}
                                    alt="Original"
                                    className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${imageError ? 'opacity-0' : 'opacity-100'}`}
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-500">
                                    <ImageIcon size={48} className="opacity-20" />
                                    <p className="text-xs">Cargando imagen...</p>
                                </div>
                            )}
                            
                            {imageError && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-400 p-6 text-center">
                                    <AlertCircle size={32} />
                                    <p className="text-xs font-bold uppercase">Error al cargar el preview</p>
                                    <p className="text-[10px] opacity-60">Intenta subir la imagen de nuevo</p>
                                </div>
                            )}
                            <div className="absolute top-4 left-4 px-2 py-1 bg-black/50 backdrop-blur-md rounded-md text-[10px] uppercase font-bold text-gray-400">Original</div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <img
                                src={processedImage}
                                alt="Procesada"
                                className="max-w-full max-h-full object-contain animate-in zoom-in duration-500"
                            />
                            <div
                                className="absolute top-4 left-4 px-2 py-1 backdrop-blur-md rounded-md text-[10px] uppercase font-bold text-white shadow-lg"
                                style={{ backgroundColor: themeColor }}
                            >Resultado IA</div>
                            <button
                                onClick={() => setProcessedImage(null)}
                                className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/70 hover:text-white"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
                            <div className="relative">
                                <Loader2 size={48} className="text-yellow-400 animate-spin" />
                                <Sparkles size={20} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-sm font-medium animate-pulse">La IA está trabajando en tu belleza...</p>
                        </div>
                    )}
                </div>

                {/* Controls Area */}
                {!processedImage && !isProcessing && (
                    <div className="space-y-6">
                        {/* Tabs */}
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                            <button
                                onClick={() => setActiveTab('touchup')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'touchup' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                            >
                                <Shovel size={16} /> Retoque
                            </button>
                            <button
                                onClick={() => setActiveTab('background')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'background' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                            >
                                <Palmtree size={16} /> Fondo
                            </button>
                        </div>

                        {activeTab === 'touchup' && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-2">
                                <div className="p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-xl flex gap-3">
                                    <AlertCircle size={20} className="text-yellow-400 shrink-0" />
                                    <p className="text-xs text-yellow-400/90 leading-relaxed font-medium">
                                        Esta opción eliminará imperfecciones, estrías y manchas automáticamente usando retoque profesional.
                                    </p>
                                </div>
                                <Button
                                    className="w-full py-4 rounded-2xl text-base"
                                    onClick={() => handleAction('touchup')}
                                >
                                    <Wand2 size={20} /> Aplicar Retoque Mágico (1 Crédito)
                                </Button>
                            </div>
                        )}

                        {activeTab === 'background' && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-2 gap-2">
                                    {predefinedBackgrounds.map((bg) => (
                                        <button
                                            key={bg.label}
                                            onClick={() => setBgPrompt(bg.prompt)}
                                            className={`p-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${bgPrompt === bg.prompt ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : 'border-white/10 bg-white/5 text-gray-400'}`}
                                        >
                                            {bg.label}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400/50 resize-none h-20"
                                    placeholder="Describe tu fondo ideal..."
                                    value={bgPrompt}
                                    onChange={(e) => setBgPrompt(e.target.value)}
                                />
                                <Button
                                    className="w-full py-4 rounded-2xl text-base"
                                    onClick={() => handleAction('background')}
                                >
                                    <Sparkles size={20} /> Cambiar Fondo con IA (2 Créditos)
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Apply Result */}
                {processedImage && !isProcessing && (
                    <div className="space-y-3 pt-4 animate-in fade-in duration-500">
                        <Button
                            className="w-full py-4 rounded-2xl text-base"
                            onClick={async () => {
                                try {
                                    const response = await fetch(processedImage);
                                    const blob = await response.blob();
                                    const file = new File([blob], "ai_edited.jpg", { type: "image/jpeg" });
                                    onApply(file, processedImage);
                                    onClose();
                                } catch (e) {
                                    showToast("Error al procesar la imagen final", "error");
                                }
                            }}
                        >
                            <Check size={20} /> Usar esta foto para mi post
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="secondary"
                                className="w-full py-3 text-sm flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10"
                                onClick={async () => {
                                    try {
                                        const response = await fetch(processedImage);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.style.display = 'none';
                                        a.href = url;
                                        a.download = `ai_edit_${Date.now()}.jpg`;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        showToast("Descarga iniciada", "success");
                                    } catch (e) {
                                        showToast("Error al descargar la imagen", "error");
                                    }
                                }}
                            >
                                <Download size={16} /> Descargar Foto
                            </Button>
                            <Button
                                variant="secondary"
                                className="w-full py-3 text-sm flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10"
                                onClick={() => setProcessedImage(null)}
                            >
                                <RefreshCw size={16} /> Volver a editar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
