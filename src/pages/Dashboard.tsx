import { useEffect, useState } from "react";
import { 
  Users, Building2, ShoppingCart, TrendingUp, AlertCircle, 
  Map as MapIcon, Calendar, ArrowUpRight, ArrowDownRight, 
  Search, Filter, Plus, Home, ChevronRight, CheckCircle2,
  Clock, CalendarDays, ExternalLink, RefreshCw, Crown, BarChart3, Star
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import RevenueChart from "../components/RevenueChart";
import MasterReport from "../components/MasterReport";
import WeeklyCalendar from "../components/WeeklyCalendar";
import { syncGoogleEvents } from "../lib/googleSync";
import { getHolidays, formatDateLocal } from "../lib/holidayService";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeCompanies: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      try {
        const [clientsRes, ordersRes, companiesRes] = await Promise.all([
          supabase.from("clients").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase.from("orders").select("total_amount, company_id").eq("user_id", user.id),
          supabase.from("companies").select("id, name").eq("user_id", user.id),
        ]);

        const totalRevenue = ordersRes.data?.reduce((acc: any, order: any) => acc + (order.total_amount || 0), 0) || 0;

        if (ordersRes.data && companiesRes.data) {
           const revMap: Record<string, number> = {};
           ordersRes.data.forEach(o => {
              if (o.company_id) revMap[o.company_id] = (revMap[o.company_id] || 0) + (o.total_amount || 0);
           });
           
           const chartData = companiesRes.data.map(c => ({
              name: c.name,
              value: revMap[c.id] || 0
           })).sort((a,b) => b.value - a.value).slice(0, 6);
           
           setRevenueData(chartData);
        }

        setStats({
          totalClients: clientsRes.count || 0,
          totalOrders: ordersRes.data?.length || 0,
          totalRevenue,
          activeCompanies: companiesRes.data?.length || 0,
        });

        const holidays = await getHolidays();
        setEvents((holidays || []).map(h => ({
            id: h.name, title: h.name, date: h.date, type: 'holiday', description: (h as any).location || 'Brasil'
        })));

        const gToken = localStorage.getItem(`google_access_token_\${user.id}`);
        if (gToken) {
          setGoogleConnected(true);
          const gEvents = await syncGoogleEvents(user.id);
          if (gEvents) {
            setEvents(prev => [
                ...prev,
                ...gEvents.map((ge: any) => ({
                    id: ge.id, title: ge.summary, date: ge.start?.date || ge.start?.dateTime?.split('T')[0], type: 'google', description: ge.description || 'Google Calendar'
                }))
            ]);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user]);

  const handleGoogleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
        const gEvents = await syncGoogleEvents(user.id);
        if (gEvents) {
            toast.success("Agenda Google sincronizada!");
            const holidays = await getHolidays();
            setEvents([
                ...(holidays || []).map(h => ({ id: h.name, title: h.name, date: h.date, type: 'holiday', description: (h as any).location })),
                ...gEvents.map((ge: any) => ({
                    id: ge.id, title: ge.summary, date: ge.start?.date || ge.start?.dateTime?.split('T')[0], type: 'google', description: ge.description || 'Google Calendar'
                }))
            ]);
        }
    } catch (e) {
        toast.error("Falha ao sincronizar Google Calendar");
    } finally {
        setIsSyncing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
            <Home className="w-6 h-6" /> Início
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={handleGoogleSync} disabled={isSyncing || !googleConnected} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold shadow-sm hover:border-indigo-500 transition-all disabled:opacity-50">
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                {isSyncing ? "Sincronizando..." : "Atualizar Agenda"}
            </button>
            <div className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-wider shadow-lg shadow-indigo-200 dark:shadow-none">
                {settings.subscription_plan}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
           <WeeklyCalendar />
           
           <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm relative">
             <div className="flex items-center justify-between mb-8">
               <div>
                 <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Faturamento por Empresa</h2>
                 <p className="text-sm text-slate-500 font-medium">Resumo baseado nos pedidos lançados</p>
               </div>
               <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl"><TrendingUp className="w-6 h-6 text-indigo-600" /></div>
             </div>
             <div className="h-[400px]">
               <RevenueChart data={revenueData} loading={loading} />
             </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-100 dark:border-zinc-800 p-8 shadow-sm h-full flex flex-col">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2"><Clock className="w-4 h-4" /> Compromissos de Hoje</h4>
              <div className="space-y-4 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
                {events.filter(e => e.date === formatDateLocal(new Date())).length === 0 ? (
                  <div className="py-20 text-center">
                    <Calendar className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Nenhum compromisso para hoje</p>
                  </div>
                ) : (
                  events.filter(e => e.date === formatDateLocal(new Date())).map((ev, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 hover:border-indigo-500 transition-all group">
                        <div className={cn("w-1 shrink-0 rounded-full", ev.type === 'holiday' ? "bg-red-400" : "bg-indigo-400")} />
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black uppercase truncate text-slate-900 dark:text-white">{ev.title}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{ev.description}</p>
                        </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
