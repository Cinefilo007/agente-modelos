import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />
};

const bgColors = {
    success: "bg-green-500/10 border-green-500/20",
    error: "bg-red-500/10 border-red-500/20",
    warning: "bg-yellow-500/10 border-yellow-500/20",
    info: "bg-blue-500/10 border-blue-500/20"
};

export const ToastContainer = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-[320px]">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, x: 100, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.2 } }}
                        className={clsx(
                            "pointer-events-auto relative overflow-hidden",
                            "flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl",
                            bgColors[toast.type] || bgColors.info
                        )}
                    >
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />

                        <div className="flex-shrink-0">
                            {icons[toast.type] || icons.info}
                        </div>

                        <div className="flex-grow min-w-0">
                            <p className="text-sm font-medium text-white/90 leading-tight">
                                {toast.message}
                            </p>
                        </div>

                        <button
                            onClick={() => onRemove(toast.id)}
                            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4 text-white/40" />
                        </button>

                        {/* Progress bar effect? Maybe too much, but let's keep it simple for now */}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
