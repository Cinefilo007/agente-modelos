import React from 'react';
import { Star } from 'lucide-react';

export function ReviewList() {
    // Dummy reviews
    const reviews = [
        { id: 1, user: 'Alex M.', rating: 5, text: 'Simplemente increíble. Muy profesional y amable.', date: '2d ago' },
        { id: 2, user: 'Chris P.', rating: 5, text: 'La mejor experiencia, 100% recomendada.', date: '1w ago' },
    ];

    return (
        <div className="px-4 mt-4 space-y-4">
            {reviews.map((review) => (
                <div key={review.id} className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                        <div className="font-bold">{review.user}</div>
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    size={14}
                                    className={i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="text-sm text-gray-300">{review.text}</p>
                    <span className="text-xs text-gray-500 mt-2 block">{review.date}</span>
                </div>
            ))}
        </div>
    );
}
