import React, { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Loader2, Users, Clock, Globe, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import { syncGoogleEvents } from "../lib/googleSync";

type EventType = { 
  id: string; 
  title: string; 
  time: string; 
  date: string; 
  client_id?: string;
};

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Agenda() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventType[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Partial<EventType> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  const daysArray = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
    }
    return null; 
  });

  const isSameDay = (d1: Date | null, d2: string) => {
    if (!d1) return false;
    return formatDateLocal(d1) === d2;
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Check Google Connection
    const { data: tokenData } = await supabase
      .from("user_google_tokens")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    setGoogleConnected(!!tokenData);

    const { data: clientsData } = await supabase.from("clients").select("id, name").order("name");
    setClients(clientsData || []);

    const { data: appData } = await supabase.from("appointments").select("*").eq("user_id", user.id);
    setEvents(appData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    const res = await syncGoogleEvents(user.id);
    alert(res.message);
    if (res.success) {
      await loadData();
    }
    setIsSyncing(false);
  };

  const handleGoogleConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert("Erro: Client ID do Google não configurado.");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/callback/google`;
    const scope = "https://www.googleapis.com/auth/calendar.events";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("eventId", id);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const onDrop = async (e: React.DragEvent, targetDate: Date | null) => {
    e.preventDefault();
    if (!targetDate) return;
    const id = e.dataTransfer.getData("eventId");
    if (!id) return;
    const isoDate = formatDateLocal(targetDate);
    setEvents(events.map(ev => ev.id === id ? { ...ev, date: isoDate } : ev));
    await supabase.from("appointments").update({ date: isoDate }).eq("id", id);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !user) return;
    setIsSaving(true);
    const payload = { title: editingEvent.title, time: editingEvent.time, date: editingEvent.date, client_id: editingEvent.client_id || null, user_id: user.id };
    if (editingEvent.id) {
      const { error } = await supabase.from("appointments").update(payload).eq("id", editingEvent.id);
      if (!error) setEvents(events.map(ev => ev.id === editingEvent.id ? { ...ev, ...payload } as EventType : ev));
    } else {
      const { data, error } = await supabase.from("appointments").insert([payload]).select().single();
      if (!error && data) setEvents([...events, data]);
    }
    setIsSaving(false);
    setEditingEvent(null);
  };

  const handleDelete = async () => {
    if (!editingEvent?.id || !window.confirm("Deseja realmente excluir este compromisso?")) return;
    setIsSaving(true);
    const { error } = await supabase.from("appointments").delete().eq("id", editingEvent.id);
    if (!error) { setEvents(events.filter(ev => ev.id !== editingEvent.id)); setEditingEvent(null); }
    setIsSaving(false);
  };

  const openNewEventModal = () => {
    setEditingEvent({ title: "", time: "09:00 - 10:00", date: formatDateLocal(new Date()), client_id: "" });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Agenda</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">Sincronize e gerencie seus compromissos.</p>
        </div>
        <div className="flex items-center gap-2">
          {googleConnected && (
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-indigo-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-indigo-400 dark:hover:bg-zinc-800"
            >
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
            </button>
          )}
          <button 
            onClick={handleGoogleConnect}
            className={cn(
               "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border",
               googleConnected 
                 ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" 
                 : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            <Globe className={cn("w-4 h-4", googleConnected ? "text-emerald-500" : "text-slate-400")} />
            {googleConnected ? "Conectado" : "Conectar Google"}
          </button>
          <button 
            onClick={openNewEventModal}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Agendamento
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[600px]">
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/50">
          <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100 flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
            {capitalize(currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl text-slate-600 dark:text-zinc-400 transition-all"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-black bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-700 dark:text-zinc-300 transition-all uppercase tracking-widest">Hoje</button>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl text-slate-600 dark:text-zinc-400 transition-all"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-[800px] overflow-auto custom-scrollbar">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-100/30 dark:bg-zinc-950/80 sticky top-0 z-10">
            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
              <div key={day} className="p-4 text-center text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 flex-1 bg-slate-50 dark:bg-zinc-950/30 auto-rows-fr">
            {daysArray.map((date, i) => {
              const dateIso = date ? formatDateLocal(date) : null;
              const isToday = dateIso === formatDateLocal(new Date());
              const dayEvents = dateIso ? events.filter(e => e.date === dateIso) : [];
              return (
                <div key={i} className={`border-r border-b border-slate-200 dark:border-zinc-800/50 p-2 flex flex-col min-h-[140px] transition-all ${date ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50/50 dark:bg-zinc-950/20'} ${isToday ? 'bg-indigo-50/10 dark:bg-indigo-500/5' : ''}`} onDragOver={date ? onDragOver : undefined} onDrop={date ? (e) => onDrop(e, date) : undefined}>
                  {date && (
                    <>
                      <div className={`text-right p-1 mb-2 ${isToday ? 'font-black text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-600 font-bold'}`}>
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-sm ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : ''}`}>{date.getDate()}</span>
                      </div>
                      <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
                        {dayEvents.map(event => {
                          const clientName = clients.find(c => c.id === event.client_id)?.name;
                          return (
                            <div key={event.id} draggable onDragStart={(e) => onDragStart(e, event.id)} onClick={() => setEditingEvent(event)} className="text-[11px] font-bold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-100 dark:border-zinc-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all flex flex-col gap-1 ring-1 ring-slate-900/5">
                              <div className="font-black truncate text-slate-900 dark:text-zinc-100">{event.title}</div>
                              {clientName && <div className="text-[9px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-black flex items-center gap-1.5"><Users className="w-3 h-3" /> {clientName}</div>}
                              <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1.5"><Clock className="w-3 h-3" /> {event.time}</div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-8 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">{editingEvent.id ? "Editar Compromisso" : "Novo Compromisso"}</h3>
              <button type="button" onClick={() => setEditingEvent(null)} className="p-2 border border-slate-100 dark:border-zinc-800 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Título</label>
                <input type="text" value={editingEvent.title} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 font-bold" required />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Vincular Cliente</label>
                <select value={editingEvent.client_id || ""} onChange={e => setEditingEvent({...editingEvent, client_id: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 font-bold text-sm">
                  <option value="">Nenhum cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="pt-4 flex gap-4">
                {editingEvent.id && <button type="button" onClick={handleDelete} className="flex-1 bg-red-50 text-red-600 font-black py-3 rounded-2xl transition-all">Excluir</button>}
                <button type="submit" className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
