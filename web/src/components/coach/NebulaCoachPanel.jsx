import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import {
    Brain, Sparkles, CheckCircle2, XCircle, Clock, ChevronDown,
    ChevronUp, RefreshCw, TrendingUp, Zap, Target, Star,
    BarChart2, MessageSquare, ShoppingBag, Loader, AlertCircle, Users
} from 'lucide-react';

// ================================================================
// ICONO DE CATEGORÍA
// ================================================================
const CategoriaIcono = ({ categoria }) => {
    const map = {
        crecimiento: { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ventas: { icon: ShoppingBag, color: 'text-green-400', bg: 'bg-green-500/10' },
        contenido: { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        reputacion: { icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        monetizacion: { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    };
    const config = map[categoria] || { icon: Target, color: 'text-gray-400', bg: 'bg-white/5' };
    const Icon = config.icon;
    return (
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${config.bg}`}>
            <Icon size={15} className={config.color} />
        </div>
    );
};

// ================================================================
// CHIP DE IMPACTO
// ================================================================
const ChipImpacto = ({ impacto }) => {
    const config = {
        alto: { color: 'bg-red-500/15 text-red-400 border-red-500/20', label: '⚡ Alto' },
        medio: { color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20', label: '↑ Medio' },
        bajo: { color: 'bg-gray-500/15 text-gray-400 border-gray-500/20', label: '→ Bajo' },
    };
    const c = config[impacto] || config.bajo;
    return (
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${c.color}`}>
            {c.label}
        </span>
    );
};

// ================================================================
// CARD DE ACCIÓN
// ================================================================
const AccionCard = ({ accion, planId, onFeedback, feedbackMap }) => {
    const [expandida, setExpandida] = useState(false);
    const [cargando, setCargando] = useState(false);
    const resultado = feedbackMap[accion.key];

    const handleFeedback = async (result) => {
        if (cargando) return;
        setCargando(true);
        try {
            await onFeedback(planId, accion.key, accion.categoria, result);
        } finally {
            setCargando(false);
        }
    };

    const borderColor = resultado === 'success'
        ? 'border-green-500/30 bg-green-500/5'
        : resultado === 'failure'
            ? 'border-red-500/20 bg-red-500/5'
            : 'border-white/5 bg-white/[0.02]';

    return (
        <div className={`rounded-2xl border p-4 transition-all duration-300 ${borderColor}`}>
            <div className="flex items-start gap-3">
                <CategoriaIcono categoria={accion.categoria} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between flex-wrap gap-y-1">
                        <p className="font-bold text-sm text-white">{accion.titulo}</p>
                        <div className="flex items-center gap-2">
                            <ChipImpacto impacto={accion.impacto} />
                            {accion.tiempo_estimado && (
                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                    <Clock size={9} /> {accion.tiempo_estimado}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Expandir descripción */}
                    {expandida && (
                        <div className="mt-3 space-y-2 animate-in fade-in duration-200">
                            <p className="text-sm text-gray-400 leading-relaxed">{accion.descripcion}</p>
                            {accion.dato_colectivo && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                    <Users size={13} className="text-purple-400 mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-purple-300 leading-relaxed italic">
                                        {accion.dato_colectivo}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                        <button
                            onClick={() => setExpandida(v => !v)}
                            className="text-[11px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                        >
                            {expandida ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {expandida ? 'Ver menos' : 'Ver cómo hacerlo'}
                        </button>

                        {/* Botones de feedback */}
                        {!resultado ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleFeedback('success')}
                                    disabled={cargando}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-bold hover:bg-green-500/20 transition-colors active:scale-95 disabled:opacity-50"
                                >
                                    {cargando ? <Loader size={10} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                    Hecho ✅
                                </button>
                                <button
                                    onClick={() => handleFeedback('failure')}
                                    disabled={cargando}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-[11px] font-bold hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-colors active:scale-95 disabled:opacity-50"
                                >
                                    <XCircle size={12} /> No me funcionó
                                </button>
                            </div>
                        ) : (
                            <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl ${resultado === 'success'
                                    ? 'text-green-400 bg-green-500/10'
                                    : 'text-red-400 bg-red-500/10'
                                }`}>
                                {resultado === 'success' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                {resultado === 'success' ? 'Completado' : 'No funcionó'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ================================================================
// COMPONENTE PRINCIPAL: NEBULA COACH
// ================================================================
export default function NebulaCoachPanel() {
    const { showToast } = useToast();
    const [cargando, setCargando] = useState(true);
    const [regenerando, setRegenerando] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [semanaActiva, setSemanaActiva] = useState(1);
    const [feedbackMap, setFeedbackMap] = useState({}); // { action_key: 'success' | 'failure' }
    const [insights, setInsights] = useState([]);

    const obtenerPlan = useCallback(async (forzar = false) => {
        try {
            if (forzar) setRegenerando(true);
            else setCargando(true);
            setError(null);

            const endpoint = forzar ? '/coach/plan/regenerar' : '/coach/plan';
            const res = forzar
                ? await api.post(endpoint)
                : await api.get(endpoint);

            setData(res.data);
            if (forzar) showToast('✨ Plan actualizado con tus datos más recientes', 'success');
        } catch (err) {
            if (err.response?.status === 429) {
                showToast(err.response.data.detail, 'error');
            } else {
                setError(err.response?.data?.detail || 'Error generando el plan. Intenta de nuevo.');
            }
        } finally {
            setCargando(false);
            setRegenerando(false);
        }
    }, [showToast]);

    const obtenerInsights = useCallback(async () => {
        try {
            const res = await api.get('/coach/insights');
            setInsights(res.data.insights || []);
        } catch (_) {
            // silencioso — los insights son opcionales
        }
    }, []);

    useEffect(() => {
        obtenerPlan();
        obtenerInsights();
    }, []);

    const handleFeedback = async (planId, actionKey, actionCategory, result) => {
        try {
            await api.post('/coach/feedback', {
                plan_id: planId,
                action_key: actionKey,
                action_category: actionCategory,
                result
            });
            setFeedbackMap(prev => ({ ...prev, [actionKey]: result }));
            if (result === 'success') {
                showToast('¡Genial! Contribuiste al pool de conocimiento colectivo 🌟', 'success');
            }
        } catch (err) {
            showToast('No se pudo guardar tu respuesta', 'error');
        }
    };

    // --- ESTADOS DE CARGA / ERROR ---
    if (cargando) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
                <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20 flex items-center justify-center">
                        <Brain size={36} className="text-purple-400" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-purple-500/10 animate-ping" />
                </div>
                <div>
                    <p className="font-bold text-white text-lg">Nebula Coach analizando tu perfil...</p>
                    <p className="text-sm text-gray-500 mt-1">Esto puede tardar unos segundos la primera vez</p>
                </div>
                <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertCircle size={28} className="text-red-400" />
                </div>
                <div>
                    <p className="font-bold text-white">Error al generar el plan</p>
                    <p className="text-sm text-gray-500 mt-1 max-w-xs">{error}</p>
                </div>
                <button
                    onClick={() => obtenerPlan()}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15 transition-all text-sm font-bold active:scale-95"
                >
                    <RefreshCw size={15} /> Reintentar
                </button>
            </div>
        );
    }

    if (!data?.plan) return null;

    const plan = data.plan;
    const score = data.score || plan?.diagnostico?.score_general || 0;
    const nivel = data.nivel || plan?.diagnostico?.nivel || '';
    const semanas = plan.semanas || [];
    const semanaActual = semanas.find(s => s.numero === semanaActiva) || semanas[0];

    const scoreColor = score >= 80 ? '#f59e0b' : score >= 60 ? '#8b5cf6' : score >= 40 ? '#3b82f6' : '#6b7280';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ---- HEADER DIAGNÓSTICO ---- */}
            <div className="relative bg-gradient-to-br from-purple-900/20 to-indigo-900/10 border border-purple-500/20 rounded-3xl p-6 overflow-hidden">
                <div className="absolute top-0 right-0 opacity-5">
                    <Brain size={120} />
                </div>

                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Brain size={18} className="text-purple-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Nebula Coach</span>
                        </div>
                        <h2 className="text-xl font-black text-white leading-tight">{nivel}</h2>
                        <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                            {plan.diagnostico?.resumen}
                        </p>
                    </div>

                    {/* Score Circle */}
                    <div className="shrink-0 flex flex-col items-center gap-1">
                        <div className="relative w-16 h-16">
                            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                <circle
                                    cx="18" cy="18" r="14" fill="none"
                                    stroke={scoreColor} strokeWidth="3"
                                    strokeDasharray={`${score * 0.879} 87.9`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-black" style={{ color: scoreColor }}>{score}</span>
                            </div>
                        </div>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Score</span>
                    </div>
                </div>

                {/* Meta del mes */}
                <div className="mt-5 p-4 rounded-2xl bg-black/30 border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-1.5">
                        <Target size={10} /> Meta del Mes
                    </p>
                    <p className="text-sm font-bold text-white">{plan.meta_del_mes}</p>
                </div>

                {/* Fortalezas y áreas críticas */}
                {(plan.diagnostico?.fortalezas?.length || plan.diagnostico?.areas_criticas?.length) ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {plan.diagnostico?.fortalezas?.length > 0 && (
                            <div className="p-3 rounded-2xl bg-green-500/5 border border-green-500/15">
                                <p className="text-[9px] font-black uppercase tracking-wider text-green-500 mb-2">✓ Fortalezas</p>
                                <ul className="space-y-1">
                                    {plan.diagnostico.fortalezas.slice(0, 2).map((f, i) => (
                                        <li key={i} className="text-[11px] text-gray-400 leading-tight">{f}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {plan.diagnostico?.areas_criticas?.length > 0 && (
                            <div className="p-3 rounded-2xl bg-red-500/5 border border-red-500/15">
                                <p className="text-[9px] font-black uppercase tracking-wider text-red-400 mb-2">⚠ Priorizar</p>
                                <ul className="space-y-1">
                                    {plan.diagnostico.areas_criticas.slice(0, 2).map((a, i) => (
                                        <li key={i} className="text-[11px] text-gray-400 leading-tight">{a}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* ---- SELECTOR DE SEMANAS ---- */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {semanas.map(s => (
                    <button
                        key={s.numero}
                        onClick={() => setSemanaActiva(s.numero)}
                        className={`shrink-0 flex flex-col items-center px-5 py-3 rounded-2xl transition-all text-sm font-bold active:scale-95 ${semanaActiva === s.numero
                                ? 'bg-white text-black shadow-xl'
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <span className="text-[9px] uppercase tracking-wider opacity-60">Semana</span>
                        <span>{s.numero}</span>
                    </button>
                ))}
            </div>

            {/* ---- CONTENIDO DE LA SEMANA ---- */}
            {semanaActual && (
                <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1 h-5 rounded-full bg-purple-500" />
                        <h3 className="font-black text-white">{semanaActual.foco}</h3>
                    </div>

                    {(semanaActual.acciones || []).map(accion => (
                        <AccionCard
                            key={accion.key}
                            accion={accion}
                            planId={data.plan_id}
                            onFeedback={handleFeedback}
                            feedbackMap={feedbackMap}
                        />
                    ))}
                </div>
            )}

            {/* ---- MENSAJE MOTIVACIONAL ---- */}
            {plan.mensaje_motivacional && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/10 border border-indigo-500/20">
                    <p className="text-sm text-gray-300 italic leading-relaxed text-center">
                        "{plan.mensaje_motivacional}"
                    </p>
                </div>
            )}

            {/* ---- INSIGHTS COLECTIVOS ---- */}
            {insights.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <BarChart2 size={15} className="text-purple-400" />
                        <h3 className="font-black text-sm text-white uppercase tracking-wider">
                            Lo que funciona en Nebula
                        </h3>
                    </div>
                    <div className="grid gap-2">
                        {insights.slice(0, 5).map((insight, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div>
                                    <p className="text-sm font-bold text-white">{insight.accion}</p>
                                    <p className="text-[10px] text-gray-500 capitalize">{insight.categoria} · {insight.total} modelos</p>
                                </div>
                                <div className="px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20">
                                    <span className="text-green-400 font-black text-sm">{insight.tasa_exito}%</span>
                                    <p className="text-[9px] text-green-500/70 leading-none">éxito</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ---- BOTÓN REGENERAR ---- */}
            <div className="flex justify-center pb-4">
                <button
                    onClick={() => obtenerPlan(true)}
                    disabled={regenerando}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-bold text-gray-400 hover:text-white active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={regenerando ? 'animate-spin' : ''} />
                    {regenerando ? 'Actualizando...' : 'Actualizar mi plan'}
                </button>
                <p className="text-[10px] text-gray-600 text-center absolute mt-12">
                    Disponible 1 vez por semana
                </p>
            </div>
        </div>
    );
}
