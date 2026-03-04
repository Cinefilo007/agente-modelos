import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Plus, Pencil, Trash2, CheckCircle, Loader, Wallet,
    LogOut, Users, Star, ShieldCheck, Save, ExternalLink
} from 'lucide-react';
import api from '../../api/axios';
import { sfsService } from '../../api/sfs';
import SfsWalletPanel from './SfsWalletPanel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SfsProfilePanel = ({
    isOpen,
    onClose,
    sfsUser,
    myProfile,
    onLoadProfile,
    onLogout,
    onOpenAddChannel,
    onOpenChannelEdit,
    onOpenDeleteChannel,
}) => {
    const [activeTab, setActiveTab] = useState('canales');
    const [myChannels, setMyChannels] = useState([]);
    const [myTemplates, setMyTemplates] = useState([]);
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [editingTitleId, setEditingTitleId] = useState(null);
    const [editingTitleValue, setEditingTitleValue] = useState('');
    const [savingTitle, setSavingTitle] = useState(false);
    const [walletModalOpen, setWalletModalOpen] = useState(false);

    const fetchChannels = useCallback(async () => {
        if (!sfsUser?.id) return;
        setLoadingChannels(true);
        try {
            const ch = await sfsService.getMyChannels(sfsUser.id);
            setMyChannels(Array.isArray(ch) ? ch : []);
        } catch { } finally {
            setLoadingChannels(false);
        }
    }, [sfsUser?.id]);

    const fetchTemplates = useCallback(async () => {
        if (!sfsUser?.id) return;
        setLoadingTemplates(true);
        try {
            const tpls = await sfsService.getMyTemplates(sfsUser.id);
            setMyTemplates(Array.isArray(tpls) ? tpls : []);
        } catch { } finally {
            setLoadingTemplates(false);
        }
    }, [sfsUser?.id]);

    useEffect(() => {
        if (!isOpen || !sfsUser?.id) return;
        if (activeTab === 'canales') fetchChannels();
        if (activeTab === 'posts') fetchTemplates();
    }, [isOpen, activeTab, sfsUser?.id]);

    // También cargar el perfil si no está cargado
    useEffect(() => {
        if (isOpen && sfsUser?.id && !myProfile) {
            onLoadProfile?.();
        }
    }, [isOpen, sfsUser?.id, myProfile]);

    const saveTitle = async (templateId) => {
        setSavingTitle(true);
        try {
            await api.put(`/promo/templates/${templateId}`, { title: editingTitleValue }, {
                params: { sfs_user_id: sfsUser.id }
            });
            setMyTemplates(prev => prev.map(t => t.id === templateId ? { ...t, title: editingTitleValue } : t));
            setEditingTitleId(null);
        } catch {
            // fail silently
        } finally {
            setSavingTitle(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Panel slide-in from right */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col bg-[hsl(240,10%,4%)] border-l border-white/10 shadow-2xl overflow-hidden animate-slide-in-right">
                {/* Header del panel */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <h2 className="font-black text-foreground text-lg">Mi Perfil SFS</h2>
                    <button onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-5 space-y-5">
                        {/* Avatar y datos */}
                        <div className="bg-gradient-to-br from-purple-900/40 to-black border border-white/5 rounded-2xl p-5 flex gap-4 items-center">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-2xl shrink-0">
                                {(sfsUser?.username || sfsUser?.full_name || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-foreground text-base truncate">@{sfsUser?.username || sfsUser?.full_name || 'usuario'}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Trust: {sfsUser?.trust_score ?? 100}/100</span>
                                    {sfsUser?.is_agency_model && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">Agencia</span>}
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-card/30 border border-white/5 rounded-xl p-4 text-center">
                                <p className="text-2xl font-black text-foreground">{myChannels.filter(c => c.status === 'active').length}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Canales Activos</p>
                            </div>
                            <div className="bg-card/30 border border-white/5 rounded-xl p-4 text-center">
                                <p className="text-2xl font-black text-foreground">{myProfile?.completed_campaigns ?? 0}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">SFS Completados</p>
                            </div>
                        </div>

                        {/* Wallet compacta */}
                        <div className="bg-card/30 border border-white/5 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                    <Wallet className="w-4 h-4 text-purple-400" /> Billetera SFS
                                </p>
                                <button onClick={() => setWalletModalOpen(true)}
                                    className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors">
                                    Gestionar →
                                </button>
                            </div>
                            <p className="text-2xl font-black text-foreground">
                                ${parseFloat(myProfile?.wallet_balance || 0).toFixed(2)} <span className="text-sm text-muted-foreground font-normal">USD</span>
                            </p>
                        </div>

                        {/* Tabs Canales / Posts */}
                        <div className="flex bg-card/40 border border-white/5 p-1 rounded-xl gap-1">
                            {[['canales', 'Mis Canales', Users], ['posts', 'Mis Posts', Star]].map(([id, label, Icon]) => (
                                <button key={id} onClick={() => setActiveTab(id)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                                    <Icon className="w-3.5 h-3.5" />{label}
                                </button>
                            ))}
                        </div>

                        {/* Tab contenido: Canales */}
                        {activeTab === 'canales' && (
                            <div className="space-y-3">
                                <button onClick={onOpenAddChannel}
                                    className="w-full py-2.5 rounded-xl border border-dashed border-purple-500/40 text-xs font-bold text-purple-400 hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2">
                                    <Plus className="w-3.5 h-3.5" /> Añadir nuevo canal
                                </button>
                                {loadingChannels ? (
                                    <div className="flex justify-center py-8"><Loader className="w-6 h-6 animate-spin text-purple-400" /></div>
                                ) : myChannels.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">Sin canales registrados.</p>
                                    </div>
                                ) : (
                                    myChannels.map(ch => (
                                        <div key={ch.id} className="bg-card/40 border border-white/5 rounded-xl p-4 group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-foreground text-sm truncate">{ch.name}</p>
                                                        {ch.invite_link && (
                                                            <a href={ch.invite_link} target="_blank" rel="noopener noreferrer"
                                                                className="text-purple-400 hover:text-purple-300 shrink-0">
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ch.status === 'active' ? 'bg-green-500/20 text-green-400' : ch.status === 'verifying' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-400'}`}>
                                                            {ch.status}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{(ch.followers || 0).toLocaleString()} subs</span>
                                                        {ch.mode && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold">{ch.mode === 'both' ? 'SFS+PXP' : ch.mode.toUpperCase()}</span>}
                                                        {ch.category && <span className="text-[10px] text-muted-foreground/60">{ch.category}</span>}
                                                    </div>
                                                    {ch.bio && <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-1">{ch.bio}</p>}
                                                </div>
                                                <div className="flex gap-1.5 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => onOpenChannelEdit?.(ch)}
                                                        className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => onOpenDeleteChannel?.(ch)}
                                                        className="p-1.5 bg-red-500/10 rounded-lg hover:bg-red-500/20 text-red-400 transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Tab contenido: Posts */}
                        {activeTab === 'posts' && (
                            <div className="space-y-3">
                                <p className="text-xs text-muted-foreground/70">
                                    Reenvía un post a <span className="font-bold text-foreground">@Nebula_sfs_bot</span> en Telegram para guardarlo. Aquí puedes añadirle un título para identificarlo.
                                </p>
                                {loadingTemplates ? (
                                    <div className="flex justify-center py-8"><Loader className="w-6 h-6 animate-spin text-purple-400" /></div>
                                ) : myTemplates.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Star className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">Sin posts guardados.</p>
                                    </div>
                                ) : (
                                    myTemplates.map((tpl, i) => (
                                        <div key={tpl.id} className="bg-card/40 border border-white/5 rounded-xl p-4">
                                            {editingTitleId === tpl.id ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editingTitleValue}
                                                        onChange={e => setEditingTitleValue(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') saveTitle(tpl.id); if (e.key === 'Escape') setEditingTitleId(null); }}
                                                        placeholder="Título del post..."
                                                        className="flex-1 bg-black/30 border border-purple-500/50 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none"
                                                    />
                                                    <button onClick={() => saveTitle(tpl.id)} disabled={savingTitle}
                                                        className="p-1.5 bg-purple-600 rounded-lg text-white hover:bg-purple-500 transition-all disabled:opacity-50">
                                                        {savingTitle ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => setEditingTitleId(null)}
                                                        className="p-1.5 bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition-all">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground">
                                                            {tpl.title || <span className="text-muted-foreground italic font-normal">Sin título</span>}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                                            {tpl.created_at ? format(new Date(tpl.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es }) : `Post #${i + 1}`}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => { setEditingTitleId(tpl.id); setEditingTitleValue(tpl.title || ''); }}
                                                        className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all shrink-0">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer: Cerrar Sesión */}
                <div className="p-4 border-t border-white/5">
                    <button onClick={() => { onClose(); setTimeout(() => onLogout?.(), 50); }}
                        className="w-full py-3 rounded-xl text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* Sub-modal Wallet */}
            {walletModalOpen && (
                <div className="fixed inset-0 z-60 flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setWalletModalOpen(false)} />
                    <div className="relative bg-[hsl(240,10%,6%)] border border-white/10 rounded-t-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-foreground">Mi Billetera SFS</h3>
                            <button onClick={() => setWalletModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-muted-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <SfsWalletPanel sfsUser={{ ...sfsUser, wallet_balance: myProfile?.wallet_balance || 0 }} />
                    </div>
                </div>
            )}
        </>
    );
};

export default SfsProfilePanel;
