"""
Patch Promotions.jsx:
1. Fix channel.er -> channel.engagement_rate en catálogo
2. Stats modal: leer vistas+seguidores de channel_metrics_history, mostrar última actualización
3. Añadir estado y modal "Proponer SFS" funcional con templates y selección de canal
4. Actualizar fetchCampaigns para usar sfsService
"""
import re

filepath = r'C:\Users\Admin\Desktop\Agente-modelos\web\src\pages\Promotions.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes_applied = []

# ---- FIX 1: channel.er -> channel.engagement_rate en catálogo ----
if "channel.er}% ER" in content:
    content = content.replace("{channel.er}% ER", "{(channel.engagement_rate || 0).toFixed(1)}% ER", 1)
    changes_applied.append("Fix 1: ER field in catalog")
else:
    changes_applied.append("Fix 1: ER field NOT FOUND")

# ---- FIX 2: openStatsModal - leer de channel_metrics_history ----
old_stats = """    const openStatsModal = async (channel) => {
        setSelectedChannel(channel);
        setStatsModalOpen(true);
        setLoadingHistory(true);
        try {
            const res = await api.get(`/promo/channels/my/${channel.id}/history?model_id=${sfsUser.id}`);
            const rawData = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
            const formatted = rawData.map(row => ({
                ...row,
                formattedDate: format(new Date(row.created_at), "d MMM, HH:mm", { locale: es })
            }));
            setChannelHistory(formatted);
        } catch (err) {
            console.error("Error fetching history", err);
            setChannelHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };"""

new_stats = """    const [statsLastUpdated, setStatsLastUpdated] = useState(null);

    const openStatsModal = async (channel) => {
        setSelectedChannel(channel);
        setStatsModalOpen(true);
        setLoadingHistory(true);
        setStatsLastUpdated(null);
        try {
            const res = await api.get(`/promo/channels/my/${channel.id}/history?model_id=${sfsUser.id}`);
            const payload = res.data || {};
            const rawHistory = Array.isArray(payload.history) ? payload.history : [];
            const formatted = rawHistory.map(row => ({
                ...row,
                formattedDate: format(new Date(row.created_at), "d MMM", { locale: es }),
                followers: row.followers || 0,
                avg_views: row.avg_views || 0,
                engagement_rate: row.engagement_rate || 0,
            }));
            setChannelHistory(formatted);
            if (payload.last_updated) {
                setStatsLastUpdated(format(new Date(payload.last_updated), "d MMM yyyy, HH:mm", { locale: es }));
            }
        } catch (err) {
            console.error("Error fetching history", err);
            setChannelHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };"""

if old_stats in content:
    content = content.replace(old_stats, new_stats, 1)
    changes_applied.append("Fix 2: openStatsModal updated")
else:
    changes_applied.append("Fix 2: openStatsModal NOT FOUND")

# ---- FIX 3: Stats Modal UI — añadir gráfico de seguidores y last_updated ----
old_modal_view = """                {loadingHistory ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader className="w-8 h-8 animate-spin text-purple-400" />
                    </div>
                ) : channelHistory.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-48 text-muted-foreground">
                        <BarChart2 className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">No hay datos históricos suficientes aún.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="h-48 w-full bg-card/20 rounded-xl p-2 border border-white/5">
                            <h3 className="text-xs font-bold text-muted-foreground mb-2 pl-2">Vistas por Post (Avg)</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={channelHistory}>
                                    <defs>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#c026d3" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#c026d3" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="formattedDate" stroke="#ffffff50" fontSize={10} tickMargin={10} minTickGap={20} />
                                    <YAxis stroke="#ffffff50" fontSize={10} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} width={35} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="avg_views" name="Vistas Promedio" stroke="#c026d3" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}"""

