import React, { useState, useEffect } from 'react';
import { Send, ExternalLink } from 'lucide-react';

/**
 * Carrusel auto-rotativo de banners para la página de Promociones.
 * Muestra el banner del bot SFS y (si el usuario no es modelo) el banner de upsell.
 * Cambia automáticamente cada 5 segundos con transición suave.
 */
const BannerCarousel = ({ sfsUser }) => {
    const [activeSlide, setActiveSlide] = useState(0);

    // Construir slides dinámicamente
    const slides = [
        // Slide 1: Prepara tu post
        {
            id: 'bot',
            content: (
                <div className="bg-card/40 border border-white/5 rounded-2xl p-4 flex gap-3 items-start">
                    <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-400 shrink-0">
                        <Send className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground text-sm">Prepara tu post primero</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                            Reenvíale tu mejor foto/video con emojis a{' '}
                            <span className="font-bold text-foreground">@Nebula_sfs_bot</span> en Telegram.
                        </p>
                        <a href="https://t.me/Nebula_sfs_bot" target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300">
                            Ir al Bot @Nebula_sfs_bot 👉
                        </a>
                    </div>
                </div>
            )
        }
    ];

    // Slide 2: Upsell solo si NO es modelo
    if (sfsUser && !sfsUser.is_agency_model) {
        slides.push({
            id: 'upsell',
            content: (
                <div className="relative overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 opacity-90" />
                    <div className="absolute inset-0 opacity-50"
                        style={{
                            backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2eiIvPjwvZz48L2c+PC9zdmc+")`
                        }}
                    />
                    <div className="relative p-4 flex gap-3 items-center">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                            <span className="text-2xl">🔥</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-white text-sm leading-tight">¿Lista para escalar tus ventas?</h4>
                            <p className="text-[11px] text-white/80 mt-0.5 leading-relaxed">
                                Vende nuestro feed al estilo Instagram usando IA. <i className="block mt-1 font-semibold opacity-90">"Sola eres una estrella, juntas somos Nebula."</i>
                            </p>
                            <a href="https://agente-modelos-production.up.railway.app/landing" target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-white text-purple-700 rounded-lg text-[11px] font-black hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-black/20">
                                Aplica Ahora <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>
            )
        });
    }

    // Auto-play solo si hay más de 1 slide
    useEffect(() => {
        if (slides.length <= 1) return;
        const interval = setInterval(() => {
            setActiveSlide(prev => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [slides.length]);

    // Si solo hay un slide, renderizar directamente
    if (slides.length === 1) {
        return <div className="mb-5 tour-step-4">{slides[0].content}</div>;
    }

    return (
        <div className="mb-5 tour-step-4">
            {/* Contenedor del carrusel */}
            <div className="relative overflow-hidden rounded-2xl">
                <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                >
                    {slides.map((slide) => (
                        <div key={slide.id} className="w-full shrink-0">
                            {slide.content}
                        </div>
                    ))}
                </div>
            </div>

            {/* Dots de navegación */}
            <div className="flex justify-center gap-1.5 mt-2.5">
                {slides.map((slide, i) => (
                    <button
                        key={slide.id}
                        onClick={() => setActiveSlide(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${activeSlide === i
                            ? 'w-6 bg-purple-400'
                            : 'w-1.5 bg-white/20 hover:bg-white/40'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default BannerCarousel;
