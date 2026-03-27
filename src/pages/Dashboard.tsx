import React, { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Clock, X, LayoutDashboard, Loader2, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type EventType = { 
  id: string; 
  title: string; 
  time: string; 
  date: string; 
  client_id?: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventType[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Partial<EventType> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    const d2Date = new Date(d2);
    return d1.getDate() === d2Date.getDate() &&
           d1.getMonth() === d2Date.getMonth() &&
           d1.getFullYear() === d2Date.getFullYear();
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Load Clients
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");
    setClients(clientsData || []);

    // Load Appointments
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

  // Drag and Drop handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("eventId", id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const onDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("eventId");
    if (!id) return;
    
    const isoDate = targetDate.toISOString().split('T')[0];
    
    // Optimistic Update
    setEvents(events.map(ev => 
      ev.id === id ? { ...ev, date: isoDate } : ev
    ));

    // Persist
    await supabase
      .from("appointments")
      .update({ date: isoDate })
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
      // Update
      const { error } = await supabase
        .from("appointments")
        .update(payload)
        .eq("id", editingEvent.id);
      
      if (!error) {
        setEvents(events.map(ev => ev.id === editingEvent.id ? { ...ev, ...payload } as EventType : ev));
      }
    } else {
      // Create
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

  const openNewEventModal = (date: Date) => {
    setEditingEvent({
      title: "",
      time: "09:00 - 10:00",
      date: date.toISOString().split('T')[0],
      client_id: ""
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Início</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Acompanhe seus compromissos e resumo das atividades.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Agenda Semanal */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-14rem)] min-h-[500px]">
          
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/50">
            <h2 className="text-base font-bold text-slate-800 dark:text-zinc-100">
              Agenda Semanal
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-md text-slate-600 dark:text-zinc-400 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 text-xs font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-md text-slate-700 dark:text-zinc-300 transition-colors">
                Hoje
              </button>
              <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-md text-slate-600 dark:text-zinc-400 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1 flex flex-col custom-scrollbar">
            <div className="min-w-[500px] flex-1 flex flex-col">
              <div className="grid grid-cols-7 divide-x divide-slate-200 dark:divide-zinc-800/80 bg-slate-100/50 border-b border-slate-200 dark:bg-zinc-800/20 dark:border-zinc-800 sticky top-0 z-10">
                {weekDays.map((date, i) => {
                  const isToday = isSameDay(date, new Date().toISOString());
                  return (
                    <div key={i} className={`p-2 text-center transition-colors ${isToday ? 'bg-indigo-100/50 dark:bg-indigo-500/20' : ''}`}>
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400'}`}>
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      </div>
                      <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mx-auto ${isToday ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 dark:text-zinc-300'}`}>
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-7 divide-x divide-slate-200 dark:divide-zinc-800/80 flex-1 bg-slate-50/80 dark:bg-zinc-950/50">
                {weekDays.map((date, i) => {
                  const dayEvents = events.filter(e => isSameDay(date, e.date));
                  const isToday = isSameDay(date, new Date().toISOString());
                  
                  return (
                    <div 
                      key={i} 
                      className={`p-1.5 space-y-2 min-h-[300px] ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, date)}
                    >
                      {dayEvents.map(event => {
                        const clientName = clients.find(c => c.id === event.client_id)?.name;
                        return (
                          <div 
                            key={event.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, event.id)}
                            onClick={() => setEditingEvent(event)}
                            className="p-2 rounded-lg border bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing flex flex-col gap-1.5"
                          >
                            <div className="text-[11px] font-bold text-slate-800 dark:text-zinc-100 leading-snug">
                              {event.title}
                            </div>
                            {clientName && (
                              <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter truncate">
                                <Users className="w-2.5 h-2.5" /> {clientName}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 px-1.5 py-0.5 rounded w-fit">
                              <Clock className="w-2.5 h-2.5 text-indigo-500" />
                              {event.time}
                            </div>
                          </div>
                        );
                      })}
                      <button 
                        onClick={() => openNewEventModal(date)}
                        className="w-full h-10 border-2 border-dashed border-transparent hover:border-slate-300 dark:hover:border-zinc-700 rounded-lg transition-colors flex items-center justify-center group"
                      >
                         <Plus className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Espaço Vazio para Futuros Widgets */}
        <div className="hidden lg:flex rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 p-12 text-center text-slate-400 dark:text-zinc-600 flex-col items-center justify-center">
           <LayoutDashboard className="w-8 h-8 opacity-40 mb-3" />
           <p className="text-sm font-medium">Outros painéis e resumos aparecerão aqui</p>
        </div>

      </div>

      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                {editingEvent.id ? "Editar Compromisso" : "Novo Compromisso"}
              </h3>
              <button type="button" onClick={() => setEditingEvent(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Título</label>
                <input 
                  type="text" 
                  value={editingEvent.title} 
                  onChange={e => setEditingEvent({...editingEvent, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Vincular Cliente</label>
                <select 
                  value={editingEvent.client_id || ""}
                  onChange={e => setEditingEvent({...editingEvent, client_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Nenhum cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Horário</label>
                <input 
                  type="text" 
                  value={editingEvent.time} 
                  onChange={e => setEditingEvent({...editingEvent, time: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: 09:00 - 10:00"
                  required
                />
              </div>
              
              <div className="pt-2 flex gap-2">
                {editingEvent.id && (
                  <button 
                    type="button" 
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-medium py-2 rounded-xl transition-colors"
                  >
                    Excluir
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-xl transition-colors flex items-center justify-center"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
