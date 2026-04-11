/* eslint-disable react/prop-types */
import React from 'react';

/**
 * Tarjeta de beneficio premium con gradientes y efectos de hover
 */
export const BenefitCard = ({ icon: Icon, title, desc, color = 'purple' }) => {
    const colorClasses = {
        purple: 'from-purple-600 to-indigo-600 text-purple-400 border-purple-500/20 bg-purple-500/5',
        pink: 'from-pink-600 to-rose-600 text-pink-400 border-pink-500/20 bg-pink-500/5',
        blue: 'from-blue-600 to-cyan-600 text-blue-400 border-blue-500/20 bg-blue-500/5',
        green: 'from-green-600 to-emerald-600 text-green-400 border-green-500/20 bg-green-500/5',
        indigo: 'from-indigo-600 to-blue-600 text-indigo-400 border-indigo-500/20 bg-indigo-500/5'
    };

    const activeColor = colorClasses[color] || colorClasses.purple;
    const [gradient, textColor, border, bg] = activeColor.split(' ');

    return (
        <div className={`group p-8 rounded-[2.5rem] ${bg} border ${border} hover:border-white/30 transition-all duration-500 hover:-translate-y-2 backdrop-blur-xl relative overflow-hidden`}>
            {/* Glow effect */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500`}></div>
            
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${gradient} flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-500`}>
                <Icon className="w-7 h-7 text-white" />
            </div>
            
            <h3 className="text-xl font-bold mb-3 group-hover:text-white transition-colors">{title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm group-hover:text-gray-300 transition-colors">{desc}</p>
        </div>
    );
};

/**
 * Item de estadística con tipografía impactante
 */
export const StatItem = ({ number, label }) => (
    <div className="space-y-2 group">
        <div className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 group-hover:to-white transition-all duration-500">
            {number}
        </div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] group-hover:text-gray-300 transition-colors">
            {label}
        </div>
    </div>
);

/**
 * Separador decorativo animado
 */
export const DecorativeDivider = () => (
    <div className="w-full flex justify-center py-12">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
    </div>
);
