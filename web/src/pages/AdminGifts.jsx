import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { Gift, Plus, Trash2, Save, X, Sparkles, Loader } from 'lucide-react';
import clsx from 'clsx';

const AdminGifts = () => {
    const [gifts, setGifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingGift, setEditingGift] = useState(null);
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        animation_id: 'rose-animation',
        theme: 'general',
        is_active: true
    });

    useEffect(() => {
        fetchGifts();
    }, []);

    const fetchGifts = async () => {
        try {
            const res = await api.get('/admin_gifts/admin');
            setGifts(res.data);
        } catch (err) {
            console.error("Error fetching gifts", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingGift) {
                await api.put(`/admin_gifts/${editingGift.id}`, formData);
            } else {
                await api.post('/admin_gifts/', formData);
            }
            fetchGifts();
            resetForm();
            showToast("Regalo guardado.", "success");
        } catch (err) {
            showToast("Error al guardar regalo", "error");
        }
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingGift(null);
        setFormData({
            name: '',
            price: '',
            animation_id: 'rose-animation',
            theme: 'general',
            is_active: true
        });
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este regalo?")) return;
        try {
            await api.delete(`/admin_gifts/${id}`);
            fetchGifts();
        } catch (err) {
            showToast("Error al eliminar", "error");
        }
    };

    if (loading) return <div className="p-12 text-center text-zinc-500"><Loader className="animate-spin mx-auto mb-4" /> Cargando regalos...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Gift className="text-purple-500" />
                        Gestión de Regalos
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">Configura los regalos que tus clientes podrán enviar a las modelos.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-white text-black font-bold px-6 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
                >
                    <Plus size={18} /> Nuevo Regalo
                </button>
            </div>

            {/* Grid de Regalos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gifts.map(gift => (
                    <div key={gift.id} className="bg-zinc-900 border border-white/5 rounded-3xl p-6 hover:border-purple-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                🎁
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditingGift(gift);
                                        setFormData({
                                            name: gift.name,
                                            price: gift.price,
                                            animation_id: gift.animation_id,
                                            theme: gift.theme,
                                            is_active: gift.is_active
                                        });
                                        setIsAdding(true);
                                    }}
                                    className="p-2 bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                >
                                    <Save size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(gift.id)}
                                    className="p-2 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1">{gift.name}</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-purple-400">${gift.price}</span>
                            <span className={clsx(
                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                                gift.is_active ? "bg-green-500/10 text-green-500" : "bg-zinc-500/10 text-zinc-500"
                            )}>
                                {gift.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <p className="text-zinc-500 text-[11px] mt-4 uppercase tracking-widest font-bold">Tema: {gift.theme}</p>
                    </div>
                ))}
            </div>

            {/* Modal de Creación/Edición */}
            {isAdding && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <form
                        onSubmit={handleSubmit}
                        className="bg-zinc-900 border border-white/10 rounded-[40px] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Sparkles className="text-purple-400" />
                                {editingGift ? 'Editar Regalo' : 'Añadir Regalo'}
                            </h3>
                            <button type="button" onClick={resetForm} className="p-2 text-zinc-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Nombre del Regalo</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-purple-500/50 transition-all font-medium"
                                    placeholder="Ej: Rosa de Cristal"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Precio (USDT)</label>
                                    <input
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-purple-500/50 transition-all font-bold"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Tema</label>
                                    <select
                                        name="theme"
                                        value={formData.theme}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                    >
                                        <option value="general">General</option>
                                        <option value="love">Amor / San Valentín</option>
                                        <option value="christmas">Navidad</option>
                                        <option value="halloween">Halloween</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">ID de Animación (Lordicon/Lottie)</label>
                                <input
                                    name="animation_id"
                                    value={formData.animation_id}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono text-sm"
                                    placeholder="diamond-sparkle"
                                />
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 accent-purple-500 rounded"
                                />
                                <label htmlFor="is_active" className="text-sm font-bold text-zinc-300">Regalo visible en la app</label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-white text-black font-black py-5 rounded-[24px] mt-10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all active:scale-95"
                        >
                            {editingGift ? 'GUARDAR CAMBIOS' : 'CREAR REGALO'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdminGifts;
