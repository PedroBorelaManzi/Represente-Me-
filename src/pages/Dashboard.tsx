import React, { useState, useEffect, useCallback } from "react";
import { 
  Users, 
  Calendar as CalendarIcon, 
  FileText, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  ChevronLeft,
  Settings,
  Bell
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeAppointments: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectedGoogle, setConnectedGoogle] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      const { count: clientsCount } = await supabase.from("clients").select("*", { count: 'exact', head: true });
      const { data: ordersData } = await supabase.from("orders").select("value, created_at");
      const { count: apptsCount } = await supabase.from("appointments").select("*", { count: 'exact', head: true }).gte('date', new Date().toISOString());

      const totalRevenue = ordersData?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0;

      setStats({
        totalClients: clientsCount || 0,
        totalOrders: ordersData?.length || 0,
        totalRevenue,
        activeAppointments: apptsCount || 0
      });

      const { data: recent } = await supabase.from("orders").select(`*, clients(name)`).order("created_at", { ascending: false }).limit(5);
      setRecentOrders(recent || []);

      const { data: appts } = await supabase.from("appointments").select(`*, clients(name)`).order("date", { ascending: true });
      setAppointments(appts || []);

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      toast.error("Erro ao carregar dados do painel");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSyncGoogle = async () => {
    setIsSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Agenda sincronizada com Google Calendar");
      setConnectedGoogle(true);
    } catch (err) {
      toast.error("Erro ao sincronizar agenda");
    } finally {
      setIsSyncing(false);
    }
  };

  const onDrop = async (e: React.DragEvent, hour: number, day: Date) => {
    e.preventDefault();
    const apptId = e.dataTransfer.getData("appointmentId");
    if (!apptId) return;

    try {
      const { data: appt } = await supabase.from('appointments').select('*').eq('id', apptId).single();
      if (!appt) return;

      const [startH, startM] = appt.time.split(' - ')[0].split(':').map(Number);
      const [endH, endM] = appt.time.split(' - ')[1].split(':').map(Number);
      
      const durationMin = (endH * 60 + endM) - (startH * 60 + startM);
      
      const newDate = new Date(day);
      newDate.setHours(hour, 0, 0, 0);

      let newTime = "";
      if (durationMin > 0) {
        const finalStartH = hour;
        const finalStartM = 0;
        const newEndMin = (finalStartH * 60 + finalStartM) + durationMin;
        const finalEndH = Math.floor(newEndMin / 60);
        const finalEndM = newEndMin % 60;
        
        newTime = `${String(finalStartH).padStart(2, '0')}:${String(finalStartM).padStart(2, '0')} - ${String(finalEndH).padStart(2, '0')}:${String(finalEndM).padStart(2, '0')}`;
      } else {
        newTime = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`;
      }

      const { error } = await supabase
        .from('appointments')
        .update({ date: newDate.toISOString().split('T')[0], time: newTime })
        .eq('id', apptId);

      if (error) throw error;
      toast.success("Compromisso reagendado");
      fetchDashboardData();
    } catch (err) {
      console.error("Error updating appointment:", err);
      toast.error("Erro ao reagendar");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-[0.8] mb-4">
            Painel de Controle
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bem-vindo de volta ao seu centro de comando</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSyncGoogle}
            disabled={isSyncing}
            className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-600 dark:text-zinc-400 hover:border-emerald-500 transition-all active:scale-95 disabled:opacity-50">
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar Google
          </button>
          <button className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 group">
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total de Clientes" 
          value={stats.totalClients} 
          icon={<Users className="w-6 h-6" />} 
          trend="+12%" 
          trendUp={true} 
        />
        <StatCard 
          label="Vendas Realizadas" 
          value={stats.totalOrders} 
          icon={<FileText className="w-6 h-6" />} 
          trend="+5%" 
          trendUp={true} 
        />
        <StatCard 
          label="Faturamento Total" 
          value={stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          icon={<TrendingUp className="w-6 h-6" />} 
          trend="+8%" 
          trendUp={true} 
        />
        <StatCard 
          label="Próximas Visitas" 
          value={stats.activeAppointments} 
          icon={<CalendarIcon className="w-6 h-6" />} 
          trend="Estável" 
          trendUp={null} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-zinc-900 rounded-[48px] border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                  <Calendar className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Agenda de Visitas</h3>
              </div>
              <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                {(['month', 'week', 'day'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                      view === v ? "bg-white dark:bg-zinc-700 text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <h4 className="text-2xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">
                    {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </h4>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Hoje
                </button>
              </div>

              <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-zinc-800 rounded-3xl overflow-hidden border border-slate-100 dark:border-zinc-800">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="bg-slate-50/50 dark:bg-zinc-800/50 py-4 text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{day}</span>
                  </div>
                ))}
                {eachDayOfInterval({
                  start: startOfWeek(startOfMonth(currentDate)),
                  end: endOfWeek(endOfMonth(currentDate))
                }).map((day, idx) => {
                  const dayAppts = appointments.filter(a => isSameDay(new Date(a.date), day));
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "bg-white dark:bg-zinc-900 min-h-[120px] p-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 relative group",
                        !isCurrentMonth && "opacity-30"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-black transition-all",
                        isToday(day) ? "bg-emerald-600 text-white w-8 h-8 flex items-center justify-center rounded-xl" : "text-slate-900 dark:text-zinc-100"
                      )}>
                        {format(day, 'd')}
                      </span>
                      
                      <div className="mt-4 space-y-1">
                        {dayAppts.slice(0, 3).map((appt) => (
                          <div 
                            key={appt.id}
                            className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 border-l-2 border-emerald-500 rounded-r-md overflow-hidden"
                          >
                            <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase truncate">
                              {appt.clients?.name}
                            </p>
                          </div>
                        ))}
                        {dayAppts.length > 3 && (
                          <p className="text-[8px] font-black text-slate-400 uppercase px-2">+{dayAppts.length - 3} mais</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Vendas Recentes</h3>
              <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">Ver Todas</button>
            </div>
            
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-zinc-800/50 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-zinc-700 transition-all cursor-pointer group"
                  onClick={() => navigate(`/clients/${order.client_id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-zinc-800 group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-zinc-100 uppercase truncate max-w-[120px]">
                        {order.clients?.name}
                      </p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {format(new Date(order.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-zinc-100">
                      {order.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/30 transition-colors" />
            <h3 className="text-xl font-black uppercase tracking-tight mb-6">Metas do Mês</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Faturamento</span>
                  <span className="text-xs font-black uppercase">75%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Novos Clientes</span>
                  <span className="text-xs font-black uppercase">40%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "40%" }}
                    className="h-full bg-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, trendUp }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all">
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-8">
          <div className="p-3 bg-slate-50 dark:bg-zinc-800 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
            {icon}
          </div>
          {trend && (
            <div className={cn(
              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
              trendUp === true ? "bg-emerald-100 text-emerald-700" : 
              trendUp === false ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
            )}>
              {trend}
            </div>
          )}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter leading-none">{value}</h3>
        </div>
      </div>
    </div>
  );
}
