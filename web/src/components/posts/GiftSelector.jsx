import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Sparkles, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const GiftSelector = ({ modelId, postId, isOpen, onClose, onGiftSent }) => {
    const { user } = useAuth();
    const [gifts, setGifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(null); // ID of gift being sent
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            const fetchGifts = async () => {
                try {
                    const res = await api.get('/admin_gifts/');
                    setGifts(res.data);
                } catch (err) {
                    setError("Error al cargar regalos");
                } finally {
                    setLoading(false);
                }
            };
            fetchGifts();
        }
    }, [isOpen]);

    const handleSendGift = async (gift) => {
        if (user?.balance < gift.price) {
            setError("Saldo insuficiente. Por favor recarga tu billetera.");
            return;
        }

        setSending(gift.id);
        setError(null);
        try {
            await api.post('/wallet/gift/purchase', {
                gift_id: gift.id,
                model_id: modelId,
                post_id: postId
            });
            onGiftSent?.(gift);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || "Error al enviar regalo");
        } finally {
            setSending(null);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-xl">
                                <Sparkles className="text-purple-400" size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Enviar Regalo</h3>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Balance Info */}
                    <div className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl mb-6">
                        <span className="text-sm text-zinc-400">Tu Saldo Disponible</span>
                        <div className="flex items-center gap-2">
                            <Wallet size={16} className="text-purple-400" />
                            <span className="font-bold text-white">${user?.balance?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4 flex items-center gap-2 text-xs text-red-400"
                        >
                            <AlertCircle size={14} />
                            {error}
                        </motion.div>
                    )}

                    {/* Gifts Grid */}
                    <div className="grid grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto no-scrollbar pb-4">
                        {loading ? (
                            [1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="aspect-square bg-white/5 rounded-2xl animate-pulse" />
                            ))
                        ) : (
                            gifts.map(gift => {
                                const canAfford = user?.balance >= gift.price;
                                return (
                                    <button
                                        key={gift.id}
                                        disabled={sending === gift.id}
                                        onClick={() => handleSendGift(gift)}
                                        className={clsx(
                                            "relative aspect-square flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 group",
                                            canAfford
                                                ? "bg-white/5 border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10"
                                                : "bg-white/5 border-white/5 opacity-50"
                                        )}
                                    >
                                        <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">
                                            {/* Placeholder for animation or emoji */}
                                            {gift.animation_id ? "🎁" : "🌹"}
                                        </div>
                                        <span className="text-[10px] text-zinc-400 font-medium truncate w-full text-center">{gift.name}</span>
                                        <span className="text-xs font-bold text-white mt-0.5">${gift.price}</span>

                                        {!canAfford && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                                                <Wallet size={16} className="text-white/40" />
                                            </div>
                                        )}

                                        {sending === gift.id && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
                                                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <p className="text-[10px] text-zinc-500 text-center mt-4">
                        El regalo se enviará de forma inmediata a la modelo.
                    </p>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default GiftSelector;