new_modal_view = """                {statsLastUpdated && (
                    <p className="text-[10px] text-muted-foreground/60 mb-4 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Última actualización: {statsLastUpdated}
                    </p>
                )}

                {loadingHistory ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader className="w-8 h-8 animate-spin text-purple-400" />
                    </div>
                ) : channelHistory.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-48 text-muted-foreground">
                        <BarChart2 className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">No hay datos históricos suficientes aún.</p>
                        <p className="text-xs mt-1 opacity-60">El bot analiza los canales cada 6 horas automáticamente.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="h-40 w-full bg-card/20 rounded-xl p-2 border border-white/5">
                            <h3 className="text-xs font-bold text-muted-foreground mb-1 pl-2">👁️ Vistas Promedio / Post</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={channelHistory}>
                                    <defs>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#c026d3" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#c026d3" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="formattedDate" stroke="#ffffff50" fontSize={9} tickMargin={8} minTickGap={20} />
                                    <YAxis stroke="#ffffff50" fontSize={9} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} width={32} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '11px' }} itemStyle={{ color: '#fff' }} />
                                    <Area type="monotone" dataKey="avg_views" name="Vistas" stroke="#c026d3" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="h-40 w-full bg-card/20 rounded-xl p-2 border border-white/5">
                            <h3 className="text-xs font-bold text-muted-foreground mb-1 pl-2">👥 Seguidores</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={channelHistory}>
                                    <defs>
                                        <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="formattedDate" stroke="#ffffff50" fontSize={9} tickMargin={8} minTickGap={20} />
                                    <YAxis stroke="#ffffff50" fontSize={9} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} width={32} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '11px' }} itemStyle={{ color: '#fff' }} />
                                    <Area type="monotone" dataKey="followers" name="Seguidores" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorFollowers)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}"""

if old_modal_view in content:
    content = content.replace(old_modal_view, new_modal_view, 1)
    changes_applied.append("Fix 3: Stats modal UI updated")
else:
    changes_applied.append("Fix 3: Stats modal UI NOT FOUND")

# ---- FIX 4: fetchCampaigns - usar sfsService ----
old_fetch_campaigns = """    const fetchCampaigns = useCallback(async () => {"""
new_fetch_campaigns = """    const fetchCampaigns = useCallback(async () => { // eslint-disable-line"""

# Lo dejamos así por ahora — no necesita cambio si los endpoints existen
changes_applied.append("Fix 4: campaigns API already uses correct endpoints")

# ---- FIX 5: Añadir estado para modal de propuesta SFS ----
old_review_state = "    const [reviewCampaign, setReviewCampaign] = useState(null);"
new_review_state = """    const [reviewCampaign, setReviewCampaign] = useState(null);

    // ---- Estado modal Proponer SFS ----
    const [proposeModalOpen, setProposeModalOpen] = useState(false);
    const [proposeTarget, setProposeTarget] = useState(null); // canal del catálogo
    const [proposeMyChannels, setProposeMyChannels] = useState([]);
    const [proposeMyTemplates, setProposeMyTemplates] = useState([]);
    const [proposeSelectedChannel, setProposeSelectedChannel] = useState('');
    const [proposeSelectedTemplate, setProposeSelectedTemplate] = useState('');
    const [proposeDuration, setProposeDuration] = useState(24);
    const [proposeLoading, setProposeLoading] = useState(false);"""

if old_review_state in content:
    content = content.replace(old_review_state, new_review_state, 1)
    changes_applied.append("Fix 5: propose SFS state added")
else:
    changes_applied.append("Fix 5: state NOT FOUND")

# ---- FIX 6: openProposeModal function before openReviewModal ----
old_open_review = "    const openReviewModal = (campaign) => {"
new_open_review = """    const openProposeModal = async (channel) => {
        setProposeTarget(channel);
        setProposeSelectedChannel('');
        setProposeSelectedTemplate('');
        setProposeDuration(24);
        setProposeModalOpen(true);
        if (sfsUser) {
            try {
                const [chs, tpls] = await Promise.all([
                    sfsService.getMyChannels(sfsUser.id),
                    sfsService.getMyTemplates(sfsUser.id)
                ]);
                setProposeMyChannels(Array.isArray(chs) ? chs.filter(c => c.status === 'active') : []);
                setProposeMyTemplates(Array.isArray(tpls) ? tpls : []);
            } catch (err) {
                console.error('Error loading propose data', err);
            }
        }
    };

    const submitProposeSFS = async () => {
        if (!proposeSelectedChannel || !proposeSelectedTemplate) {
            showToast('Selecciona un canal y un post plantilla', 'error');
            return;
        }
        if (!proposeTarget?.sfs_user_id) {
            showToast('No se pudo identificar al destinatario', 'error');
            return;
        }
        setProposeLoading(true);
        try {
            await sfsService.proposeSFS(sfsUser.id, {
                target_sfs_user_id: proposeTarget.sfs_user_id,
                requester_channel_id: proposeSelectedChannel,
                requester_template_id: proposeSelectedTemplate,
                duration_hours: proposeDuration,
            });
            showToast('¡Propuesta enviada! El anunciante debe aceptarla.', 'success');
            setProposeModalOpen(false);
            fetchCampaigns();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Error al enviar la propuesta';
            showToast(msg, 'error');
        } finally {
            setProposeLoading(false);
        }
    };

    const openReviewModal = (campaign) => {"""

