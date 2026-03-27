import React, { useState, useEffect, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight, Clock, X, LayoutDashboard, Loader2, Users, Calendar } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";

type EventType = { 
  id: string; 
  title: string; 
  time: string; 
  date: string; 
  client_id?: string;
};

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 to 21:00

// Helper to format date as YYYY-MM-DD in local time
const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventType[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Partial<EventType> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragOverInfo, setDragOverInfo] = useState<{ dayIndex: number; hour: number } | null>(null);

  // Setup Week Days
  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); 
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const isSameDay = (d1: Date, d2: string) => {
    return formatDateLocal(d1) === d2;
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Use standard appointments table - correctly synced with Agenda.tsx
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");
    setClients(clientsData || []);

    const { data: appData } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id);
    
    setEvents(appData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("eventId", id);
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const onDragOver = (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    setDragOverInfo({ dayIndex, hour });
  };

  const onDrop = async (e: React.DragEvent, targetDate: Date, targetHour: number) => {
    e.preventDefault();
    setDragOverInfo(null);
    const id = e.dataTransfer.getData("eventId");
    if (!id) return;
    
    const isoDate = formatDateLocal(targetDate);
    const newTime = `${String(targetHour).padStart(2, '0')}:00 - ${String(targetHour + 1).padStart(2, '0')}:00`;
    
    setEvents(events.map(ev => 
      ev.id === id ? { ...ev, date: isoDate, time: newTime } : ev
    ));

    await supabase
      .from("appointments")
      .update({ date: isoDate, time: newTime })
      .eq("id", id);
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

    if (editingEvent.id) {
      const { error } = await supabase
        .from("appointments")
        .update(payload)
        .eq("id", editingEvent.id);
      
      if (!error) {
        setEvents(events.map(ev => ev.id === editingEvent.id ? { ...ev, ...payload } as EventType : ev));
      }
    } else {
      const { data, error } = await supabase
        .from("appointments")
        .insert([payload])
        .select()
        .single();
      
      if (!error && data) {
        setEvents([...events, data]);
      }
    }

    setIsSaving(false);
    setEditingEvent(null);
  };

  const handleDelete = async () => {
    if (!editingEvent?.id || !window.confirm("Deseja realmente excluir este compromisso?")) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", editingEvent.id);
    
    if (!error) {
      setEvents(events.filter(ev => ev.id !== editingEvent.id));
      setEditingEvent(null);
    }
    setIsSaving(false);
  };

  const openNewEventModal = (date: Date, hour?: number) => {
    const timeStr = hour ? `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00` : "09:00 - 10:00";
    setEditingEvent({
      title: "",
      time: timeStr,
      date: formatDateLocal(date),
      client_id: ""
    });
  };

  const getEventPosition = (time: string) => {
    try {
      const start = time.split(" - ")[0];
      const hour = parseInt(start.split(":")[0]);
      const minute = parseInt(start.split(":")[1] || "0");
      if (hour < 7 || hour > 21) return null;
      const top = (hour - 7) * 60 + minute;
      return top;
    } catch { return null; }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            Início
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Sua agenda semanal e visão geral de compromissos.</p>
        </div>
        <button 
          onClick={() => openNewEventModal(new Date())}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>
      
      {/* Width set to grid-cols-1 as requested by user to occupy full space */}
      <div className="grid grid-cols-1 gap-6 flex-1 min-h-0">
        
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
          
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 z-20">
            <div className="flex items-center gap-4">
               <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-tight">
                 {weekDays[0].toLocaleDateString('pt-BR', { month: 'long' })} {weekDays[0].getFullYear()}
               </h2>
               <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
                  <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-md text-slate-600 dark:text-zinc-400 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Hoje
                  </button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-md text-slate-600 dark:text-zinc-400 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-auto custom-scrollbar relative">
            <div className="flex bg-slate-50/80 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-20 backdrop-blur-md">
              <div className="w-16 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-7 divide-x divide-slate-200 dark:divide-zinc-800">
                {weekDays.map((date, i) => {
                  const isToday = isSameDay(date, formatDateLocal(new Date()));
                  return (
                    <div key={i} className={cn("p-3 text-center", isToday ? "bg-indigo-50/50 dark:bg-indigo-500/10" : "")}>
                      <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", isToday ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-zinc-500")}>
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      </div>
                      <div className={cn("text-base font-black w-8 h-8 flex items-center justify-center rounded-full mx-auto", isToday ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none" : "text-slate-700 dark:text-zinc-300")}>
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-1 min-h-[900px]">
              <div className="w-16 flex flex-col bg-white dark:bg-zinc-900 border-r border-slate-100 dark:border-zinc-800/50">
                {HOURS.map(hour => (
                  <div key={hour} className="h-[60px] text-[10px] font-bold text-slate-400 dark:text-zinc-600 text-center py-2 -mt-2.5">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100 dark:divide-zinc-800/30 relative">
                {weekDays.map((date, dayIdx) => {
                  const dayEvents = events.filter(e => isSameDay(date, e.date));
                  const isToday = isSameDay(date, formatDateLocal(new Date()));

                  return (
                    <div key={dayIdx} className={cn("relative group h-full", isToday ? "bg-indigo-50/10 dark:bg-indigo-500/[0.02]" : "")}>
                      {HOURS.map(hour => (
                        <div 
                          key={hour} 
                          className={cn("h-[60px] border-b border-slate-50 dark:border-zinc-800/20 cursor-pointer ", dragOverInfo?.dayIndex === dayIdx && dragOverInfo?.hour === hour ? "bg-indigo-500/10" : "hover:bg-slate-50/50 dark:hover:bg-zinc-800/10")}
                          onDragOver={(e) => onDragOver(e, dayIdx, hour)}
                          onDrop={(e) => onDrop(e, date, hour)}
                          onClick={() => openNewEventModal(date, hour)}
                        />
                      ))}

                      <div className="absolute inset-0 pointer-events-none p-1">
                        {dayEvents.map(event => {
                          const top = getEventPosition(event.time);
                          if (top === null) return null;
                          const clientName = clients.find(c => c.id === event.client_id)?.name;

                          return (
                            <div
                              key={event.id}
                              draggable
                              onDragStart={(e) => onDragStart(e, event.id)}
                              onClick={(e) => { e.stopPropagation(); setEditingEvent(event); }}
                              className="absolute left-1 right-1 pointer-events-auto bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 rounded-lg p-2 transition-all cursor-grab active:cursor-grabbing z-10 overflow-hidden"
                              style={{ top: `${top}px`, minHeight: '55px' }}
                            >
                              <div className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-100 mb-1 truncate">
                                {event.title}
                              </div>
                              {clientName && (
                                <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter mb-1 truncate">
                                  <Users className="w-2.5 h-2.5 flex-shrink-0" />
                                  {clientName}
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900/50 px-1.5 py-0.5 rounded-md w-fit">
                                <Clock className="w-2.5 h-2.5 text-indigo-500" />
                                {event.time.split(" - ")[0]}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-8 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                {editingEvent.id ? "Editar Compromisso" : "Novo Compromisso"}
              </h3>
              <button type="button" onClick={() => setEditingEvent(null)} className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-full text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Título do Evento</label>
                <input 
                  type="text" 
                  value={editingEvent.title} 
                  onChange={e => setEditingEvent({...editingEvent, title: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Cliente Vinculado</label>
                <select 
                  value={editingEvent.client_id || ""}
                  onChange={e => setEditingEvent({...editingEvent, client_id: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Nenhum cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Data</label>
                    <input 
                      type="date"
                      value={editingEvent.date}
                      onChange={e => setEditingEvent({...editingEvent, date: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 dark:text-zinc-100 text-sm"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Horário</label>
                    <input 
                      type="text" 
                      value={editingEvent.time} 
                      onChange={e => setEditingEvent({...editingEvent, time: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 dark:text-zinc-100 text-sm"
                      required
                    />
                 </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                {editingEvent.id && (
                  <button type="button" onClick={handleDelete} className="flex-1 bg-red-50 dark:bg-red-500/10 text-red-600 font-bold py-3 rounded-2xl transition-all">Excluir</button>
                )}
                <button type="submit" className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl shadow-lg transition-all">Salvar Alterações</button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
