import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar as CalendarIcon,
  Loader2,
  Globe,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Navigation, Activity,
  Clock,
  Users
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import AppointmentForm from "../components/AppointmentForm";
import { syncGoogleEvents, pushEventToGoogle, deleteEventFromGoogle } from "../lib/googleSync";
import { fetchHolidays, getClientLocations, Holiday } from "../lib/holidayService";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type Appointment = {
  id: string;
  title: string;
  date: string;
  time: string;
  client_id?: string;
  google_event_id?: string;
};

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (d1: Date, d2String: string) => {
  return formatDateLocal(d1) === d2String;
};

export default function Agenda() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMobileDate, setSelectedMobileDate] = useState(new Date());
  const [events, setEvents] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);

    const { data: tokenData } = await supabase
      .from("user_google_tokens")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    setGoogleConnected(!!tokenData);

    const { data: clientsData } = await supabase.from("clients").select("id, name, city, state, cnpj").order("name");
    setClients(clientsData || []);

    const locations = (clientsData || []).filter(c => c.city).map(c => ({ city: c.city, state: c.state }));
    const fetchedHolidays = await fetchHolidays(currentDate.getFullYear(), locations);
    setHolidays(fetchedHolidays);

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id);

    if (!error) setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [user, currentDate.getFullYear()]);

  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    const toastId = toast.loading("Sincronizando com o Calendário Google...");
    const res = await syncGoogleEvents(user.id);
    if (res.success) {
      toast.success(res.message, { id: toastId });
      await fetchEvents();
    } else {
      toast.error(res.message, { id: toastId });
    }
    setIsSyncing(false);
  };

  const handleSave = async (payload: any) => {
    if (!user) return;
    setIsSaving(true);
    const savePayload = { ...payload, user_id: user.id };
    
    let dbResult;
    if (editingEvent?.id) {
      dbResult = await supabase.from("appointments").update(savePayload).eq("id", editingEvent.id).select().single();
    } else {
      dbResult = await supabase.from("appointments").insert([savePayload]).select().single();
    }

    if (!dbResult.error && dbResult.data) {
      await pushEventToGoogle(user.id, dbResult.data);
      await fetchEvents();
      toast.success("Evento orquestrado com sucesso!");
    }
    
    setIsSaving(false);
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleDelete = async () => {
    if (!editingEvent?.id || !window.confirm("Deseja realmente excluir este compromisso?")) return;
    setIsSaving(true);
    const { error } = await supabase.from("appointments").delete().eq("id", editingEvent.id);
    if (!error && editingEvent.google_event_id) {
      await deleteEventFromGoogle(user.id, editingEvent.google_event_id);
    }
    if (!error) {
      await fetchEvents();
      toast.success("Evento removido.");
    }
    setIsSaving(false);
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleGoogleConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error("Google Client ID ná£o configurado.");
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
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    while (days.length < 42) days.push(null);
    return days;
  };

  const daysArray = getDaysInMonth(currentDate);

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("eventId", id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("eventId");
    if (!id || !user) return;

    const eventToMove = events.find(ev => ev.id === id);
    if (!eventToMove || eventToMove.date === targetDate) return;

    setEvents(events.map(ev => ev.id === id ? { ...ev, date: targetDate } : ev));

    const { data, error } = await supabase
      .from("appointments")
      .update({ date: targetDate })
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      await pushEventToGoogle(user.id, data);
      await fetchEvents();
      toast.success("Data reordenada via radar.");
    }
  };

  const selectedDayEvents = useMemo(() => {
    const dateIso = formatDateLocal(selectedMobileDate);
    return events.filter(e => e.date === dateIso && (e.title.toLowerCase().includes(searchFilter.toLowerCase()) || clients.find(c => c.id === e.client_id)?.name.toLowerCase().includes(searchFilter.toLowerCase()))).sort((a,b) => a.time.localeCompare(b.time));
  }, [events, selectedMobileDate, searchFilter, clients]);

  return (
    <div className="h-full flex flex-col gap-0 pb-0">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 lg:px-0">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-4 uppercase tracking-tight">
            <div className="p-3 bg-emerald-600 rounded-[20px] ">
              <CalendarIcon className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
            </div>
            Agenda <span className="hidden lg:inline text-slate-200 dark:text-zinc-800 ml-2">/</span> <span className="text-emerald-600">Sincronizada</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 font-medium">Orquestraçáo de visitas e monitoramento de feriados locais.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-auto">
              <input 
                type="text" 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)} 
                placeholder="Filtrar compromissos..." 
                className="pl-10 pr-4 py-4 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[24px] text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-emerald-500/10 w-full sm:w-64" 
              />
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-900 p-2 rounded-[24px] border border-slate-100 dark:border-zinc-800 w-full sm:w-auto">
               {googleConnected && (
                  <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="p-4 bg-white dark:bg-zinc-800 rounded-2xl text-emerald-600 shadow-sm active:scale-95 transition-all"
                  >
                     <RefreshCw className={cn("w-6 h-6", isSyncing && "animate-spin")} />
                  </button>
               )}
               <button 
                onClick={handleGoogleConnect}
                className={cn(
                  "flex-1 px-6 py-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-sm",
                  googleConnected ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-white dark:bg-zinc-800 text-slate-400 hover:text-emerald-600 border border-slate-100 dark:border-zinc-800"
                )}
               >
                <Globe className="w-5 h-5 text-emerald-600" />
                <span className="truncate">{googleConnected ? "Google Calendar Ativo" : "Conectar Calendário"}</span>
               </button>
            </div>
            <button 
              onClick={() => { setEditingEvent({ id: '', title: '', date: formatDateLocal(selectedMobileDate), time: '09:00 - 10:00' }); setIsModalOpen(true); }}
              className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[24px] font-black uppercase text-[11px] tracking-widest transition-all shadow-[0_20px_40px_-10px_rgba(99,102,241,0.4)] active:scale-95 flex items-center justify-center gap-3 group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Agendar Visita
            </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-950 lg:rounded-none border-none shadow-none flex flex-col min-h-[600px] relative mt-6">
        <div className="p-4 lg:p-8 border-b border-slate-200 dark:border-zinc-700/50 flex items-center justify-between bg-emerald-600/5 dark:bg-emerald-900/10">
          <div className="flex items-center gap-4 lg:gap-6">
             <div className="flex items-center bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 lg:p-3 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 transition-all active:scale-90"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 lg:p-3 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 transition-all active:scale-90"><ChevronRight className="w-5 h-5" /></button>
             </div>
             <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
             </h2>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
               <Activity className="w-3.5 h-3.5" />
               {events.length} Compromissos
            </span>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:flex flex-1 flex-col overflow-x-auto lg:overflow-x-visible custom-scrollbar">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 sticky top-0 z-20 min-w-[1000px] lg:min-w-0">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="py-6 text-center text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em]">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 flex-1 min-w-[1000px] lg:min-w-0 divide-x divide-y divide-slate-200 dark:divide-zinc-700/50">
            {daysArray.map((date, i) => {
              const dateIso = date ? formatDateLocal(date) : null;
              const isToday = dateIso === formatDateLocal(new Date());
              const dayEvents = dateIso ? events.filter(e => e.date === dateIso && (e.title.toLowerCase().includes(searchFilter.toLowerCase()) || clients.find(c => c.id === e.client_id)?.name.toLowerCase().includes(searchFilter.toLowerCase()))) : [];
              const dayHolidays = holidays.filter(h => h.date === dateIso);

              return (
                <div 
                  key={i} 
                  className={cn(
                    "p-4 flex flex-col h-44 lg:h-auto lg:min-h-[120px] overflow-hidden transition-all relative group h-full",
                    date ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50/20 dark:bg-zinc-950/10',
                    isToday && 'bg-emerald-50/20 dark:bg-emerald-500/5',
                    i % 7 === 0 || i % 7 === 6 ? 'bg-slate-50/10 dark:bg-zinc-950/5' : ''
                  )}
                  onDragOver={onDragOver}
                  onDrop={(e) => dateIso && onDrop(e, dateIso)}
                  onClick={() => date && dateIso && (setEditingEvent({ id: '', title: '', date: dateIso, time: '09:00 - 10:00' }), setIsModalOpen(true))}
                >
                  {date && (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn(
                          "text-xs font-black w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                          isToday ? "bg-emerald-600 text-white shadow-lg  dark:shadow-none" : "text-slate-400 dark:text-zinc-500 group-hover:text-emerald-600"
                        )}>
                          {date.getDate()}
                        </span>
                        {dayHolidays.length > 0 && (
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-sm shadow-amber-200" />
                        )}
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-[148px] pr-1">
                        {dayHolidays.map((h, idx) => (
                          <div 
                            key={idx} 
                            onClick={(e) => { e.stopPropagation(); setSelectedHoliday(h); }}
                            className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-[8px] font-black text-amber-700 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-800/20 flex items-center gap-2 shadow-sm cursor-help hover:scale-105 transition-all" 
                          >
                             <div className="w-1 h-1 rounded-full bg-amber-500" />
                             <span className="truncate flex-1 uppercase tracking-tighter">{h.name}</span>
                          </div>
                        ))}

                        {dayEvents.map(event => (
                          <div 
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); setEditingEvent(event); setIsModalOpen(true); }}
                            draggable
                            onDragStart={(e) => onDragStart(e, event.id)}
                            className="text-[9px] font-black p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-300 transition-all cursor-pointer shadow-sm group/item flex flex-col gap-1 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/10 rounded-full -mr-4 -mt-4" />
                            <span className="truncate uppercase tracking-tight relative z-10">{event.title}</span>
                            <span className="text-[7px] text-emerald-400/80 dark:text-emerald-500/60 font-bold relative z-10 uppercase">{event.time}</span>
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

        {/* Mobile View */}
        <div className="lg:hidden flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-zinc-950">
            <div className="p-4 grid grid-cols-7 gap-2 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto custom-scrollbar min-h-[400px] content-start">
                {daysArray.map((date, i) => {
                    if (!date) return <div key={i} className="aspect-square" />;
                    const dateIso = formatDateLocal(date);
                    const isSelected = isSameDay(date, formatDateLocal(selectedMobileDate));
                    const isToday = dateIso === formatDateLocal(new Date());
                    const hasEvents = events.some(e => e.date === dateIso);
                    const hasHolidays = holidays.some(h => h.date === dateIso);

                    return (
                        <button 
                            key={i}
                            onClick={() => setSelectedMobileDate(date)}
                            className={cn(
                                "aspect-square flex flex-col items-center justify-center rounded-2xl transition-all relative",
                                isSelected ? "bg-emerald-600 text-white shadow-xl scale-110 z-10" : "hover:bg-slate-100 dark:hover:bg-zinc-800"
                            )}
                        >
                            <span className={cn("text-sm font-black", isSelected ? "text-white" : isToday ? "text-emerald-600" : "text-slate-700 dark:text-zinc-200")}>
                                {date.getDate()}
                            </span>
                            <div className="flex gap-0.5 mt-1">
                                {hasEvents && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-emerald-500")} />}
                                {hasHolidays && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-amber-500")} />}
                            </div>
                            {isToday && !isSelected && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {selectedMobileDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' })}
                    </h3>
                </div>

                {selectedDayEvents.length > 0 || holidays.some(h => h.date === formatDateLocal(selectedMobileDate)) ? (
                    <div className="space-y-3">
                        {holidays.filter(h => h.date === formatDateLocal(selectedMobileDate)).map((h, idx) => (
                            <div 
                                key={`h-${idx}`}
                                onClick={() => setSelectedHoliday(h)}
                                className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-3xl border border-amber-100 dark:border-amber-800/20 flex items-start gap-4"
                            >
                                <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-xl">
                                    <AlertCircle className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-tighter">{h.name}</h4>
                                    <p className="text-[10px] font-bold text-amber-700/70 dark:text-amber-500/60 uppercase">Feriado {h.type === 'national' ? 'Nacional' : 'Municipal'}</p>
                                </div>
                            </div>
                        ))}

                        {selectedDayEvents.map(event => {
                            const clientName = clients.find(c => c.id === event.client_id)?.name;
                            return (
                                <button 
                                    key={event.id}
                                    onClick={() => { setEditingEvent(event); setIsModalOpen(true); }}
                                    className="w-full text-left p-5 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm flex items-start gap-4 active:scale-[0.98] transition-all group"
                                >
                                    <div className="flex flex-col items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 group-hover:bg-emerald-100 transition-colors">
                                        <Clock className="w-4 h-4 text-emerald-600 mb-1" />
                                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">{event.time.split(' - ')[0]}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-base font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight truncate">{event.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{event.time}</span>
                                            {clientName && (
                                                <>
                                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">@{clientName}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-[40px] shadow-sm border border-slate-100 dark:border-zinc-800 flex items-center justify-center mb-6">
                            <CalendarIcon className="w-10 h-10 text-slate-200 dark:text-zinc-700" />
                        </div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">Agenda Livre</h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 max-w-[220px] font-medium">Ná£o encontramos nenhum compromisso orquestrado para este dia.</p>
                        <button 
                            onClick={() => { setEditingEvent({ id: '', title: '', date: formatDateLocal(selectedMobileDate), time: '09:00 - 10:00' }); setIsModalOpen(true); }}
                            className="mt-8 px-8 py-4 bg-emerald-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95 transition-all"
                        >
                            Agendar Visita
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
           <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsModalOpen(false); setEditingEvent(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} className="relative z-[10001] w-full max-w-lg">
                <AppointmentForm
                  appointment={editingEvent}
                  onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
                  onSaved={fetchEvents}
                  clients={clients}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  isSaving={isSaving}
                />
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Holiday Premium Modal */}
      <AnimatePresence>
        {selectedHoliday && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedHoliday(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[48px] shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden relative z-[11001]">
                <div className="p-10">
                   <div className="flex justify-between items-start mb-8">
                     <div className="flex items-center gap-4">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-[24px]">
                           <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-none mb-2">{selectedHoliday.name}</h3>
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full uppercase tracking-widest">
                               {selectedHoliday.type === "national" ? "Nacional" : "Municipal"}
                             </span>
                           </div>
                        </div>
                     </div>
                     <button onClick={() => setSelectedHoliday(null)} className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-400 hover:text-red-500 transition-all"><X className="w-6 h-6"/></button>
                   </div>
                   
                   <div className="p-6 bg-slate-50 dark:bg-zinc-800/10 rounded-[32px] border border-slate-100 dark:border-zinc-800 mb-8">
                      <div className="flex items-center gap-3 mb-4 text-slate-400">
                         <Navigation className="w-4 h-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest">{selectedHoliday.city || "Território Nacional"}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 leading-relaxed">
                        Este  um feriado oficial. Fique atento á s alterações nos seus compromissos e planeje-se com antecedência para otimizar suas visitas a clientes nesta regiá£o.
                      </p>
                   </div>

                   <button onClick={() => setSelectedHoliday(null)} className="w-full py-6 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-[32px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all">Entendido</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

