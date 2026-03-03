import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Star, ShieldCheck, TrendingUp, ChevronLeft, MessageSquare, Eye, AlertCircle, Loader } from 'lucide-react';
import api from '../api/axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const StarRating = ({ rating, size = 'sm' }) => {
    const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`${sz} ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
            ))}
        </div>
    );
};

const TrustBadge = ({ score }) => {
    const color = score >= 80 ? 'text-green-400 bg-green-500/15 border-green-500/30'
        : score >= 50 ? 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30'
            : 'text-red-400 bg-red-500/15 border-red-500/30';
    const label = score >= 80 ? 'Confiable' : score >= 50 ? 'Moderado' : 'Bajo';
    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${color}`}>
            <ShieldCheck className="w-3 h-3" />
            Trust {score} · {label}
        </div>
    );
};

const ChannelCard = ({ channel }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-3 items-start">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-lg shrink-0">
            {channel.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-white truncate">{channel.name}</h3>
                {channel.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                {channel.category && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full uppercase tracking-wide">
                        {channel.category}
                    </span>
                )}
            </div>
            <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Users className="w-3 h-3" />
                    {(channel.followers || 0).toLocaleString()}
                </div>
                {channel.avg_views && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Eye className="w-3 h-3" />
                        {channel.avg_views.toLocaleString()} vistas
                    </div>
                )}
                {channel.engagement_rate > 0 && (
                    <div className="flex items-center gap-1 text-xs text-green-400 font-bold">
                        <TrendingUp className="w-3 h-3" />
                        {channel.engagement_rate}% ER
                    </div>
                )}
            </div>
        </div>
    </div>
);

const ReviewCard = ({ review }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
            <StarRating rating={review.rating} />
            <span className="text-[10px] text-gray-500">
                {review.created_at
                    ? format(new Date(review.created_at), 'dd MMM yyyy', { locale: es })
                    : ''}
            </span>
        </div>
        {review.comment && (
            <p className="text-sm text-gray-300 leading-relaxed">"{review.comment}"</p>
        )}
        <p className="text-[11px] text-gray-500 mt-2">
            — @{review.reviewer_username || 'Anónimo'}
        </p>
    </div>
);

const AdvertiserProfile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('channels');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/promo/advertiser/${userId}`);
                setProfile(res.data);
            } catch (err) {
                setError(err.response?.data?.detail || 'Anunciante no encontrado');
            } finally {
                setLoading(false);
            }
        };
        if (userId) fetchProfile();
    }, [userId]);

    // ---- Loading ----
    if (loading) return (
        <div className="flex items-center justify-center h-screen w-full bg-[#030014]">
            <Loader className="w-10 h-10 animate-spin text-purple-500" />
        </div>
    );

    // ---- Error ----
    if (error || !profile) return (
        <div className="min-h-screen bg-[#030014] flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h2 className="text-lg font-bold text-white mb-1">Perfil no encontrado</h2>
            <p className="text-sm text-gray-400 mb-6">{error || 'El anunciante no existe o no está disponible.'}</p>
            <button onClick={() => navigate('/promotions')}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-all">
                ← Volver al Catálogo
            </button>
        </div>
    );

    const avgRating = profile.reviews?.length
        ? (profile.reviews.reduce((s, r) => s + r.rating, 0) / profile.reviews.length).toFixed(1)
        : null;

    const channels = profile.channels || [];
    const reviews = profile.reviews || [];

    return (
        <div className="min-h-screen bg-[#030014] pb-12">
            {/* Header con fondo gradiente */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/40 via-fuchsia-900/20 to-[#030014]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.2),transparent_70%)]" />

                <div className="relative px-4 pt-5 pb-8">
                    {/* Botón atrás */}
                    <button onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-8">
                        <ChevronLeft className="w-4 h-4" /> Volver
                    </button>

                    {/* Avatar + Info */}
                    <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 flex items-center justify-center text-4xl font-black text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] shrink-0">
                            {profile.full_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                            <h1 className="text-xl font-black text-white leading-tight truncate">
                                {profile.full_name || profile.username || 'Anunciante'}
                            </h1>
                            {profile.username && (
                                <p className="text-sm text-purple-300 mt-0.5">@{profile.username}</p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                                <TrustBadge score={profile.trust_score || 100} />
                                {profile.is_agency_model && (
                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-purple-500/40 bg-purple-500/15 text-[10px] font-bold text-purple-300">
                                        ⭐ Modelo Agencia
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats rápidos */}
                    <div className="grid grid-cols-3 gap-3 mt-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                            <p className="text-lg font-black text-white">{channels.length}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Canales</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                            <p className="text-lg font-black text-white">{reviews.length}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Reviews</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                            {avgRating ? (
                                <>
                                    <p className="text-lg font-black text-yellow-400">{avgRating}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Puntuación</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-lg font-black text-gray-500">—</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Sin reviews</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4">
                <div className="flex bg-white/5 border border-white/5 p-1 rounded-xl mb-5">
                    {[['channels', `Canales (${channels.length})`], ['reviews', `Reviews (${reviews.length})`]].map(([tab, label]) => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                                    : 'text-gray-400 hover:text-white'
                                }`}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Canales */}
                {activeTab === 'channels' && (
                    <div className="space-y-3">
                        {channels.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400 text-sm">Este anunciante no tiene canales activos.</p>
                            </div>
                        ) : (
                            channels.map(ch => <ChannelCard key={ch.id} channel={ch} />)
                        )}
                    </div>
                )}

                {/* Reviews */}
                {activeTab === 'reviews' && (
                    <div className="space-y-3">
                        {reviews.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400 text-sm">Aún no hay reseñas para este anunciante.</p>
                            </div>
                        ) : (
                            <>
                                {avgRating && (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 mb-4">
                                        <div className="text-4xl font-black text-yellow-400">{avgRating}</div>
                                        <div>
                                            <StarRating rating={Math.round(avgRating)} size="md" />
                                            <p className="text-xs text-gray-400 mt-1">Basado en {reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                )}
                                {reviews.map(review => <ReviewCard key={review.id} review={review} />)}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdvertiserProfile;
