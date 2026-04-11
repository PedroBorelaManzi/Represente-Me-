import React, { useState, useEffect, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, Clock, X, Home, Loader2, Users, Globe, RefreshCw, BarChart3, Calendar as CalendarIcon, TrendingUp, Zap, MapPin, ShoppingCart, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { cn } from "../lib/utils";
import { syncGoogleEvents, pushEventToGoogle, deleteEventFromGoogle } from "../lib/googleSync";
import { fetchHolidays, getClientLocations, Holiday } from "../lib/holidayService";
import AppointmentForm from "../components/AppointmentForm";
import RevenueChart from "../components/RevenueChart";
import MasterReport from "../components/MasterReport";
import { AnimatePresence, motion } from "framer-motion";

type EventType = { id: string; title: string; time: string; date: string; client_id?: string; google_event_id?: string; };
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); 
const formatDateLocal = (date: Date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export default function Dashboard() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventType[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [activeTab, setActiveTab] = useState<'agenda' | 'bi'>('agenda');

  const isMaster = settings.subscription_plan === 'Master';

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: tokenData } = await supabase.from("user_google_tokens").select("id").eq("user_id", user.id).maybeSingle();
      setGoogleConnected(!!tokenData);

      const { data: clientsData } = await supabase.from("clients").select("*").eq("user_id", user.id).order("name");
      setClients(clientsData || []);

      const { data: appData } = await supabase.from("appointments").select("*").eq("user_id", user.id);
      setEvents(appData || []);

      const { data: ordersData } = await supabase.from("orders").select("*, client:clients(name)").eq("user_id", user.id);
      setOrders(ordersData || []);

      const locations = await getClientLocations(user.id);
      const fetchedHolidays = await fetchHolidays(currentDate.getFullYear(), locations);
      setHolidays(fetchedHolidays);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [user, currentDate.getFullYear()]);

  const revenueChartData = useMemo(() => {
    const cats = settings.categories || [];
    const totals: Record<string, number> = {};
    cats.forEach(c => totals[c] = 0);
    clients.forEach(c => {
      Object.entries(c.faturamento || {}).forEach(([cat, val]) => {
        const match = cats.find(uc => uc.toLowerCase() === cat.toLowerCase());
        if (match) totals[match] += Number(val) || 0;
      });
    });
    return cats.map(c => ({ name: c, value: totals[c] }));
  }, [settings.categories, clients]);

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(start); d.setDate(d.getDate() + i); return d;
    });
  }, [currentDate]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center px-2">
        <div>
           <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
             <Home className="w-6 h-6 text-indigo-600" /> Início
           </h1>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Painel de Controle Sincronizado</p>
        </div>
        
        {isMaster && (
          <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
             <button onClick={() => setActiveTab('agenda')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'agenda' ? "bg-white dark:bg-zinc-800 shadow-sm text-indigo-600" : "text-slate-400")}>Agenda</button>
             <button onClick={() => setActiveTab('bi')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'bi' ? "bg-white dark:bg-zinc-800 shadow-sm text-indigo-600" : "text-slate-400")}>BI Master</button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'bi' && isMaster ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.98, y: -10 }} 
            key="bi"
            className="flex-1"
          >
            <MasterReport clients={clients} orders={orders} />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 10 }} 
            key="agenda" 
            className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0"
          >
             <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden min-h-[500px]">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-950/50">
                   <div className="flex items-center gap-4">
                      <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-zinc-200">{weekDays[0].toLocaleDateString('pt-BR', { month: 'long' })}</h2>
                      <div className="flex gap-1">
                        <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate()-7)))} className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                        <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate()+7)))} className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-colors"><ChevronRight className="w-4 h-4"/></button>
                      </div>
                   </div>
                   <button onClick={()=>setEditingEvent({date: formatDateLocal(new Date()), title: "", time: "09:00 - 10:00"})} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 transition-transform active:scale-95">Novo Evento</button>
                </div>
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                   <div className="grid grid-cols-7 gap-4 min-w-[600px]">
                      {weekDays.map((d, i) => (
                        <div key={i} className="space-y-4">
                           <div className="text-center p-2 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/30">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                              <p className={cn("text-lg font-black", d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth() ? "text-indigo-600" : "text-slate-800 dark:text-zinc-200")}>{d.getDate()}</p>
                           </div>
                           <div className="space-y-2">
                              {events.filter(e => e.date === formatDateLocal(d)).map(e => (
                                <motion.div 
                                  key={e.id} 
                                  onClick={()=>setEditingEvent(e)} 
                                  whileHover={{ scale: 1.02 }}
                                  className="p-3 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-2xl cursor-pointer shadow-sm hover:shadow-md transition-all group"
                                >
                                   <p className="text-[10px] font-black uppercase truncate text-slate-800 dark:text-zinc-200">{e.title}</p>
                                   <p className="text-[8px] font-bold text-indigo-600 mt-1 flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" /> {e.time}
                                   </p>
                                </motion.div>
                              ))}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             <div className="lg:col-span-2 space-y-6 flex flex-col">
                <div className="flex-1 min-h-0">
                  <RevenueChart data={revenueChartData} loading={loading} />
                </div>
                
                <div className="p-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[40px] text-white shadow-xl shadow-indigo-100 dark:shadow-none relative overflow-hidden group">
                   <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 blur-2xl rounded-full" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-80 flex items-center gap-2">
                     <Star className="w-3 h-3 fill-amber-300 text-amber-300" /> Insight do Dia
                   </h3>
                   <p className="text-xl font-bold leading-tight relative z-10">Você tem <span className="text-amber-300">{events.filter(e=>e.date === formatDateLocal(new Date())).length}</span> compromissos agendados para hoje.</p>
                   <div className="mt-6 pt-6 border-t border-white/10 text-white/60 text-[10px] font-medium uppercase tracking-widest">
                      {googleConnected ? "Google Calendar Sincronizado" : "Google Calendar não conectado"}
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {editingEvent && (
        <AppointmentForm 
          appointment={editingEvent} onClose={() => setEditingEvent(null)}
          onSaved={loadData} clients={clients} isSaving={isSaving}
          onSave={async (p) => {
            setIsSaving(true);
            const { data, error } = p.id ? await supabase.from("appointments").update(p).eq("id", p.id).select().single() : await supabase.from("appointments").insert({...p, user_id: user.id}).select().single();
            if (!error) loadData();
            setIsSaving(false); setEditingEvent(null);
          }}
          onDelete={async () => {
            if (editingEvent.id) await supabase.from("appointments").delete().eq("id", editingEvent.id);
            loadData(); setEditingEvent(null);
          }}
        />
      )}
    </div>
  );
}
