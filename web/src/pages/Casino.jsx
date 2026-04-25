import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Roulette } from '../components/casino/Roulette';
import { SlotMachine } from '../components/casino/SlotMachine';
import { Loader, ArrowLeft, Coins, Trophy, History, Gamepad2, Sparkles } from 'lucide-react';

function Casino() {
    const { username } = useParams();
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const { showToast } = useToast();
    const { themeColor } = useTheme();

    const [model, setModel] = useState(null);
    const [prizes, setPrizes] = useState([]);
    const [prices, setPrices] = useState({ roulette: 10, slots: 10 });
    const [loading, setLoading] = useState(true);
    const [activeGame, setActiveGame] = useState('roulette');
    const [betting, setBetting] = useState(false);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const meRes = await api.get('/profile/me');
                updateUser(meRes.data);

                const modelRes = await api.get(`/profile/${username}`);
                setModel(modelRes.data);

                const prizesRes = await api.get(`/casino/model/${modelRes.data.id}/prizes`);
                setPrizes(prizesRes.data);

                try {
                    const settingsRes = await api.get(`/casino/model/${modelRes.data.id}/settings`);
                    const settingsMap = {};
                    settingsRes.data.forEach(s => {
                        settingsMap[s.game_slug] = s.spin_price;
                    });
                    setPrices(prev => ({ ...prev, ...settingsMap }));
                } catch (e) {
                    console.log("Using default prices");
                }

                const historyRes = await api.get('/casino/my-bets');
                setHistory(historyRes.data);
            } catch (err) {
                console.error("Error loading casino:", err);
                showToast("No se pudo cargar el casino.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [username]);

    const handleGameFinished = async (won) => {
        if (!result) return;

        if (result.new_balance !== undefined) {
            updateUser({ wallet_balance: result.new_balance });
        }

        const historyRes = await api.get('/casino/my-bets');
        setHistory(historyRes.data);

        if (won) {
            showToast(`¡FELICIDADES! Ganaste: ${result.prize}`, "success");
        } else {
            showToast("Más suerte la próxima vez", "info");
        }
        setBetting(false);
    };

    const handleSpin = async () => {
        if (betting) return;
        setBetting(true);
        setResult(null);

        try {
            const spinCost = prices[activeGame] || 10;
            const { data } = await api.post('/casino/play', {
                model_id: model.id,
                game_slug: activeGame,
                bet_amount: spinCost
            });

            setResult(data);

        } catch (err) {
            console.error("Error playing:", err);
            showToast(err.response?.data?.detail || "Error al jugar", "error");
            setBetting(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-black">
            <Loader className="animate-spin text-purple-500" size={48} />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#080511] text-white pb-20 relative overflow-hidden">
            {/* Premium Animated Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]"></div>
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                     style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
                </div>
            </div>

            <div className="relative z-10">
                <div className="p-4 flex items-center justify-between sticky top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/5">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/5 active:scale-95 transition-transform">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight">Casino de {model?.artistic_name || model?.username}</h1>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
                        <Coins size={16} className="text-yellow-400" />
                        <span className="text-sm font-bold">{user?.wallet_balance || 0}</span>
                    </div>
                </div>

                <div className="max-w-md mx-auto px-4 pt-4">
                    <div className="flex gap-2 mb-8 p-1.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                        <button
                            onClick={() => { setActiveGame('roulette'); setResult(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.2em] ${activeGame === 'roulette' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/50'}`}
                        >
                            <Sparkles size={14} /> <span>Ruleta</span>
                        </button>
                        {/* Slots ocultos temporalmente */}
                        {/* 
                        <button
                            onClick={() => { setActiveGame('slots'); setResult(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.2em] ${activeGame === 'slots' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/50'}`}
                        >
                            <Gamepad2 size={14} /> <span>Slots</span>
                        </button>
                        */}
                    </div>

                    {activeGame === 'roulette' && (
                        <div className="text-center mb-10">
                            <div className="inline-block relative">
                                <h1 className="text-2xl font-black italic tracking-tighter uppercase mb-2" style={{ textShadow: `0 0 20px ${themeColor}` }}>
                                    Roulette of Fortune
                                </h1>
                                <div className="h-1 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent blur-sm"></div>
                            </div>
                            <p className="text-white/40 text-[11px] font-medium tracking-widest uppercase mt-4">Apuesta {prices.roulette} créditos • Gana premios exclusivos</p>
                        </div>
                    )}

                    <div className="mb-14 flex justify-center py-6">
                        {activeGame === 'roulette' ? (
                            <Roulette
                                prizes={prizes}
                                onSpin={handleSpin}
                                isSpinning={betting}
                                result={result}
                                themeColor={themeColor}
                                onFinished={handleGameFinished}
                            />
                        ) : (
                            <SlotMachine
                                onSpin={handleSpin}
                                isSpinning={betting}
                                result={result}
                                themeColor={themeColor}
                                onFinished={handleGameFinished}
                            />
                        )}
                    </div>

                    <div className="grid gap-6">
                        {activeGame === 'slots' && (
                            <div className="bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-xl bg-yellow-500/10">
                                        <Trophy size={20} className="text-yellow-500" />
                                    </div>
                                    <h2 className="text-xs font-black uppercase tracking-[0.15em] text-white/80">Tabla de Pagos (Tragamonedas)</h2>
                                </div>
                                <div className="grid gap-3">
                                    {prizes.map((prize, idx) => {
                                        // Map index to a consistent "winning" symbol for the UI
                                        const symbols = ['7️⃣', '💎', '⭐', '🍒', '🔔', '🍋', '🍀', '🔥'];
                                        const winSymbol = symbols[idx % symbols.length];
                                        return (
                                            <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1 text-lg">
                                                        <span>{winSymbol}</span>
                                                        <span>{winSymbol}</span>
                                                        <span>{winSymbol}</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-white/80">{prize.prize_name}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-white/20 tracking-widest">{(prize.probability * 100).toFixed(0)}%</span>
                                            </div>
                                        );
                                    })}
                                    {prizes.length === 0 && <p className="text-xs text-center text-white/30 py-4 italic">No hay combinaciones configuradas.</p>}
                                </div>
                            </div>
                        )}

                        <div className="bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-xl bg-blue-500/10">
                                    <History size={20} className="text-blue-500" />
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-white/80">Historial Reciente</h2>
                            </div>
                            <div className="space-y-4">
                                {history.slice(0, 5).map((bet, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[11px] p-3 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-white/40 font-medium">{new Date(bet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className={`font-bold tracking-tight ${bet.outcome_json.won ? 'text-green-400' : 'text-white/20'}`}>
                                            {bet.outcome_json.won ? `GANÓ ${bet.outcome_json.prize_name}` : 'NO GANÓ'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Casino;
