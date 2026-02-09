import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, children }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose} // Close on backdrop click
        >
            <div
                className="relative w-full max-w-lg bg-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()} // Prevent close on content click
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition-colors z-[60]"
                >
                    <X size={20} />
                </button>
                {children}
            </div>
        </div>,
        document.body
    );
}
