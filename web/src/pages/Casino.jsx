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

            const animDuration = activeGame === 'roulette' ? 6200 : 2500;

            setTimeout(async () => {
                if (data.new_balance !== undefined) {
                    updateUser({ wallet_balance: data.new_balance });
                }

                const historyRes = await api.get('/casino/my-bets');
                setHistory(historyRes.data);

                if (data.won) {
                    showToast(`¡FELICIDADES! Ganaste: ${data.prize}`, "success");
                } else {
                    showToast("Más suerte la próxima vez", "info");
                }
                setBetting(false);
            }, animDuration);

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
        <div className="min-h-screen bg-black text-white pb-20">
            <div className="p-4 flex items-center justify-between sticky top-0 z-50 bg-black/80 backdrop-blur-md">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/5">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-bold">Suerte con {model?.artistic_name || model?.username}</h1>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                    <Coins size={16} className="text-yellow-400" />
                    <span className="text-sm font-bold">{user?.wallet_balance || 0}</span>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 pt-4">
                <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setActiveGame('roulette')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest ${activeGame === 'roulette' ? 'bg-white/10 shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                        style={activeGame === 'roulette' ? { borderBottom: `2px solid ${themeColor}` } : {}}
                    >
                        < Sparkles size={16} /> Ruleta
                    </button>
                    <button
                        onClick={() => setActiveGame('slots')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest ${activeGame === 'slots' ? 'bg-white/10 shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                        style={activeGame === 'slots' ? { borderBottom: `2px solid ${themeColor}` } : {}}
                    >
                        <Gamepad2 size={16} /> Slots
                    </button>
                </div>

                {activeGame === 'roulette' && (
                    <div className="text-center mb-8">
                        <div className="inline-block p-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
                            <div className="bg-black rounded-full px-6 py-2">
                                <span className="text-sm font-bold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                    Ruleta de la Fortuna
                                </span>
                            </div>
                        </div>
                        <p className="text-white/60 text-sm">Apuesta {prices.roulette} créditos y gana premios exclusivos</p>
                    </div>
                )}

                {activeGame === 'slots' && (
                    <div className="text-center mb-8">
                        <p className="text-white/60 text-sm">Apuesta {prices.slots} créditos y alinea los símbolos</p>
                    </div>
                )}

                <div className="mb-10 flex justify-center py-4">
                    {activeGame === 'roulette' ? (
                        <Roulette
                            prizes={prizes}
                            onSpin={handleSpin}
                            isSpinning={betting}
                            winnerIndex={result?.won ? prizes.findIndex(p => p.prize_name === result.prize) : -1}
                            themeColor={themeColor}
                        />
                    ) : (
                        <SlotMachine
                            onSpin={handleSpin}
                            isSpinning={betting}
                            result={result}
                            themeColor={themeColor}
                        />
                    )}
                </div>

                <div className="bg-white/5 rounded-3xl p-6 mb-8 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy size={18} className="text-yellow-500" />
                        <h2 className="text-sm font-bold uppercase tracking-wider">Posibles Premios</h2>
                    </div>
                    <div className="space-y-3">
                        {prizes.map((prize, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                                <span className="text-sm">{prize.prize_name}</span>
                                <span className="text-xs text-white/40">{(prize.probability * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                        {prizes.length === 0 && <p className="text-xs text-white/40 text-center">La modelo no ha configurado premios aún.</p>}
                    </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                        <History size={18} className="text-blue-500" />
                        <h2 className="text-sm font-bold uppercase tracking-wider">Últimas Jugadas</h2>
                    </div>
                    <div className="space-y-2">
                        {history.slice(0, 5).map((bet, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs p-2 border-b border-white/5">
                                <span>{new Date(bet.created_at).toLocaleTimeString()}</span>
                                <span className={bet.outcome_json.won ? 'text-green-400 font-bold' : 'text-white/40'}>
                                    {bet.outcome_json.won ? `Ganó ${bet.outcome_json.prize_name}` : 'No ganó'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Casino;
