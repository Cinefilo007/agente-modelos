
import React from 'react';
import { Star } from 'lucide-react';

export default function Reviews() {
    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">Reviews & Ratings</h1>

            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-card p-4 rounded-xl border flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/20"></div>
                                <span className="font-medium text-sm">Client User</span>
                            </div>
                            <div className="flex text-yellow-500">
                                {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3 h-3 fill-current" />)}
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excellent service!
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
