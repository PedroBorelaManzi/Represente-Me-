import React, { useState, useEffect, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Loader2, Users, Clock, Globe, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import { syncGoogleEvents, pushEventToGoogle, deleteEventFromGoogle } from "../lib/googleSync";

type EventType = { 
  id: string; 
  title: string; 
  time: string; 
  date: string; 
  client_id?: string;
  google_event_id?: string;
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
  
  // Mobile dragging state
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const longPressTimer = useRef<any>(null);

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
    setDraggedEventId(id);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleMoveAppointment = async (id: string, targetDate: Date) => {
    if (!user) return;
    const isoDate = formatDateLocal(targetDate);
    const updatedEvents = events.map(ev => ev.id === id ? { ...ev, date: isoDate } : ev);
    setEvents(updatedEvents);
    
    const { data: updatedApp } = await supabase.from("appointments").update({ date: isoDate }).eq("id", id).select().single();
    if (updatedApp && googleConnected) {
      await pushEventToGoogle(user.id, updatedApp);
    }
  };

  const onDrop = async (e: React.DragEvent, targetDate: Date | null) => {
    e.preventDefault();
    if (!targetDate) return;
    const id = e.dataTransfer.getData("eventId") || draggedEventId;
    if (!id) return;
    await handleMoveAppointment(id, targetDate);
    setDraggedEventId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !user) return;
    setIsSaving(true);
    const payload = { 
      title: editingEvent.title, 
      time: editingEvent.time, 
      date: editingEvent.date, 
      client_id: editingEvent.client_id || null, 
      user_id: user.id 
    };
    
    let updatedApp;
    if (editingEvent.id) {
      const { data, error } = await supabase.from("appointments").update(payload).eq("id", editingEvent.id).select().single();
      if (!error && data) {
        setEvents(events.map(ev => ev.id === editingEvent.id ? { ...ev, ...data } : ev));
        updatedApp = data;
      }
    } else {
      const { data, error } = await supabase.from("appointments").insert([payload]).select().single();
      if (!error && data) {
        setEvents([...events, data]);
        updatedApp = data;
      }
    }

    if (updatedApp && googleConnected) {
      await pushEventToGoogle(user.id, updatedApp);
    }

    setIsSaving(false);
    setEditingEvent(null);
  };

  const handleDelete = async () => {
    if (!editingEvent?.id || !user || !window.confirm("Deseja realmente excluir este compromisso?")) return;
    setIsSaving(true);
    
    const googleId = editingEvent.google_event_id;
    const { error } = await supabase.from("appointments").delete().eq("id", editingEvent.id);
    
    if (!error) { 
      setEvents(events.filter(ev => ev.id !== editingEvent.id)); 
      if (googleId && googleConnected) {
        await deleteEventFromGoogle(user.id, googleId);
      }
      setEditingEvent(null); 
    }
    setIsSaving(false);
  };

  const openNewEventModal = () => {
    setEditingEvent({ title: "", time: "09:00 - 10:00", date: formatDateLocal(new Date()), client_id: "" });
  };

  // Mobile Touch Support
  const handleTouchStart = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setDraggedEventId(id);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleDateClick = (date: Date) => {
    if (draggedEventId) {
      handleMoveAppointment(draggedEventId, date);
      setDraggedEventId(null);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Agenda</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">Sincronize e gerencie seus compromissos.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[600px]">
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100 flex items-center gap-3">
              <CalendarIcon className="w-6 h-6 text-indigo-600" />
              {capitalize(currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}
            </h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleSync}
                disabled={isSyncing}
                className={cn(
                  "p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10",
                  !googleConnected && "hidden"
                )}
                title="Sincronizar Agora"
              >
                <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
              </button>
              <button 
                onClick={handleGoogleConnect}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  googleConnected ? "text-emerald-500" : "text-slate-400 hover:text-indigo-600"
                )}
                title={googleConnected ? "Google Conectado" : "Conectar Google Agenda"}
              >
                <Globe className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded-2xl shadow-sm mr-2">
              <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-slate-600 dark:text-zinc-400 transition-all"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-[10px] font-black hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-700 dark:text-zinc-300 transition-all uppercase tracking-widest">Hoje</button>
              <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-slate-600 dark:text-zinc-400 transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
            
            <button 
              onClick={openNewEventModal}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-indigo-100 dark:shadow-none uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> Novo Agendamento
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-[800px] lg:min-w-0 overflow-auto custom-scrollbar">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-100/30 dark:bg-zinc-950/80 sticky top-0 z-10">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-4 text-center text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 flex-1 bg-slate-50 dark:bg-zinc-950/30 auto-rows-fr">
            {daysArray.map((date, i) => {
              const dateIso = date ? formatDateLocal(date) : null;
              const isToday = dateIso === formatDateLocal(new Date());
              const dayEvents = dateIso ? events.filter(e => e.date === dateIso) : [];
              return (
                <div 
                  key={i} 
                  className={cn(
                    "border-r border-b border-slate-200 dark:border-zinc-800/50 p-2 flex flex-col min-h-[120px] transition-all relative group",
                    date ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50/50 dark:bg-zinc-950/20',
                    isToday && 'bg-indigo-50/10 dark:bg-indigo-500/5',
                    draggedEventId && date && "hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 cursor-pointer"
                  )} 
                  onDragOver={date ? onDragOver : undefined} 
                  onDrop={date ? (e) => onDrop(e, date) : undefined}
                  onClick={date ? () => handleDateClick(date) : undefined}
                >
                  {date && (
                    <>
                      <div className={cn(
                        "text-right p-1 mb-2",
                        isToday ? 'font-black text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-zinc-700 font-bold'
                      )}>
                        <span className={cn(
                          "inline-flex items-center justify-center w-7 h-7 rounded-xl text-[11px]",
                          isToday && 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                        )}>{date.getDate()}</span>
                      </div>
                      <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
                        {dayEvents.map(event => {
                          const clientName = clients.find(c => c.id === event.client_id)?.name;
                          const isBeingDragged = draggedEventId === event.id;
                          return (
                            <div 
                              key={event.id} 
                              draggable 
                              onDragStart={(e) => onDragStart(e, event.id)} 
                              onTouchStart={() => handleTouchStart(event.id)}
                              onTouchEnd={handleTouchEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!draggedEventId) setEditingEvent(event);
                              }} 
                              className={cn(
                                "text-[10px] font-bold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-100 dark:border-zinc-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all flex flex-col gap-1 ring-1 ring-slate-900/5",
                                isBeingDragged && "opacity-50 ring-2 ring-indigo-500 border-indigo-500 scale-95"
                              )}
                            >
                              <div className="font-black truncate text-slate-900 dark:text-zinc-100">{event.title}</div>
                              {clientName && <div className="text-[8px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-black flex items-center gap-1"><Users className="w-2.5 h-2.5" /> {clientName}</div>}
                              <div className="text-[8px] text-slate-400 font-bold flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {event.time}</div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">{editingEvent.id ? "Editar Compromisso" : "Novo Compromisso"}</h3>
                <button type="button" onClick={() => setEditingEvent(null)} className="p-2 border border-slate-100 dark:border-zinc-800 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Título</label>
                  <input type="text" value={editingEvent.title} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 font-bold" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Vincular Cliente</label>
                  <select value={editingEvent.client_id || ""} onChange={e => setEditingEvent({...editingEvent, client_id: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 font-bold text-sm">
                    <option value="">Nenhum cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex gap-4">
                  {editingEvent.id && <button type="button" onClick={handleDelete} className="flex-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-black py-3 rounded-2xl transition-all">Excluir</button>}
                  <button type="submit" disabled={isSaving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center disabled:opacity-50">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
