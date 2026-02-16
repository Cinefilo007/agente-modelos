import React, { useState, useEffect } from 'react';
import { Star, Loader, MessageSquare } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import api from '../../api/axios';

export function ReviewList({ modelId }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReviews = async () => {
            if (!modelId) return;
            setLoading(true);
            try {
                // Fetch reviews from our new endpoint
                const { data } = await api.get(`/interactions/reviews/${modelId}`);
                setReviews(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Error fetching reviews:", err);
                setError("No se pudieron cargar las opiniones.");
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [modelId]);

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader className="animate-spin text-white/20" size={24} />
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-8 text-red-400 text-sm">{error}</div>;
    }

    if (reviews.length === 0) {
        return (
            <div className="text-center py-12 px-4 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <MessageSquare size={20} className="text-white/20" />
                </div>
                <p className="text-gray-400 text-sm">Aún no hay opiniones.</p>
            </div>
        );
    }

    return (
        <div className="px-4 mt-4 space-y-4 pb-20">
            {reviews.map((review) => (
                <div key={review.id} className="bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            {/* Client Avatar fallback */}
                            <Avatar
                                src={review.clients?.avatar_url}
                                name={review.clients?.username}
                                size="sm"
                            />
                            <div className="font-bold text-sm text-gray-200">
                                {review.clients?.username || "Usuario"}
                            </div>
                        </div>
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    size={12}
                                    className={i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed font-light">{review.comment}</p>
                    <span className="text-[10px] text-gray-500 mt-2 block uppercase tracking-wider">
                        {new Date(review.created_at).toLocaleDateString()}
                    </span>
                </div>
            ))}
        </div>
    );
}
