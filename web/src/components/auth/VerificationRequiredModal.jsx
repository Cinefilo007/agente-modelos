import React from 'react';
import { X, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export function VerificationRequiredModal({ isOpen, onClose }) {
  const { themeColor } = useTheme();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-[#1a161f]/95 border border-white/10 backdrop-blur-2xl rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-[80px]" />

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 ring-1 ring-primary/30 relative">
            <ShieldAlert size={40} className="text-primary animate-pulse" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-[#1a161f]">
                 <Sparkles size={12} className="text-black" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-white mb-4 tracking-tighter uppercase leading-tight">
            Verificación <span className="text-primary italic">Requerida</span>
          </h2>

          <div className="space-y-4 mb-10">
            <p className="text-gray-400 text-sm leading-relaxed px-2">
              Tu perfil está en <span className="text-white font-bold">Modo Curiosidad</span>. Actualmente es invisible para los clientes.
            </p>
            
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-left space-y-3">
                <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                        <X size={12} className="text-red-500" />
                    </div>
                    <span className="text-[11px] text-gray-300 font-medium uppercase tracking-wider">Publicaciones bloqueadas</span>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                        <X size={12} className="text-red-500" />
                    </div>
                    <span className="text-[11px] text-gray-300 font-medium uppercase tracking-wider">Servicios inactivos</span>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                        <UserCheck size={12} className="text-green-500" />
                    </div>
                    <span className="text-[11px] text-gray-300 font-medium uppercase tracking-wider">Edición de perfil permitida</span>
                </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => {
                  onClose ? onClose() : null;
                  navigate('/onboarding');
                }}
                className="w-full py-5 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.2em]"
                style={{ backgroundColor: themeColor }}
              >
                Completar Verificación
              </button>
              
              <button
                onClick={() => {
                  onClose ? onClose() : null;
                  navigate('/');
                }}
                className="w-full py-4 bg-white/5 text-gray-400 font-bold rounded-2xl hover:bg-white/10 transition-all text-[10px] uppercase tracking-widest border border-white/5"
              >
                Explorar Feed General
              </button>
          </div>
        </div>

        <p className="mt-8 text-[9px] text-gray-600 uppercase tracking-[0.3em] font-black italic">
          Nebula Space • Agency Security
        </p>
      </div>
    </div>
  );
}
