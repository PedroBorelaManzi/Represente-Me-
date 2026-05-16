import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search,
  Filter,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Trash2,
  Edit2,
  ExternalLink,
  MessageSquare,
  History,
  LayoutGrid,
  List as ListIcon,
  CalendarDays,
  X,
  FileText,
  User,
  Building2,
  Phone,
  Mail,
  MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, startOfWeek, endOfWeek, isToday, parseISO, startOfDay, addMinutes, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

type ViewType = 'month' | 'week' | 'day' | 'list';

interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  client_id?: string;
  type: 'visit' | 'call' | 'meeting' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  color?: string;
  client?: {
    name: string;
    company_name: string;
  };
}

export default function Agenda() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('week');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('agenda_events')
        .select(`
          *,
          client:clients(name, company_name)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error("Erro ao carregar agenda");
    } finally {
      setLoading(false);
    }
  };

  const nextPeriod = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const prevPeriod = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const subDays = (date: Date, days: number) => addDays(date, -days);

  const getDays = () => {
    if (view === 'month') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else if (view === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    }
    return [currentDate];
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.client?.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || event.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter(event => isSameDay(parseISO(event.start_time), date));
  };

  const renderMonthView = () => {
    const days = getDays();
    return (
      <div className="grid grid-cols-7 border-t border-slate-100 dark:border-zinc-800">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-zinc-800">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          return (
            <div
              key={idx}
              className={cn(
                "min-h-[140px] p-2 border-b border-r border-slate-100 dark:border-zinc-800 transition-colors",
                !isSameMonth(day, currentDate) && "bg-slate-50/50 dark:bg-zinc-900/30",
                isToday(day) && "bg-emerald-50/30 dark:bg-emerald-500/5"
              )}
            >
              <div className="flex justify-between items-center mb-2">
                <span className={cn(
                  "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                  isToday(day) ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-zinc-400"
                )}>
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {dayEvents.length} {dayEvents.length === 1 ? 'Compromisso' : 'Compromissos'}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      setShowEventModal(true);
                    }}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-[10px] font-bold border truncate cursor-pointer transition-all hover:scale-[1.02] shadow-sm",
                      event.color || "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-100 dark:border-zinc-700"
                    )}
                  >
                    {format(parseISO(event.start_time), 'HH:mm')} - {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center py-1">
                    + {dayEvents.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const days = getDays();
    const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 to 21:00

    return (
      <div className="flex flex-col h-full bg-white dark:bg-zinc-950 rounded-[32px] border border-slate-100 dark:border-zinc-800 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
        <div className="flex border-b border-slate-100 dark:border-zinc-800">
          <div className="w-20 shrink-0 border-r border-slate-100 dark:border-zinc-800" />
          <div className="flex-1 grid grid-cols-7">
            {days.map((day, idx) => (
              <div key={idx} className={cn(
                "py-6 text-center border-r border-slate-100 dark:border-zinc-800 last:border-r-0 transition-colors",
                isToday(day) && "bg-emerald-50/30 dark:bg-emerald-500/5"
              )}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  {format(day, 'EEE', { locale: ptBR })}
                </p>
                <p className={cn(
                  "text-lg font-black",
                  isToday(day) ? "text-emerald-600" : "text-slate-900 dark:text-zinc-100"
                )}>
                  {format(day, 'd')}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="flex relative">
            <div className="w-20 shrink-0 border-r border-slate-100 dark:border-zinc-800">
              {hours.map(hour => (
                <div key={hour} className="h-24 px-4 py-2 text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            <div className="flex-1 grid grid-cols-7 relative">
              {days.map((day, dayIdx) => (
                <div key={dayIdx} className="h-full border-r border-slate-100 dark:border-zinc-800 last:border-r-0 relative">
                  {hours.map(hour => (
                    <div key={hour} className="h-24 border-b border-slate-50 dark:border-zinc-900/50" />
                  ))}
                  
                  {getEventsForDay(day).map(event => {
                    const start = parseISO(event.start_time);
                    const end = parseISO(event.end_time);
                    const startHour = start.getHours() + (start.getMinutes() / 60);
                    const endHour = end.getHours() + (end.getMinutes() / 60);
                    const top = (startHour - 7) * 96; // 96px is h-24
                    const height = (endHour - startHour) * 96;

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowEventModal(true);
                        }}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        className={cn(
                          "absolute inset-x-1 p-3 rounded-2xl border text-[10px] font-bold overflow-hidden cursor-pointer shadow-lg hover:z-10 hover:scale-[1.02] transition-all group",
                          /* Garantindo texto branco no modo dark para legibilidade */
                          event.color || "bg-emerald-50 dark:bg-emerald-600 border-emerald-100 dark:border-emerald-500 text-emerald-700 dark:text-white"
                        )}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex items-start justify-between mb-1">
                            <span className="uppercase tracking-widest opacity-80">{format(start, 'HH:mm')}</span>
                            {event.type === 'visit' && <MapPin className="w-3 h-3 opacity-50" />}
                          </div>
                          <p className="font-black text-[11px] leading-tight mb-1 truncate dark:text-white">{event.title}</p>
                          <p className="opacity-70 truncate text-[9px] dark:text-white/90">{event.client?.company_name}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-4 lg:p-10 transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header Smart */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-emerald-600 rounded-[24px] text-white shadow-xl shadow-emerald-500/20">
              <CalendarIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-none mb-2">Agenda</h1>
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={prevPeriod} className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-slate-400 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={nextPeriod} className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-slate-400 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex p-1.5 bg-slate-50 dark:bg-zinc-950 rounded-[20px] border border-slate-100 dark:border-zinc-800">
              {(['month', 'week', 'day', 'list'] as ViewType[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                    view === v ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : v === 'day' ? 'Dia' : 'Lista'}
                </button>
              ))}
            </div>
            
            <button className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 dark:hover:bg-zinc-100 transition-all shadow-xl shadow-slate-900/10">
              <Plus className="w-4 h-4" />
              Novo Evento
            </button>
          </div>
        </div>

        {/* Calendar Body */}
        <div className="min-h-[700px]">
          {loading ? (
            <div className="h-full flex items-center justify-center p-20">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : view === 'week' ? (
            renderWeekView()
          ) : view === 'month' ? (
            <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-100 dark:border-zinc-800 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
              {renderMonthView()}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map(event => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-200/50 dark:shadow-none group hover:-translate-y-2 transition-all duration-500"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={cn(
                      "p-4 rounded-[24px]",
                      event.type === 'visit' ? "bg-blue-50 text-blue-600" :
                      event.type === 'call' ? "bg-emerald-50 text-emerald-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                      {event.type === 'visit' ? <MapPin className="w-6 h-6" /> :
                       event.type === 'call' ? <Phone className="w-6 h-6" /> :
                       <CalendarIcon className="w-6 h-6" />}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                         event.status === 'completed' ? "bg-emerald-500 text-white" :
                         event.status === 'cancelled' ? "bg-red-500 text-white" :
                         "bg-amber-500 text-white"
                       )}>
                         {event.status}
                       </span>
                       <button className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-slate-300">
                         <MoreHorizontal className="w-5 h-5" />
                       </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {format(parseISO(event.start_time), "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </p>
                      <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-none truncate">
                        {event.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-6 pt-4 border-t border-slate-50 dark:border-zinc-800/50">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {format(parseISO(event.start_time), 'HH:mm')} - {format(parseISO(event.end_time), 'HH:mm')}
                        </span>
                      </div>
                    </div>

                    {event.client && (
                      <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm">
                            <Building2 className="w-5 h-5 text-slate-400" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-900 dark:text-zinc-100 truncate uppercase tracking-tight">
                               {event.client.company_name}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 truncate uppercase">
                               {event.client.name}
                            </p>
                         </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      <AnimatePresence>
        {showEventModal && selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEventModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[48px] overflow-hidden shadow-2xl transition-colors duration-300"
            >
              <div className="h-32 bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 flex justify-between items-start">
                <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl text-white">
                  <CalendarIcon className="w-8 h-8" />
                </div>
                <button 
                  onClick={() => setShowEventModal(false)}
                  className="p-3 hover:bg-white/10 rounded-2xl text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 -mt-10 bg-white dark:bg-zinc-900 rounded-t-[48px] relative z-10 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                      {selectedEvent.type}
                    </span>
                    <span className="px-4 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                      {selectedEvent.status}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-none">
                    {selectedEvent.title}
                  </h2>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                    {selectedEvent.description || "Sem descrição adicional."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 dark:bg-zinc-950 rounded-[32px] border border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horário</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">
                      {format(parseISO(selectedEvent.start_time), 'HH:mm')} - {format(parseISO(selectedEvent.end_time), 'HH:mm')}
                    </p>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-zinc-950 rounded-[32px] border border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-2">
                      <CalendarDays className="w-4 h-4 text-emerald-600" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">
                      {format(parseISO(selectedEvent.start_time), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>

                {selectedEvent.client && (
                  <div className="p-8 bg-slate-900 rounded-[40px] text-white flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight mb-1">{selectedEvent.client.company_name}</p>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{selectedEvent.client.name}</p>
                      </div>
                    </div>
                    <button className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button className="flex-1 py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20">
                    Editar Evento
                  </button>
                  <button className="px-8 py-5 border border-red-100 dark:border-red-900/30 text-red-600 rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
