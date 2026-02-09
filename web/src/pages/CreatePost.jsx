import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { Button } from '../components/ui/Button';

function CreatePost() {
    const navigate = useNavigate();
    const [image, setImage] = useState(null);
    const [description, setDescription] = useState('');

    // Simulate file selection
    const handleImageClick = () => {
        // In real app, trigger native file input
        // For demo, we just set a fake preview
        setImage('https://images.unsplash.com/photo-1542206395-9feb3edaa68d?q=80&w=1000&auto=format&fit=crop');
    };

    const handleSubmit = () => {
        console.log("Creating post...", { image, description });
        navigate('/');
    };

    return (
        <div className="h-full flex flex-col bg-transparent">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--glass-border)] bg-[var(--card-bg)]/40 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-[var(--text-primary)] hover:bg-[var(--glass-border)] p-1 rounded-full transition-colors"><X size={24} /></button>
                    <h1 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Nueva Publicación</h1>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={!image}
                    className="text-white font-bold text-sm px-4 py-1.5 rounded-full bg-blue-600 disabled:opacity-50 disabled:bg-gray-500 transition-all font-sans"
                >
                    Compartir
                </button>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                {/* Image Area - Compact & Centered */}
                <div className="flex-1 flex flex-col justify-center min-h-0 mb-4">
                    <div
                        onClick={handleImageClick}
                        className={`
                            w-full h-full max-h-[50vh] rounded-xl border border-dashed border-[var(--glass-border)] 
                            flex flex-col items-center justify-center cursor-pointer 
                            hover:bg-[var(--glass-border)] transition-all duration-300 relative overflow-hidden group
                            ${image ? 'border-none p-0 bg-black' : ''}
                        `}
                    >
                        {image ? (
                            <>
                                <img src={image} alt="Preview" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-white font-medium text-sm flex items-center gap-2">
                                        <ImagePlus size={18} /> Cambiar archivo
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-center p-6 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 rounded-full bg-[var(--glass-border)] flex items-center justify-center mb-4 border border-[var(--glass-border)]">
                                    <ImagePlus size={32} className="text-[var(--text-secondary)]" />

                                </div>
                                <span className="font-bold text-[var(--text-primary)] mb-1">Toca para añadir foto o video</span>
                                <p className="text-[10px] text-[var(--text-secondary)] max-w-[200px] leading-tight">
                                    Soporta imágenes (JPG, PNG) y videos (MP4) de alta calidad.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Caption Area */}
                <div className="flex-none bg-[var(--card-bg)]/50 rounded-xl p-3 border border-[var(--glass-border)] focus-within:border-[var(--text-secondary)] transition-colors">
                    <textarea
                        placeholder="Escribe un pie de foto..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-transparent border-none text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)] focus:ring-0 resize-none min-h-[80px]"
                    />
                </div>

                {/* Legal / Info Text */}
                <div className="flex-none mt-3 px-1">
                    <p className="text-[10px] text-[var(--text-secondary)] text-center leading-relaxed">
                        Max 30MB • Video max 30s • El contenido debe cumplir con nuestras normas de comunidad.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default CreatePost;
