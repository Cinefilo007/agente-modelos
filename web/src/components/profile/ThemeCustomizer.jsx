import React from 'react';
import { X, Palette } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeCustomizer({ user }) {
    const { themeColor, setThemeColor } = useTheme();

    // Paleta de colores Premium
    const colors = [
        '#e81cff', // Neon Purple/Magenta (Variante 2)
        '#38bdf8', // Neon Blue
        '#facc15', // Gold
        '#ec4899', // Pink
        '#10b981', // Emerald
    ];

    const closeCustomizer = () => {
        const dialog = document.getElementById('theme-customizer-modal');
        if (dialog) dialog.close();
    };

    return (
        <dialog id="theme-customizer-modal" className="bg-transparent m-auto backdrop:bg-black/80 backdrop:backdrop-blur-sm p-0 rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm">
            <div className="bg-card/90 backdrop-blur-3xl border border-white/20 p-6 rounded-3xl w-full text-foreground relative shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                <button
                    onClick={closeCustomizer}
                    className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={18} />
                </button>

                <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                    <Palette size={20} className="text-[var(--theme-glow)]" style={{ '--theme-glow': themeColor }} />
                    Personaliza tu Perfil
                </h2>

                <div className="mb-6">
                    <p className="text-sm text-foreground/70 font-medium mb-3">Color de Acento Premium</p>
                    <div className="flex gap-3 flex-wrap">
                        {colors.map(color => (
                            <button
                                key={color}
                                onClick={() => setThemeColor(color)}
                                className={`w-10 h-10 rounded-full transition-all duration-300 hover:scale-110 ${themeColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a]' : ''}`}
                                style={{
                                    backgroundColor: color,
                                    boxShadow: themeColor === color ? `0 0 15px ${color}` : 'none'
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className="mb-8">
                    <p className="text-sm text-foreground/70 font-medium mb-3">Estilo del Fondo</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button className="py-2.5 px-4 rounded-xl border border-[var(--theme-glow)] bg-[var(--theme-glow)]/10 text-white font-medium text-sm transition-colors" style={{ '--theme-glow': themeColor }}>
                            Glass Oscuro
                        </button>
                        <button className="py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 font-medium text-sm transition-colors">
                            Glass Claro
                        </button>
                    </div>
                </div>

                <button
                    onClick={closeCustomizer}
                    className="w-full py-3 rounded-xl font-bold text-white shadow-xl hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: themeColor, boxShadow: `0 4px 20px ${themeColor}40` }}
                >
                    Guardar Apariencia
                </button>
            </div>
        </dialog>
    );
}
