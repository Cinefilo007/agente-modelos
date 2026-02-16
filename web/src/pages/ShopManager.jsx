import React, { useState, useEffect } from 'react';
import {
    Plus, Trash2, Save, ShoppingBag, ArrowLeft,
    Zap, AlertCircle, LayoutGrid, DollarSign,
    ChevronRight, Loader, CheckCircle2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import { cn } from '../lib/utils';

const CATEGORIES = [
    { id: 'packs', label: 'Packs (Fotos/Videos)' },
    { id: 'personalized', label: 'Personalizados' },
    { id: 'sexting', label: 'Sexting / Chat' },
    { id: 'video_call', label: 'Video Llamadas' },
    { id: 'virtual_gf', label: 'Novia Virtual' },
    { id: 'encounters', label: 'Encuentros' },
    { id: 'other', label: 'Otros' }
];

export default function ShopManager() {
    const { themeColor } = useTheme();
    const navigate = useNavigate();

    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingService, setEditingService] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        category: 'packs',
        title: '',
        description: '',
        rules: [],
        benefits: [],
        options: [{ label: '', price: '', unit: '', unit_value: '' }]
    });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchMyServices();
    }, []);

    const fetchMyServices = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/shop/my');
            setServices(data || []);
        } catch (err) {
            console.error("Error fetching services:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddOption = () => {
        setFormData(prev => ({
            ...prev,
            options: [...prev.options, { label: '', price: '', unit: '', unit_value: '' }]
        }));
    };

    const handleRemoveOption = (index) => {
        if (formData.options.length === 1) return;
        setFormData(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }));
    };

    const handleOptionChange = (index, field, value) => {
        const newOptions = [...formData.options];
        newOptions[index][field] = value;
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    const handleAddTag = (field) => {
        const val = prompt(`Añadir ${field === 'rules' ? 'regla' : 'beneficio'}:`);
        if (val) {
            setFormData(prev => ({
                ...prev,
                [field]: [...prev[field], val]
            }));
        }
    };

    const handleRemoveTag = (field, index) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Transform prices to numbers
            const payload = {
                ...formData,
                options: formData.options.map(opt => ({
                    ...opt,
                    price: parseFloat(opt.price) || 0,
                    unit_value: parseInt(opt.unit_value) || 0
                }))
            };

            await api.post('/shop/services', payload);
            setIsCreating(false);
            setEditingService(null);
            fetchMyServices();
            // Reset Form
            setFormData({
                category: 'packs',
                title: '',
                description: '',
                rules: [],
                benefits: [],
                options: [{ label: '', price: '', unit: '', unit_value: '' }]
            });
        } catch (err) {
            console.error("Error saving service:", err);
            alert("Error al guardar el servicio.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Inactivar este servicio? No aparecerá más en tu tienda.")) return;
        try {
            await api.delete(`/shop/services/${id}`);
            fetchMyServices();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading && services.length === 0 && !isCreating) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <Loader className="animate-spin text-primary" style={{ color: themeColor }} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent pb-32 pt-6 px-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => isCreating ? setIsCreating(false) : navigate('/admin')}
                        className="p-2 rounded-full bg-card/50 border border-white/5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white">Gestionar Tienda</h1>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Configuración de Servicios</p>
                    </div>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="p-3 rounded-2xl bg-primary text-white shadow-lg active:scale-95 transition-transform"
                        style={{ backgroundColor: themeColor }}
                    >
                        <Plus size={24} />
                    </button>
                )}
            </div>

            {isCreating ? (
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Basic Info */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-tighter">
                            <LayoutGrid size={16} /> Información General
                        </div>
                        <div className="bg-card/40 backdrop-blur-md border border-white/10 rounded-[32px] p-8 space-y-6 shadow-2xl">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Categoría</label>
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary outline-none"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Título del Servicio</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Video Llamada Privada 30 min"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary outline-none"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Descripción Corta</label>
                                <textarea
                                    rows={3}
                                    placeholder="Explica brevemente de qué trata el servicio..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary outline-none resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Pricing Options */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-tighter">
                                <DollarSign size={16} /> Opciones de Precio
                            </div>
                            <button type="button" onClick={handleAddOption} className="text-xs font-bold text-primary flex items-center gap-1" style={{ color: themeColor }}>
                                <Plus size={14} /> Añadir opción
                            </button>
                        </div>
                        <div className="space-y-3">
                            {formData.options.map((opt, i) => (
                                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-3 relative animate-in zoom-in-95 duration-200">
                                    {formData.options.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(i)}
                                            className="absolute top-4 right-4 p-1 text-red-500/50 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Etiqueta (Ej: 15 Minutos)</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                                                value={opt.label}
                                                onChange={e => handleOptionChange(i, 'label', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Precio ($)</label>
                                            <input
                                                type="number"
                                                required
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                                                value={opt.price}
                                                onChange={e => handleOptionChange(i, 'price', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Unidad (Ej: fotos)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                                                value={opt.unit}
                                                placeholder="opcional"
                                                onChange={e => handleOptionChange(i, 'unit', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Rules & Benefits */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <section className="space-y-4">
                            <div className="flex items-center justify-between text-sm font-bold text-muted-foreground uppercase tracking-tighter">
                                <span className="flex items-center gap-2"><Zap size={16} className="text-yellow-400" /> Beneficios</span>
                                <button type="button" onClick={() => handleAddTag('benefits')} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><Plus size={14} /></button>
                            </div>
                            <div className="bg-card/40 backdrop-blur-sm border border-white/5 rounded-[32px] p-6 min-h-[120px] space-y-2 shadow-xl">
                                {formData.benefits.length === 0 && <p className="text-[10px] text-muted-foreground/30 text-center py-4 italic">No hay beneficios añadidos</p>}
                                {formData.benefits.map((b, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs text-gray-300 bg-white/5 rounded-xl px-4 py-2.5 border border-white/5 group">
                                        <span className="flex items-center gap-2 font-medium"><CheckCircle2 size={12} className="text-green-500" /> {b}</span>
                                        <button type="button" onClick={() => handleRemoveTag('benefits', i)} className="text-red-400 opacity-0 group-hover:opacity-60 transition-opacity"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center justify-between text-sm font-bold text-muted-foreground uppercase tracking-tighter">
                                <span className="flex items-center gap-2"><AlertCircle size={16} className="text-red-400" /> Reglas</span>
                                <button type="button" onClick={() => handleAddTag('rules')} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><Plus size={14} /></button>
                            </div>
                            <div className="bg-card/40 backdrop-blur-sm border border-white/5 rounded-[32px] p-6 min-h-[120px] space-y-2 shadow-xl">
                                {formData.rules.length === 0 && <p className="text-[10px] text-muted-foreground/30 text-center py-4 italic">No hay reglas añadidas</p>}
                                {formData.rules.map((r, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs text-gray-300 bg-white/5 rounded-xl px-4 py-2.5 border border-white/5 group">
                                        <span className="flex items-center gap-2 font-medium"><AlertCircle size={12} className="text-red-400" /> {r}</span>
                                        <button type="button" onClick={() => handleRemoveTag('rules', i)} className="text-red-400 opacity-0 group-hover:opacity-60 transition-opacity"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-5 rounded-[32px] bg-primary text-white font-black text-lg shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 hover:brightness-110 flex items-center justify-center gap-3"
                        style={{ backgroundColor: themeColor, boxShadow: `0 15px 40px -10px ${themeColor}80` }}
                    >
                        {saving ? <Loader className="animate-spin" /> : <Save size={20} />}
                        {saving ? 'Guardando...' : 'Publicar Servicio Digital'}
                    </button>
                </form>
            ) : (
                <div className="max-w-2xl mx-auto space-y-4">
                    {services.length === 0 ? (
                        <div className="text-center py-20 opacity-40">
                            <ShoppingBag size={64} className="mx-auto mb-4" />
                            <p className="font-bold">No tienes servicios activos</p>
                            <p className="text-sm">Empieza creando uno arriba.</p>
                        </div>
                    ) : (
                        services.map((service) => (
                            <div key={service.id} className="bg-card/40 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-white/20 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-white">{service.title}</h3>
                                        <span className={cn(
                                            "text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border",
                                            service.is_active ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                                        )}>
                                            {service.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{service.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {service.model_service_options?.map(opt => (
                                            <span key={opt.id} className="bg-white/5 border border-white/5 text-[10px] px-2.5 py-1.5 rounded-xl text-white/80 font-medium">
                                                {opt.label}: <span className="text-green-400 font-bold ml-1">${opt.price}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDelete(service.id)}
                                        className="p-3 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500/20 transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                    {/* Edit could be implemented later, for now we let them delete and recreate */}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function Info({ size, className }) {
    return <AlertCircle size={size} className={className} />;
}
