import React, { useState, useEffect } from 'react';
import { Gamepad2, Plus, X, Loader, Save, Coins } from 'lucide-react';
import api from '../../api/axios';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export default function CasinoPrizeManager() {
    const { themeColor } = useTheme();
    const { showToast } = useToast();
    const [prizes, setPrizes] = useState([]);
    const [prices, setPrices] = useState({ roulette: 10, slots: 10 });
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [savingPrices, setSavingPrices] = useState(false);
    const [newPrize, setNewPrize] = useState({
        prize_name: '',
        prize_type: 'custom_service',
        probability: 10,
        prize_value_json: {}
    });

    const fetchData = async () => {
        try {
            const profile = await api.get('/profile/me');
            const [prizesRes, settingsRes] = await Promise.all([
                api.get(`/casino/model/${profile.data.id}/prizes`),
                api.get(`/casino/model/${profile.data.id}/settings`)
            ]);

            setPrizes(prizesRes.data || []);
            const settingsMap = {};
            settingsRes.data.forEach(s => {
                settingsMap[s.game_slug] = s.spin_price;
            });
            setPrices(prev => ({ ...prev, ...settingsMap }));
        } catch (err) {
            console.error("Error fetching casino data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchPrizes = async () => {
        try {
            const profile = await api.get('/profile/me');
            const res = await api.get(`/casino/model/${profile.data.id}/prizes`);
            setPrizes(res.data || []);
        } catch (err) {
            console.error("Error fetching prizes:", err);
        }
    };

    const handleSavePrices = async () => {
        setSavingPrices(true);
        try {
            await Promise.all([
                api.post('/casino/settings', { game_slug: 'roulette', spin_price: prices.roulette }),
                api.post('/casino/settings', { game_slug: 'slots', spin_price: prices.slots })
            ]);
            showToast("Precios actualizados", "success");
        } catch (err) {
            showToast("Error al guardar precios", "error");
        } finally {
            setSavingPrices(false);
        }
    };

    const handleAddPrize = async (e) => {
        e.preventDefault();
        if (!newPrize.prize_name) return showToast("Nombre del premio requerido", "error");

        setAdding(true);
        try {
            const payload = { ...newPrize, probability: newPrize.probability / 100 };
            await api.post('/casino/model/prizes', payload);
            showToast("Premio añadido correctamente", "success");
            setNewPrize({ prize_name: '', prize_type: 'custom_service', probability: 10, prize_value_json: {} });
            fetchPrizes();
        } catch (err) {
            showToast(err.response?.data?.detail || "Error al añadir premio", "error");
        } finally {
            setAdding(false);
        }
    };

    const handleDeletePrize = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este premio?")) return;
        try {
            await api.delete(`/casino/prizes/${id}`);
            showToast("Premio eliminado", "success");
            fetchPrizes();
        } catch (err) {
            showToast("Error al eliminar", "error");
        }
    };

    const totalProb = prizes.reduce((sum, p) => sum + p.probability, 0);

    if (loading) return <div className="h-40 flex items-center justify-center"><Loader className="animate-spin" /></div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-card/40 border border-white/5 rounded-[32px] p-8">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                    <Gamepad2 size={24} style={{ color: themeColor }} /> Tu Casino Personal
                </h3>
                <p className="text-sm text-muted-foreground mb-6">Configura los premios y precios que tus fans encontrarán al jugar.</p>

                {/* Spin Prices Configuration */}
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 mb-8">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Precios por Giro</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Ruleta</label>
                            <div className="relative mt-1">
                                <input
                                    type="number"
                                    value={prices.roulette}
                                    onChange={(e) => setPrices({ ...prices, roulette: parseFloat(e.target.value) })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-8 text-sm focus:outline-none focus:border-white/30"
                                />
                                <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 text-yellow-500/50" size={14} />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Slots</label>
                            <div className="relative mt-1">
                                <input
                                    type="number"
                                    value={prices.slots}
                                    onChange={(e) => setPrices({ ...prices, slots: parseFloat(e.target.value) })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-8 text-sm focus:outline-none focus:border-white/30"
                                />
                                <Gamepad2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500/50" size={14} />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleSavePrices}
                        disabled={savingPrices}
                        className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2"
                    >
                        {savingPrices ? <Loader className="animate-spin" size={14} /> : <Save size={14} />}
                        {savingPrices ? 'Guardando...' : 'Actualizar Precios'}
                    </button>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Probabilidad Total</span>
                        <span className={`text-sm font-bold ${totalProb > 1 ? 'text-red-400' : 'text-green-400'}`}>
                            {(totalProb * 100).toFixed(0)}% / 100%
                        </span>
                    </div>
                    <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${totalProb > 1 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, totalProb * 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                        El margen de la casa es del {Math.max(0, (1 - totalProb) * 100).toFixed(0)}%. Si la suma es 100%, la casa no gana nada.
                    </p>
                </div>

                {/* List of Prizes */}
                <div className="space-y-3 mb-10">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Premios Activos</h4>
                    {prizes.map((prize) => (
                        <div key={prize.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
                            <div>
                                <p className="font-bold text-sm">{prize.prize_name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">{prize.prize_type.replace('_', ' ')}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold" style={{ color: themeColor }}>{(prize.probability * 100).toFixed(0)}%</span>
                                <button onClick={() => handleDeletePrize(prize.id)} className="p-2 text-red-500/40 hover:text-red-500 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {prizes.length === 0 && (
                        <p className="text-center py-10 text-xs text-muted-foreground italic">No has configurado premios aún.</p>
                    )}
                </div>

                {/* Add Prize Form */}
                <form onSubmit={handleAddPrize} className="bg-black/20 border border-white/10 rounded-3xl p-6">
                    <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <Plus size={16} /> Añadir Nuevo Premio
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Nombre del Premio</label>
                            <input
                                type="text"
                                value={newPrize.prize_name}
                                onChange={(e) => setNewPrize({ ...newPrize, prize_name: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-white/30"
                                placeholder="Ej: Foto VIP exclusiva"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Tipo</label>
                                <select
                                    value={newPrize.prize_type}
                                    onChange={(e) => setNewPrize({ ...newPrize, prize_type: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                                >
                                    <option value="custom_service">Servicio Custom</option>
                                    <option value="credit_bonus">Bono de Créditos</option>
                                    <option value="unlock_post">Contenido VIP</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Probabilidad (0-100%)</label>
                                <div className="relative mt-1">
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="100"
                                        value={newPrize.probability}
                                        onChange={(e) => setNewPrize({ ...newPrize, probability: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pr-8 text-sm focus:outline-none"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 font-bold">%</span>
                                </div>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={adding}
                            className="w-full py-3 bg-white text-black font-black text-xs rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {adding ? 'GUARDANDO...' : 'AÑADIR AL CASINO'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
