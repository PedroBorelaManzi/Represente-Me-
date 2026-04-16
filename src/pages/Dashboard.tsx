import React, { useState, useEffect, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, Clock, X, Home, Loader2, Users, Globe, RefreshCw } from "lucide-react";
import { supabase, logAudit } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import { syncGoogleEvents, pushEventToGoogle, deleteEventFromGoogle } from "../lib/googleSync";
import { fetchHolidays, getClientLocations, Holiday } from "../lib/holidayService";
import AppointmentForm from "../components/AppointmentForm";
import RevenueChart from "../components/RevenueChart";

type EventType = { 
  id: string; 
  title: string; 
  time: string; 
  date: string; 
  client_id?: string;
  google_event_id?: string;
};

// Extended to 22:00 (16 hours total from 07:00)
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); 

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
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [userCategories, setUserCategories] = useState<string[]>([]);

    const weekDays = useMemo(() => { 
    try { 
      const start = new Date(currentDate); 
      const day = start.getDay(); 
      start.setDate(start.getDate() - day); 
      start.setHours(0,0,0,0); 
      return Array.from({ length: 7 }).map((_, i) => { 
        const d = new Date(start); 
        d.setDate(d.getDate() + i); 
        return d; 
      }); 
    } catch(e) { 
      console.error("weekDays error:", e); 
      return []; 
    } 
  }, [currentDate]);

  const isSameDay = (d1: Date, d2: string) => { 
    if (!d1 || !d2) return false; 
    return formatDateLocal(d1) === d2; 
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Check Google Connection
      const { data: tokenData } = await supabase
        .from("user_google_tokens")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setGoogleConnected(!!tokenData);

      // Fetch categories from user settings
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("categories")
        .eq("user_id", user.id)
        .maybeSingle();
      const cats = settingsData?.categories; setUserCategories(Array.isArray(cats) ? cats : []);

      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name, city, state, faturamento")
        .eq("user_id", user.id)
        .order("name");
      setClients(clientsData || []);

      const { data: appData } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id);
      setEvents(appData || []);

      // Fetch Holidays
      const locations = await getClientLocations(user.id);
      const fetchedHolidays = await fetchHolidays(currentDate.getFullYear(), locations);
      setHolidays(fetchedHolidays);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    logAudit('ACCESS_DASHBOARD'); loadData(); }, [user, currentDate.getFullYear()]);

  // Aggregate revenue data for the chart with dynamic categories
  const revenueChartData = useMemo(() => { try {
    if (!clients.length) return [];
    
    // 1. Start with categories defined in settings
    const uniqueCategories = new Set(userCategories);
    
    // 2. Add all categories that actually have data in clients table
    clients.forEach(client => {
      if (client.faturamento) {
        Object.keys(client.faturamento).forEach(cat => {
          if (cat && cat.trim() && cat.toLowerCase() !== "sad" && cat.toLowerCase() !== "placeholder") {
            // Case-insensitive check before adding to preserve original casing if possible
            const exists = Array.from(uniqueCategories).some(c => c.toLowerCase() === cat.toLowerCase());
            if (!exists) uniqueCategories.add(cat);
          }
        });
      }
    });

    const categoriesArray = Array.from(uniqueCategories).sort();
    const totals: Record<string, number> = {};
    categoriesArray.forEach(cat => totals[cat] = 0);

    clients.forEach(client => {
      const faturamento = client.faturamento || {};
      Object.entries(faturamento).forEach(([cat, val]) => {
        const matchedCat = categoriesArray.find(c => c.toLowerCase() === cat.toLowerCase());
        if (matchedCat) {
          totals[matchedCat] += Number(val) || 0;
        }
      });
    });

    return categoriesArray.map(cat => ({
      name: cat,
      value: totals[cat]
    })).filter(item => item.value > 0); } catch (e) { console.error("Chart Logic Error:", e); return []; }
  }, [userCategories, clients]);

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
      alert("Erro: Client ID do Google nÃ£o configurado.");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/callback/google`;
    const scope = "https://www.googleapis.com/auth/calendar.events";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

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
    
    // Optimistic update
    const movedEvent = events.find(ev => ev.id === id);
    if (!movedEvent) return;
    
    setEvents(events.map(ev => ev.id === id ? { ...ev, date: isoDate, time: newTime } : ev));
    
    const { error } = await supabase.from("appointments").update({ date: isoDate, time: newTime }).eq("id", id);
    if (error) {
       await loadData(); // Rollback on error
       return;
    }

    // Push updated event to Google
    await pushEventToGoogle(user.id, { ...movedEvent, date: isoDate, time: newTime });
  };

  const handleSave = async (payload: any) => {
    if (!user) return;
    setIsSaving(true);
    const savePayload = { ...payload, user_id: user.id };
    
    let savedEvent = null;
    if (editingEvent?.id) {
      const { error } = await supabase.from("appointments").update(savePayload).eq("id", editingEvent.id);
      if (!error) {
        savedEvent = { ...editingEvent, ...savePayload };
        setEvents(events.map(ev => ev.id === editingEvent.id ? savedEvent : ev));
      }
    } else {
      const { data, error } = await supabase.from("appointments").insert([savePayload]).select().single();
      if (!error && data) {
        savedEvent = data;
        setEvents([...events, data]);
      }
    }

    if (savedEvent) {
      await pushEventToGoogle(user.id, savedEvent);
    }

    setIsSaving(false);
    setEditingEvent(null);
  };

  const handleDelete = async () => {
    if (!editingEvent?.id || !window.confirm("Deseja realmente excluir este compromisso?")) return;
    setIsSaving(true);
    const { error } = await supabase.from("appointments").delete().eq("id", editingEvent.id);
    if (!error) {
        if (editingEvent.google_event_id) {
          await deleteEventFromGoogle(user.id, editingEvent.google_event_id);
        }
        setEvents(events.filter(ev => ev.id !== editingEvent.id)); 
        setEditingEvent(null); 
      }
    setIsSaving(false);
  };

  const openNewEventModal = (date: Date, hour?: number) => {
    const timeStr = hour ? `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00` : "09:00 - 10:00";
    setEditingEvent({ title: "", time: timeStr, date: formatDateLocal(date), client_id: "" });
  };

  const getEventPosition = (time: string) => {
    try {
      const start = time.split(" - ")[0];
      const hour = parseInt(start.split(":")[0]);
      const minute = parseInt(start.split(":")[1] || "0");
      if (hour < 7 || hour > 22) return null;
      if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>; if (!weekDays || weekDays.length === 0) return <div className="p-8 text-center text-slate-500">Erro ao processar calendário.</div>; if (loading) return <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-zinc-950"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>; if (!weekDays || weekDays.length === 0) return <div className="flex items-center justify-center h-full text-slate-500">Erro ao carregar calendǭrio.</div>; return (hour - 7) * 60 + minute;
    } catch { return null; }
  };

  const getEventHeight = (time: string) => {
    try {
      const parts = time.split(" - ");
      const start = parts[0].split(":");
      const end = parts[1].split(":");
      const startMin = parseInt(start[0]) * 60 + parseInt(start[1] || "0");
      const endMin = parseInt(end[0]) * 60 + parseInt(end[1] || "0");
      const duration = endMin - startMin;
      return Math.max(duration, 24); // MÃ­nimo de 24px para visibilidade
    } catch { return 48; }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>; if (!weekDays || weekDays.length === 0) return <div className="p-8 text-center text-slate-500">Erro ao processar calendário.</div>; if (loading) return <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-zinc-950"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>; if (!weekDays || weekDays.length === 0) return <div className="flex items-center justify-center h-full text-slate-500">Erro ao carregar calendǭrio.</div>; return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
            <Home className="w-6 h-6 text-indigo-600" />
            InÃ­cio
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">Sua agenda semanal sincronizada e faturamento.</p>
        </div>
      </div>
      
      {/* 5 columns layout main container: 3 for agenda (60%), 2 for chart (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Agenda (Occupying ~60% - 3/5) */}
        <div className="lg:col-span-3 bg-slate-100 dark:bg-zinc-800/40 shadow-inner ring-1 ring-slate-300/60 dark:ring-zinc-700/60 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="p-4 border-b border-slate-300 dark:border-zinc-700/50 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-100 dark:bg-zinc-800/40 z-40 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 uppercase tracking-widest leading-none">
                {weekDays[0].toLocaleDateString('pt-BR', { month: 'long' })} {weekDays[0].getFullYear()}
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
                <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-slate-600 dark:text-zinc-400 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-slate-600 dark:text-zinc-400 transition-all"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <button 
                onClick={() => openNewEventModal(new Date())} 
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-indigo-100 dark:shadow-none uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" /> Novo
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-auto custom-scrollbar relative">
            <div className="flex flex-1 min-h-[960px] overflow-x-auto custom-scrollbar">
              <div className="flex flex-col flex-1 min-w-[500px]">
                <div className="flex bg-slate-100/30 dark:bg-zinc-950/40 border-b border-slate-300 dark:border-zinc-700/50 sticky top-0 z-30 backdrop-blur-md">
                  <div className="w-12 flex-shrink-0 sticky left-0 bg-slate-100 dark:bg-zinc-950/40 z-40 border-r border-slate-200 dark:border-zinc-800" />
                  <div className="flex-1 grid grid-cols-7 divide-x divide-slate-300 dark:divide-zinc-700/50">
                    {weekDays.map((date, i) => {
                      const isToday = isSameDay(date, formatDateLocal(new Date()));
                      if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>; if (!weekDays || weekDays.length === 0) return <div className="p-8 text-center text-slate-500">Erro ao processar calendário.</div>; if (loading) return <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-zinc-950"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>; if (!weekDays || weekDays.length === 0) return <div className="flex items-center justify-center h-full text-slate-500">Erro ao carregar calendǭrio.</div>; return (
                        <div key={i} className={cn("py-2 text-center", isToday ? "bg-indigo-50/50 dark:bg-indigo-500/10" : "")}>
                          <div className={cn("text-[6px] font-black uppercase tracking-widest", isToday ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-zinc-500")}>{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</div>
                          <div className={cn("text-[10px] font-black", isToday ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-zinc-100")}>{date.getDate()}</div>

                          {/* Holidays for this day */}
                          { (holidays || []).filter(h => h && h.date === formatDateLocal(date)).map((h, idx) => (
                            <div key={idx} className="mt-1 px-1 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-[6px] font-black text-amber-700 dark:text-amber-400 rounded-md border border-amber-100 dark:border-amber-800/50 flex items-center gap-1 shadow-sm" title={h.name}>
                              <span className="w-0.5 h-0.5 rounded-full bg-amber-500 flex-shrink-0" />
                              <span className="truncate flex-1 min-w-0">{h.name}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-1">
                  <div className="w-12 flex flex-col bg-slate-100/20 dark:bg-zinc-950/20 border-r border-slate-300 dark:border-zinc-700/50 text-slate-400 flex-shrink-0 sticky left-0 z-30 shadow-sm">
                    {HOURS.map(hour => (
                      <div key={hour} className="h-[60px] text-[8px] font-black text-center py-2 -mt-2 tracking-tight flex items-center justify-center">{String(hour).padStart(2, '0')}:00</div>
                    ))}
                  </div>
                  <div className="flex-1 grid grid-cols-7 divide-x divide-slate-300 dark:divide-zinc-700/50 relative">
                    {weekDays.map((date, dayIdx) => {
                      const dayEvents = (events || []).filter(e => e && isSameDay(date, e.date));
                      const isToday = isSameDay(date, formatDateLocal(new Date()));
                      if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>; if (!weekDays || weekDays.length === 0) return <div className="p-8 text-center text-slate-500">Erro ao processar calendário.</div>; if (loading) return <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-zinc-950"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>; if (!weekDays || weekDays.length === 0) return <div className="flex items-center justify-center h-full text-slate-500">Erro ao carregar calendǭrio.</div>; return (
                        <div key={dayIdx} className={cn("relative h-full", isToday ? "bg-indigo-50/5" : "")}>
                          {HOURS.map(hour => (
                            <div key={hour} className={cn("h-[60px] border-b border-slate-300 dark:border-zinc-700/50 cursor-pointer transition-colors", dragOverInfo?.dayIndex === dayIdx && dragOverInfo?.hour === hour ? "bg-indigo-500/10" : "hover:bg-slate-50/30")} onDragOver={(e) => onDragOver(e, dayIdx, hour)} onDrop={(e) => onDrop(e, date, hour)} onClick={() => openNewEventModal(date, hour)} />
                          ))}
                          <div className="absolute inset-0 pointer-events-none p-0.5">
                            {dayEvents.map(event => {
                              const top = getEventPosition(event.time);
                              const height = getEventHeight(event.time);
                              if (top === null) return null;
                              const clientName = clients.find(c => c.id === event.client_id)?.name;
                              if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>; if (!weekDays || weekDays.length === 0) return <div className="p-8 text-center text-slate-500">Erro ao processar calendário.</div>; if (loading) return <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-zinc-950"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>; if (!weekDays || weekDays.length === 0) return <div className="flex items-center justify-center h-full text-slate-500">Erro ao carregar calendǭrio.</div>; return (
                                <div key={event.id} draggable onDragStart={(e) => onDragStart(e, event.id)} onClick={(e) => { e.stopPropagation(); setEditingEvent(event); }} className="absolute left-0.5 right-0.5 pointer-events-auto bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm rounded-lg p-1 transition-all cursor-grab active:cursor-grabbing z-10 overflow-hidden ring-1 ring-slate-900/5" style={{ top: `${top}px`, height: `${height}px` }}>
                                  <div className="text-[8px] font-black text-slate-900 dark:text-zinc-100 mb-0.5 truncate leading-tight">{event.title}</div>
                                  {clientName && <div className="text-[6px] font-black text-indigo-600 dark:text-indigo-400 uppercase truncate">@{clientName}</div>}
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
        </div>

        {/* Right Column: Revenue Chart (~40% - 2/5 Width, 50% Height) */}
        <div className="lg:col-span-2 h-full flex flex-col gap-6">
           <div className="h-1/2 min-h-[300px]">
              <RevenueChart data={revenueChartData} loading={loading} />
           </div>
           {/* Space below for layout balance */}
           <div className="hidden lg:block h-1/2" />
        </div>

      </div>

      {editingEvent && (
        <AppointmentForm 
          appointment={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={loadData}
          clients={clients}
          onSave={handleSave}
          onDelete={handleDelete}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