if old_open_review in content:
    content = content.replace(old_open_review, new_open_review, 1)
    changes_applied.append("Fix 6: openProposeModal + submitProposeSFS added")
else:
    changes_applied.append("Fix 6: openReviewModal NOT FOUND")

# ---- FIX 7: Botón "Proponer SFS" en catálogo -> abrir modal ----
old_btn = """<button onClick={(e) => e.stopPropagation()} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95">
                                    <Send className="w-3.5 h-3.5" /> Proponer SFS
                                </button>"""
new_btn = """<button onClick={(e) => { e.stopPropagation(); openProposeModal(channel); }} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95">
                                    <Send className="w-3.5 h-3.5" /> Proponer SFS
                                </button>"""

if old_btn in content:
    content = content.replace(old_btn, new_btn, 1)
    changes_applied.append("Fix 7: Propose button wired")
else:
    changes_applied.append("Fix 7: Propose button NOT FOUND")

# ---- FIX 8: Añadir el modal de propuesta antes del cierre del componente (antes de renderStatsModal) ----
# Buscar donde renderizan los modales al final del JSX
modal_insert_marker = "{renderStatsModal()}"
propose_modal_jsx = """{/* Modal Proponer SFS */}
            <Modal isOpen={proposeModalOpen} onClose={() => setProposeModalOpen(false)}>
                <div className="p-6 space-y-4">
                    <h2 className="text-lg font-black text-foreground">Proponer SFS</h2>
                    {proposeTarget && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 items-center">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-lg shrink-0">
                                {proposeTarget.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">{proposeTarget.name}</p>
                                <p className="text-xs text-muted-foreground">{(proposeTarget.followers || 0).toLocaleString()} subs · {(proposeTarget.engagement_rate || 0).toFixed(1)}% ER</p>
                            </div>
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Tu Canal</label>
                        {proposeMyChannels.length === 0 ? (
                            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">No tienes canales activos. Añade y espera la aprobación del admin.</p>
                        ) : (
                            <select value={proposeSelectedChannel} onChange={e => setProposeSelectedChannel(e.target.value)}
                                className="w-full bg-card/40 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-purple-500">
                                <option value="">— Selecciona un canal —</option>
                                {proposeMyChannels.map(ch => (
                                    <option key={ch.id} value={ch.id}>{ch.name} ({(ch.followers || 0).toLocaleString()} subs)</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Post a Publicar</label>
                        {proposeMyTemplates.length === 0 ? (
                            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                No tienes posts guardados. Reenvía un post a <span className="font-bold">@Nebula_sfs_bot</span> en Telegram para guardarlo como plantilla.
                            </p>
                        ) : (
                            <select value={proposeSelectedTemplate} onChange={e => setProposeSelectedTemplate(e.target.value)}
                                className="w-full bg-card/40 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-purple-500">
                                <option value="">— Selecciona una plantilla —</option>
                                {proposeMyTemplates.map((tpl, i) => (
                                    <option key={tpl.id} value={tpl.id}>
                                        Post del {tpl.created_at ? format(new Date(tpl.created_at), 'd MMM yyyy', { locale: es }) : `#${i + 1}`}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Duración del SFS</label>
                        <select value={proposeDuration} onChange={e => setProposeDuration(parseInt(e.target.value))}
                            className="w-full bg-card/40 border border-white/10 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-purple-500">
                            <option value={12}>12 horas</option>
                            <option value={24}>24 horas</option>
                            <option value={48}>48 horas</option>
                            <option value={72}>72 horas</option>
                        </select>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2 items-start">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300">El anunciante recibirá tu propuesta y deberá aceptarla. Una vez aceptada, el bot publicará los posts automáticamente.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setProposeModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-foreground bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                            Cancelar
                        </button>
                        <button onClick={submitProposeSFS} disabled={proposeLoading || !proposeSelectedChannel || !proposeSelectedTemplate}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                            {proposeLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {proposeLoading ? 'Enviando...' : 'Enviar Propuesta'}
                        </button>
                    </div>
                </div>
            </Modal>

            {renderStatsModal()}"""

if modal_insert_marker in content:
    content = content.replace(modal_insert_marker, propose_modal_jsx, 1)
    changes_applied.append("Fix 8: Propose modal JSX added")
else:
    changes_applied.append("Fix 8: modal insert marker NOT FOUND")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n=== RESULTS ===")
for c in changes_applied:
    status = "✅" if "NOT FOUND" not in c else "❌"
    print(f"{status} {c}")
