import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CreditCard, Image as ImageIcon, Download, Loader2, Zap, Info } from 'lucide-react';

const API_BASE = "http://localhost:8001";

function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [balance, setBalance] = useState({ balance: 0, currency: 'USD', estimated_cost_per_image: 0.035 });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/v1/auth/balance`);
      setBalance(res.data);
    } catch (err) {
      console.error("Error fetching balance", err);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/api/v1/nebula/generate`, { prompt });
      setResult(res.data.image_url);
      fetchBalance(); // Actualizar balance tras generar
    } catch (err) {
      setError("Error al generar la imagen. Revisa la consola o tu conexión con fal.ai.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Header / Nav */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-12 fade-in">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2 rounded-xl shadow-lg shadow-violet-500/20">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            NEBULA <span className="font-light text-violet-400">GENERATOR</span>
          </h1>
        </div>

        <div className="glass-card px-4 py-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold">${balance.balance?.toFixed(2)} {balance.currency}</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-500/10 rounded-full border border-violet-500/20">
            <Zap className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] uppercase font-bold text-violet-300">EST. ${balance.estimated_cost_per_image} / IMG</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Input Panel */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6 md:p-8 flex flex-col gap-6"
        >
          <div className="flex items-center gap-2 text-violet-400">
            <Zap className="w-5 h-5" />
            <h2 className="text-lg font-bold uppercase tracking-wider">Configuración de Modelo</h2>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
              Concepto de la Imagen
              <Info className="w-3 h-3 cursor-help" />
            </label>
            <textarea
              className="input-glass min-h-[160px] text-lg leading-relaxed placeholder:text-slate-600"
              placeholder="Ej: Una mujer hermosa caminando por un bosque neón, vestido de seda, estilo cinematográfico..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-zinc-400 text-sm italic">
            * Traducción automática activa. El sistema optimizará tu prompt para fotorrealismo extremo (Nebula V3 Photoreal Pro).
          </p>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className="premium-button w-full overflow-hidden shimmer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando en fal.ai...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generar Modelo Nebula
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </motion.div>

        {/* Right: Result Panel */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6 md:p-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden"
        >
          {!result && !loading && (
            <div className="text-center text-slate-500 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-violet-500/30 transition-all">
                <ImageIcon className="w-10 h-10 opacity-30" />
              </div>
              <p className="max-w-[200px] text-sm">Ingresa un concepto y genera el activo visual para tu plataforma.</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-violet-500 animate-pulse" />
              </div>
              <div className="space-y-2 text-center">
                <p className="text-lg font-bold text-white">Optimizando Realismo</p>
                <p className="text-sm text-slate-400 animate-pulse">Traduciendo y ajustando texturas de piel para V5.5...</p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {result && !loading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center gap-6"
              >
                <div className="relative group w-full max-w-[400px] aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <img 
                    src={result} 
                    alt="Nebula Result" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-6">
                    <a 
                      href={result} 
                      target="_blank" 
                      rel="noreferrer"
                      className="premium-button shadow-xl"
                    >
                      <Download className="w-4 h-4" />
                      Descargar HD
                    </a>
                  </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setResult(null)} className="text-xs text-slate-500 hover:text-white transition-colors">
                      Limpiar Lienzo
                    </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Background Decorative */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[80px] rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500/10 blur-[80px] rounded-full -ml-16 -mb-16" />
        </motion.div>
      </main>

      <footer className="mt-auto pt-12 pb-4 text-slate-600 text-[10px] uppercase tracking-widest font-bold">
        © 2026 NEBULA AI SYSTEM • LAB EXPERIMENTAL
      </footer>
      
      <style>{`
        /* Tailwind-like utilities since we are using Vanilla CSS + Inline for specific complex cases */
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .justify-center { justify-content: center; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .gap-8 { gap: 2rem; }
        .w-full { width: 100%; }
        .max-w-6xl { max-width: 72rem; }
        .max-w-px { max-width: 400px; }
        .mb-12 { margin-bottom: 3rem; }
        .p-4 { padding: 1rem; }
        .p-6 { padding: 1.5rem; }
        .p-8 { padding: 2rem; }
        .rounded-xl { border-radius: 0.75rem; }
        .rounded-full { border-radius: 9999px; }
        .text-sm { font-size: 0.875rem; }
        .text-lg { font-size: 1.125rem; }
        .font-bold { font-weight: 700; }
        .font-extrabold { font-weight: 800; }
        .grid { display: grid; }
        @media (min-width: 1024px) { .lg\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      `}</style>
    </div>
  );
}

export default App;
