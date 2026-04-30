import React, { useState, useEffect, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, Clock, X, Home, Loader2, Users, Globe, RefreshCw, Calendar } from "lucide-react";
import { supabase, logAudit } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { cn } from "../lib/utils";
import { syncGoogleEvents, pushEventToGoogle, deleteEventFromGoogle } from "../lib/googleSync";
import { fetchHolidays, getClientLocations, Holiday } from "../lib/holidayService";
import AppointmentForm from "../components/AppointmentForm";
import RevenueChart from "../components/RevenueChart";
import DailyNotes from "../components/DailyNotes";

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
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [selectedNoteDate, setSelectedNoteDate] = useState(new Date());
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
  const [allTimeCategories, setAllTimeCategories] = useState<string[]>([]);
  const [monthlyOrders, setMonthlyOrders] = useState<any[]>([]);

  const handlePrevMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

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

      // Fetch all unique categories ever used by this user
      const { data: allOrdersCats } = await supabase
        .from("orders")
        .select("category")
        .eq("user_id", user.id);
      
            const catsMap = new Map<string, string>();
      // Add from settings
      if (Array.isArray(cats)) {
        cats.forEach(c => {
          if (c && c.trim()) {
            const trimmed = c.trim();
            catsMap.set(trimmed.toUpperCase(), trimmed);
          }
        });
      }
      // Add from orders
      if (allOrdersCats) {
        allOrdersCats.forEach(o => {
          if (o.category && o.category.trim()) {
            const trimmed = o.category.trim();
            const key = trimmed.toUpperCase();
            if (!catsMap.has(key)) catsMap.set(key, trimmed);
          }
        });
      }
      
      setAllTimeCategories(Array.from(catsMap.values()));


      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name, city, state, faturamento, cnpj")
        .eq("user_id", user.id)
        .order("name");
      setClients(clientsData || []);

      const { data: appData } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id);
      setEvents(appData || []);

      // Fetch Monthly Orders for the chart
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);
      setMonthlyOrders(ordersData || []);


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
    logAudit('ACCESS_DASHBOARD'); loadData(); }, [user, currentDate.getFullYear(), currentDate.getMonth()]);

  // Aggregate revenue data for the chart with dynamic categories
  const revenueChartData = useMemo(() => { try {
    const companyTotals: Record<string, number> = {};
    const normalizedToOriginal: Record<string, string> = {};
    
    // 1. Initialize from EVERY category ever found (Settings + All Orders)
    allTimeCategories.forEach(cat => {
      if (cat && cat.trim()) {
        const originalName = cat.trim();
        const normalized = originalName.toLowerCase();
        companyTotals[normalized] = 0;
        normalizedToOriginal[normalized] = originalName;
      }
    });
    
    // 2. Sum revenue from CURRENT MONTH orders
    monthlyOrders.forEach(order => {
      const rawName = order.category;
      if (rawName && rawName.trim()) {
        const normalized = rawName.trim().toLowerCase();
        companyTotals[normalized] = (companyTotals[normalized] || 0) + (Number(order.value) || 0);
        if (!normalizedToOriginal[normalized]) normalizedToOriginal[normalized] = rawName.trim();
      }
    });

    return Object.keys(companyTotals)
      .map(norm => ({ 
        name: normalizedToOriginal[norm], 
        value: companyTotals[norm] 
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); 
    } catch (e) { console.error("Chart Logic Error:", e); return []; }
  }, [monthlyOrders, allTimeCategories]);

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
          return (hour - 7) * 60 + minute;
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

  const selectedDayEvents = useMemo(() => {
    return events.filter(e => isSameDay(selectedNoteDate, e.date)).sort((a,b) => {
        return a.time.localeCompare(b.time);
    });
  }, [events, selectedNoteDate]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
            <Home className="w-6 h-6 text-emerald-600" />
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
                {weekDays[0]?.toLocaleDateString('pt-BR', { month: 'long' })} {weekDays[0]?.getFullYear()}
              </h2>
              <div className="flex items-center gap-2">
                {googleConnected && (
                  <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    title="Sincronizar Agora"
                  >
                    <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
                  </button>
                )}
                <button 
                  onClick={handleGoogleConnect}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    googleConnected ? "text-emerald-50" : "text-slate-400 hover:text-emerald-600"
                  )}
                  title={googleConnected ? "Google Conectado" : "Conectar Google Agenda"}
                >
                  <Globe className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-xl">
                <button onClick={() => setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; })} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-slate-600 dark:text-zinc-400 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; })} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-slate-600 dark:text-zinc-400 transition-all"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <button 
                onClick={() => openNewEventModal(selectedNoteDate)} 
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-emerald-100 dark:shadow-none uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" /> Novo
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Desktop Weekly Grid */}
            <div className="hidden lg:flex flex-1 min-h-[960px] overflow-auto custom-scrollbar">
              <div className="flex flex-col flex-1 min-w-[1000px] lg:min-w-0">
                <div className="flex bg-slate-100/30 dark:bg-zinc-950/40 border-b border-slate-300 dark:border-zinc-700/50 sticky top-0 z-30 backdrop-blur-md">
                  <div className="w-12 flex-shrink-0 sticky left-0 bg-slate-100 dark:bg-zinc-950/40 z-40 border-r border-slate-200 dark:border-zinc-800" />
                  <div className="flex-1 grid grid-cols-7 divide-x divide-slate-300 dark:divide-zinc-700/50">
                    {weekDays.map((date, i) => {
                      const isToday = isSameDay(date, formatDateLocal(new Date()));
                          return (
                        <div 
                          key={i} 
                          className={cn(
                            "py-2 text-center cursor-pointer hover:bg-slate-200/50 dark:hover:bg-zinc-700/30 transition-colors", 
                            isToday ? "bg-emerald-50/50 dark:bg-emerald-500/10" : "",
                            isSameDay(date, formatDateLocal(selectedNoteDate)) ? "ring-2 ring-emerald-500 ring-inset" : ""
                          )}
                          onClick={() => setSelectedNoteDate(date)}
                        >
                          <div className={cn("text-[6px] font-black uppercase tracking-widest", isToday ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-zinc-500")}>{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</div>
                          <div className={cn("text-[10px] font-black", isToday ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-zinc-100")}>{date.getDate()}</div>

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
                          return (
                        <div key={dayIdx} className={cn("relative h-full", isToday ? "bg-emerald-50/5" : "")}>
                          {HOURS.map(hour => (
                            <div key={hour} className={cn("h-[60px] border-b border-slate-300 dark:border-zinc-700/50 cursor-pointer transition-colors", dragOverInfo?.dayIndex === dayIdx && dragOverInfo?.hour === hour ? "bg-emerald-500/10" : "hover:bg-slate-50/30")} onDragOver={(e) => onDragOver(e, dayIdx, hour)} onDrop={(e) => onDrop(e, date, hour)} onClick={() => openNewEventModal(date, hour)} />
                          ))}
                          <div className="absolute inset-0 pointer-events-none p-0.5">
                            {dayEvents.map(event => {
                              const top = getEventPosition(event.time);
                              const height = getEventHeight(event.time);
                              if (top === null) return null;
                              const clientName = clients.find(c => c.id === event.client_id)?.name;
                                  return (
                                <div key={event.id} draggable onDragStart={(e) => onDragStart(e, event.id)} onClick={(e) => { e.stopPropagation(); setEditingEvent(event); }} className="absolute left-0.5 right-0.5 pointer-events-auto bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm rounded-lg p-1 transition-all cursor-grab active:cursor-grabbing z-10 overflow-hidden ring-1 ring-slate-900/5" style={{ top: `${top}px`, height: `${height}px` }}>
                                  <div className="text-[8px] font-black text-slate-900 dark:text-zinc-100 mb-0.5 truncate leading-tight">{event.title}</div>
                                  {clientName && <div className="text-[6px] font-black text-emerald-600 dark:text-emerald-400 uppercase truncate">@{clientName}</div>}
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

            {/* Mobile Weekly List View */}
            <div className="lg:hidden flex-1 flex flex-col bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto no-scrollbar scroll-smooth">
                    {weekDays.map((date, i) => {
                        const isSelected = isSameDay(date, formatDateLocal(selectedNoteDate));
                        const isToday = isSameDay(date, formatDateLocal(new Date()));
                        return (
                            <button 
                                key={i}
                                onClick={() => { setselectedNoteDate(date); setSelectedNoteDate(date); }}
                                className={cn(
                                    "flex-shrink-0 flex flex-col items-center justify-center w-[54px] h-[78px] rounded-[22px] transition-all relative",
                                    isSelected 
                                      ? "bg-emerald-600 text-white shadow-[0_12px_24px_-8px_rgba(16,185,129,0.5)] scale-105 z-10" 
                                      : "bg-slate-50 dark:bg-zinc-800/50 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-700"
                                )}
                            >
                                <span className={cn("text-[9px] font-black uppercase tracking-tighter mb-1", isSelected ? "text-emerald-50" : "text-slate-400")}>
                                    {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                </span>
                                <span className={cn("text-base font-black", isSelected ? "text-white" : isToday ? "text-emerald-600" : "text-slate-700 dark:text-zinc-200")}>
                                    {date.getDate()}
                                </span>
                                {isToday && !isSelected && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50 dark:bg-zinc-950">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OrquestraÃ§Ã£o do Dia</h3>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-zinc-900 px-3 py-1 rounded-full border border-slate-100 dark:border-zinc-800">
                           {selectedNoteDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                        </span>
                    </div>

                    <div className="mb-2">
                        <DailyNotes selectedDate={selectedNoteDate} className="!p-4 !rounded-[24px] shadow-sm border border-slate-100 dark:border-zinc-800" />
                    </div>

                    {selectedDayEvents.length > 0 ? (
                        <div className="space-y-4">
                            {selectedDayEvents.map(event => {
                                const clientName = clients.find(c => c.id === event.client_id)?.name;
                                return (
                                    <button 
                                        key={event.id}
                                        onClick={() => setEditingEvent(event)}
                                        className="w-full text-left p-5 bg-white dark:bg-zinc-900 rounded-[28px] border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center gap-5 active:scale-[0.98] transition-all group"
                                    >
                                        <div className="flex flex-col items-center justify-center w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-[18px] border border-emerald-100 dark:border-emerald-500/20 flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                            <Clock className="w-4 h-4 mb-1" />
                                            <span className="text-[10px] font-black">{event.time.split(' - ')[0]}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight truncate leading-tight mb-1">{event.title}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{event.time}</span>
                                                {clientName && (
                                                   <>
                                                     <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-zinc-700" />
                                                     <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">@{clientName}</span>
                                                   </>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-6">
                                <Calendar className="w-10 h-10 text-slate-200 dark:text-zinc-700" />
                            </div>
                            <h4 className="text-base font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">Nada agendado</h4>
                            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 max-w-[200px] font-medium uppercase tracking-tight">VocÃª nÃ£o possui compromissos orquestrados para este dia.</p>
                            <button 
                                onClick={() => openNewEventModal(selectedNoteDate)}
                                className="mt-8 px-8 py-4 bg-emerald-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none active:scale-95 transition-all"
                            >
                                <Plus className="w-4 h-4 inline mr-2" /> Novo Registro
                            </button>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>

        {/* Right Column: Revenue Chart (~40% - 2/5 Width, 50% Height) */}
        <div className="lg:col-span-2 h-full flex flex-col gap-6">
           <div className="h-full lg:h-1/2 min-h-[300px]">
              <RevenueChart data={revenueChartData} loading={loading} currentDate={currentDate} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} />
           </div>
           {/* Space below for layout balance */}
           <div className="h-full lg:h-1/2 min-h-[400px] flex flex-col gap-6">
               {/* Daily Agenda Panel */}
               <div className="flex-[1.5] bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-100 dark:border-zinc-800 p-6 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Agenda do Dia</h2>
                        <p className="text-[11px] font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter mt-0.5">
                          {selectedNoteDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' })}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-slate-50 dark:bg-zinc-800 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 dark:border-zinc-700">
                      {selectedDayEvents.length} Atividades
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                    {selectedDayEvents.length > 0 ? (
                      selectedDayEvents.map(event => {
                        const clientName = clients.find(c => c.id === event.client_id)?.name;
                        return (
                          <button 
                            key={event.id}
                            onClick={() => setEditingEvent(event)}
                            className="w-full text-left p-4 bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-slate-100 dark:border-zinc-800/50 hover:border-emerald-500/30 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-sm">
                                <Clock className="w-3 h-3 mb-0.5" />
                                <span className="text-[8px] font-black">{event.time.split(' - ')[0]}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight truncate leading-tight">{event.title}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">{event.time}</span>
                                  {clientName && (
                                    <>
                                      <div className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                                      <span className="text-[8px] font-black text-emerald-600 uppercase">@{clientName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-10 opacity-40">
                         <Calendar className="w-10 h-10 mb-2 text-slate-300" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sem compromissos</p>
                      </div>
                    )}
                  </div>
               </div>

               {/* Daily Notes Panel */}
               <div className="flex-1 min-h-[300px]">
                  <DailyNotes selectedDate={selectedNoteDate} />
               </div>
            </div>
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
