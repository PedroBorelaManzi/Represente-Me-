import React, { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Loader2, Globe, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import AppointmentForm from "../components/AppointmentForm";
import { syncGoogleEvents } from "../lib/googleSync";
import { cn } from "../lib/utils";

type Appointment = {
  id: string;
  title: string;
  date: string;
  time: string;
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
  const [events, setEvents] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);

    const { data: tokenData } = await supabase
      .from("user_google_tokens")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    setGoogleConnected(!!tokenData);

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao buscar eventos:", error);
    } else {
      setEvents(data || []);
    const { data: clientsData } = await supabase.from("clients").select("id, name").order("name");
    setClients(clientsData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    const res = await syncGoogleEvents(user.id);
    alert(res.message);
    if (res.success) {
      await fetchEvents();
    }
    setIsSyncing(false);
  };

  const handleSave = async (payload: any) => {
    if (!user) return;
    setIsSaving(true);
    const savePayload = { ...payload, user_id: user.id };
    if (editingEvent?.id) {
      const { error } = await supabase.from("appointments").update(savePayload).eq("id", editingEvent.id);
      if (!error) await fetchEvents();
    } else {
      const { error } = await supabase.from("appointments").insert([savePayload]);
      if (!error) await fetchEvents();
    }
    setIsSaving(false);
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleDelete = async () => {
    if (!editingEvent?.id || !window.confirm("Deseja realmente excluir este compromisso?")) return;
    setIsSaving(true);
    const { error } = await supabase.from("appointments").delete().eq("id", editingEvent.id);
    if (!error) await fetchEvents();
    setIsSaving(false);
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleGoogleConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert("Erro: Client ID do Google nÃ£o configurado.");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/callback/google`;
    const scope = "https://www.googleapis.com/auth/calendar.events";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const daysArray = getDaysInMonth(currentDate);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
            Agenda
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">Gerencie seus compromissos mensais.</p>
        </div>
      </div>

      <div className="bg-slate-100 dark:bg-zinc-800/40 shadow-inner ring-1 ring-slate-300/60 dark:ring-zinc-700/60 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[500px]">
        <div className="p-4 border-b border-slate-300 dark:border-zinc-700/50 flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-zinc-900 z-20 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-black text-slate-800 dark:text-zinc-100 uppercase tracking-widest leading-none">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              {googleConnected && (
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                  title="Sincronizar Agora"
                >
                   <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
                </button>
              )}
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
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-xl">
              <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-slate-600 dark:text-zinc-400 transition-all"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-slate-600 dark:text-zinc-400 transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <button 
              onClick={() => { setEditingEvent(null); setIsModalOpen(true); }}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-indigo-100 dark:shadow-none uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> Novo
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-x-auto custom-scrollbar">
          <div className="grid grid-cols-7 border-b border-slate-300 dark:border-zinc-700/50 bg-slate-100/30 dark:bg-zinc-950/80 sticky top-0 z-10 min-w-[800px]">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'SÃ¡b'].map(day => (
              <div key={day} className="p-4 text-center text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 flex-1 bg-slate-100 dark:bg-zinc-800/40 shadow-inner ring-1 ring-slate-300/60 dark:ring-zinc-700/60 auto-rows-fr min-w-[800px]">
            {daysArray.map((date, i) => {
              const dateIso = date ? formatDateLocal(date) : null;
              const isToday = dateIso === formatDateLocal(new Date());
              const dayEvents = dateIso ? events.filter(e => e.date === dateIso) : [];
              return (
                <div 
                  key={i} 
                  className={cn(
                    "border-r border-b border-slate-300 dark:border-zinc-700/50/50 p-2 flex flex-col min-h-[120px] transition-all relative group",
                    date ? 'bg-white/60 dark:bg-zinc-900/40' : 'bg-slate-100/20 dark:bg-zinc-950/10',
                    isToday && 'ring-1 ring-inset ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-500/10',
                  )}
                  onClick={() => date && dateIso && (setEditingEvent({ id: '', title: '', date: dateIso, time: '09:00 - 10:00' }), setIsModalOpen(true))}
                >
                  {date && (
                    <>
                      <span className={cn(
                        "text-[10px] font-black mb-2 px-1.5 py-0.5 rounded-md self-start transition-all",
                        isToday ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 dark:text-zinc-500 group-hover:text-indigo-600"
                      )}>
                        {date.getDate()}
                      </span>
                      <div className="space-y-1">
                        {dayEvents.map(event => (
                          <div 
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); setEditingEvent(event); setIsModalOpen(true); }}
                            className="text-[10px] font-bold p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 truncate shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group/item"
                          >
                            <span className="text-indigo-600 dark:text-indigo-400 mr-1 opacity-50">â€¢</span>
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <AppointmentForm
          appointment={editingEvent}
          onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
          onSaved={fetchEvents}
          clients={clients}
          onSave={handleSave}
          onDelete={handleDelete}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}




