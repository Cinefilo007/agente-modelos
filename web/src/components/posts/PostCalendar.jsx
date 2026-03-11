import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, MoreVertical, Trash2, Eye, Plus } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

export default function PostCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        fetchPosts();
    }, [currentDate]);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/content/posts/my-posts'); // Necesitaremos este nuevo endpoint
            setPosts(res.data || []);
        } catch (error) {
            console.error("Error fetching calendar posts:", error);
            showToast("Error al cargar publicaciones", "error");
        } finally {
            setLoading(false);
        }
    };

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const prevMonth = () => setCurrentDate(new Date(year, month - 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1));

    const renderDays = () => {
        const days = [];
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);

        // Blank spaces for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 border border-white/5 opacity-20"></div>);
        }

        // Days of current month
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayPosts = posts.filter(p => {
                const pDate = new Date(p.scheduled_at || p.created_at).toISOString().split('T')[0];
                return pDate === dateStr;
            });

            days.push(
                <div key={day} className="h-24 border border-white/5 p-1 overflow-y-auto no-scrollbar relative hover:bg-white/5 transition-colors">
                    <span className="text-[10px] font-bold text-gray-500">{day}</span>
                    <div className="space-y-1 mt-1">
                        {dayPosts.map((p, idx) => (
                            <div
                                key={idx}
                                onClick={() => navigate(`/post/${p.id}`)}
                                className={clsx(
                                    "text-[9px] p-1 rounded truncate cursor-pointer flex items-center gap-1",
                                    p.status === 'scheduled' ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-green-500/20 text-green-300 border border-green-500/30"
                                )}
                            >
                                {p.status === 'scheduled' ? <Clock size={8} /> : <CheckCircle2 size={8} />}
                                {p.caption || 'Sin texto'}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return days;
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que quieres eliminar esta publicación?")) return;
        try {
            await api.delete(`/content/posts/${id}`);
            showToast("Publicación eliminada", "success");
            fetchPosts();
        } catch (error) {
            showToast("Error al eliminar", "error");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-500/20 rounded-xl text-pink-500">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white leading-none">{monthNames[month]} {year}</h2>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-black">Planificador de Contenido</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/create-post')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-pink-500/20 active:scale-95 transition-all mr-2"
                    >
                        <Plus size={14} /> Crear Publicación
                    </button>
                    <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"><ChevronLeft size={20} /></button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"><ChevronRight size={20} /></button>
                </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
                    {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map(d => (
                        <div key={d} className="py-2 text-center text-[9px] font-black text-gray-500 tracking-widest">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {renderDays()}
                </div>
            </div>

            {/* Listado de Próximas Publicaciones (Scheduled Only) */}
            <div className="mt-8">
                <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest mb-4 flex items-center gap-2">
                    <Clock size={14} /> Próximas Publicaciones
                </h3>
                <div className="space-y-3">
                    {posts.filter(p => p.status === 'scheduled' && new Date(p.scheduled_at) > new Date()).length === 0 ? (
                        <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-8 text-center">
                            <p className="text-xs text-gray-500">No tienes publicaciones programadas próximamente.</p>
                        </div>
                    ) : (
                        posts.filter(p => p.status === 'scheduled' && new Date(p.scheduled_at) > new Date())
                            .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                            .map(p => (
                                <div key={p.id} className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-2xl group">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-black flex-none">
                                        <img src={p.thumbnail_url || p.media_url} alt="Post" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{p.caption || 'Sin texto'}</p>
                                        <p className="text-[10px] text-purple-400 flex items-center gap-1 mt-0.5">
                                            <Clock size={10} /> {new Date(p.scheduled_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => navigate(`/post/${p.id}`)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"><Eye size={16} /></button>
                                        <button onClick={() => handleDelete(p.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>
        </div>
    );
}
