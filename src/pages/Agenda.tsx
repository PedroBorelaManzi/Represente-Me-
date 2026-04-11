import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCcw,
  Loader2,
  CalendarDays,
  CalendarCheck2,
  Settings as SettingsIcon,
  Search,
  Check,
  X,
  Bell,
  Sparkles,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'sonner';

export default function Agenda() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadEvents = async () => {
    if (!user) return;
    setLoading(true);
    // Aqui usaremos os eventos mockados ou do banco localmente enquanto a sync do Google Calendar est rodando
    const { data } = await supabase
      .from('orders')
      .select('created_at, clients(name), total_amount')
      .eq('user_id', user.id)
      .limit(10);
    
    // Transformar pedidos em eventos de agenda para visualizao
    const orderEvents = (data || []).map(o => ({
      id: Math.random().toString(),
      title: `Pedido: ${o.clients?.name}`,
      start: new Date(o.created_at),
      type: 'order',
      amount: o.total_amount
    }));

    setEvents(orderEvents);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, [user]);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const startOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const syncWithGoogle = () => {
    setIsSyncing(true);
    // Simulao de chamada para API do Google
    setTimeout(() => {
      setIsSyncing(false);
      toast.success('Agenda sincronizada com Google Calendar!');
    }, 2000);
  };

  const days = Array.from({ length: daysInMonth(currentDate) }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startOfMonth(currentDate) }, (_, i) => i);
  
  const monthNames = [
    "Janeiro", "Fevereiro", "Maro", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
             <CalendarDays className="w-6 h-6" /> Agendamento
           </div>
           <h1 className='text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight'>Planejamento de Visitas</h1>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={syncWithGoogle} 
             disabled={isSyncing}
             className="px-6 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
           >
             {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
             Sincronizar Google
           </button>
           <button onClick={() => setShowAddModal(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
             <Plus className="w-4 h-4" /> Novo Compromisso
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        {/* Calendrio Principal */}
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden">
           <div className="px-8 py-6 border-b dark:border-zinc-850 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/20">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-3">
                <CalendarCheck2 className="w-5 h-5 text-indigo-600" />
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex items-center gap-2">
                 <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all"><ChevronLeft className="w-5 h-5" /></button>
                 <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg">Hoje</button>
                 <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all"><ChevronRight className="w-5 h-5" /></button>
              </div>
           </div>

           <div className="flex-1 grid grid-cols-7">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sb'].map(day => (
                <div key={day} className="py-4 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest border-b dark:border-zinc-850">{day}</div>
              ))}
              {emptyDays.map(i => (
                <div key={`empty-${i}`} className="border-b border-r dark:border-zinc-850 last:border-r-0 bg-slate-50/30 dark:bg-zinc-950/20" />
              ))}
              {days.map(day => {
                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
                const dayEvents = events.filter(e => e.start.getDate() === day && e.start.getMonth() === currentDate.getMonth());
                
                return (
                  <div key={day} className="min-h-[100px] p-2 border-b border-r dark:border-zinc-850 last:border-r-0 hover:bg-slate-50/50 dark:hover:bg-zinc-850/30 transition-all group overflow-hidden">
                    <span className={cn(
                      "inline-flex items-center justify-center w-7 h-7 text-xs font-black rounded-lg mb-2",
                      isToday ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 group-hover:text-indigo-600"
                    )}>{day}</span>
                    <div className="space-y-1">
                       {dayEvents.map((e, idx) => (
                         <div key={idx} className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-[8px] font-bold text-indigo-700 dark:text-indigo-400 truncate uppercase">
                           {e.title}
                         </div>
                       ))}
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Sidebar de Eventos do Dia */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
           <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100 dark:shadow-none relative overflow-hidden">
              <Sparkles className="absolute top-[-20px] right-[-20px] w-32 h-32 opacity-10" />
              <div className="relative">
                 <h3 className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-4">Agenda Inteligente</h3>
                 <p className="text-lg font-black leading-tight mb-6 uppercase tracking-tighter">Voce tem 3 visitas sugeridas para esta semana.</p>
                 <button className="w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/20">Ver sugestes (IA)</button>
              </div>
           </div>

           <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 p-8 shadow-sm flex flex-col overflow-hidden">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2"><Clock className="w-4 h-4" /> Prximos Eventos</h3>
              <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
                 {events.length > 0 ? events.map((e, idx) => (
                   <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-indigo-600 before:rounded-full">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{e.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase truncate">{e.title.replace('Pedido: ', '')}</p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400 font-bold uppercase">
                         <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> So Paulo - SP</span>
                      </div>
                   </div>
                 )) : (
                   <div className="text-center py-10">
                      <CalendarIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Sem eventos prximos</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
