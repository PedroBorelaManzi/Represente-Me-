> import { useEffect, useState } from "react";
> import { 
>   Users, Building2, ShoppingCart, TrendingUp, AlertCircle, 
>   Map as MapIcon, Calendar, ArrowUpRight, ArrowDownRight, 
>   Search, Filter, Plus, Home, ChevronRight, CheckCircle2,
>   Clock, CalendarDays, ExternalLink, RefreshCw, Crown, BarChart3, Star
> } from "lucide-react";
> import { supabase } from "../lib/supabase";
> import { useAuth } from "../contexts/AuthContext";
> import { useSettings } from "../contexts/SettingsContext";
> import { motion, AnimatePresence } from "framer-motion";
> import { cn } from "../lib/utils";
> import RevenueChart from "../components/RevenueChart";
> import MasterReport from "../components/MasterReport";
> import { syncGoogleEvents } from "../lib/googleSync";
> import { getHolidays, formatDateLocal } from "../lib/holidayService";
> import { toast } from "sonner";
> import { Link } from "react-router-dom";
> 
> export default function Dashboard() {
>   const { user } = useAuth();
>   const { settings } = useSettings();
>   const [stats, setStats] = useState({
>     totalClients: 0,
>     totalOrders: 0,
>     totalRevenue: 0,
>     activeCompanies: 0,
>   });
>   const [revenueData, setRevenueData] = useState<any[]>([]);
>   const [loading, setLoading] = useState(true);
>   const [events, setEvents] = useState<any[]>([]);
>   const [googleConnected, setGoogleConnected] = useState(false);
>   const [isSyncing, setIsSyncing] = useState(false);
> 
>   const isMaster = settings.subscription_plan === 'Master';
> 
>   useEffect(() => {
>     async function loadDashboardData() {
>       if (!user) return;
>       try {
>         const [clientsRes, ordersRes, companiesRes] = await Promise.all([
>           supabase.from("clients").select("id", { count: "exact" }).eq("user_id", user.id),
>           supabase.from("orders").select("total_amount, company_id").eq("user_id", user.id),
>           supabase.from("companies").select("id, name").eq("user_id", user.id),
>         ]);
> 
>         const totalRevenue = ordersRes.data?.reduce((acc: any, order: any) => acc + (order.total_amount || 0), 0) || 0;
> 
>         // Process Revenue per Company
>         if (ordersRes.data && companiesRes.data) {
>            const revMap: Record<string, number> = {};
>            ordersRes.data.forEach(o => {
>               if (o.company_id) {
>                  revMap[o.company_id] = (revMap[o.company_id] || 0) + (o.total_amount || 0);
>               }
>            });
>            
>            const chartData = companiesRes.data.map(c => ({
>               name: c.name,
>               value: revMap[c.id] || 0
>            })).sort((a,b) => b.value - a.value).slice(0, 6);
>            
>            setRevenueData(chartData);
>         }
> 
>         setStats({
>           totalClients: clientsRes.count || 0,
>           totalOrders: ordersRes.data?.length || 0,
>           totalRevenue,
>           activeCompanies: companiesRes.data?.length || 0,
>         });
> 
>         // Load Local/Holiday Events
>         const holidays = await getHolidays();
>         setEvents((holidays || []).map(h => ({
>             id: h.name,
>             title: h.name,
>             date: h.date,
>             type: (h as any).type === 'Feriado' ? 'holiday' : 'event',
>             description: (h as any).location || 'Brasil'
>         })));
> 
>         // Check Google Connection
>         const gToken = localStorage.getItem(`google_access_token_${user.id}`);
>         if (gToken) {
>           setGoogleConnected(true);
>           const gEvents = await syncGoogleEvents(user.id);
>           if (gEvents && gEvents.length > 0) {
>             setEvents(prev => [
>                 ...prev,
>                 ...gEvents.map((ge: any) => ({
>                     id: ge.id,
>                     title: ge.summary,
>                     date: ge.start?.date || ge.start?.dateTime?.split('T')[0],
>                     type: 'google',
>                     description: ge.description || 'Google Calendar'
>                 }))
>             ]);
>           }
>         }
>       } catch (error) {
>         console.error("Erro ao carregar dashboard:", error);
>       } finally {
>         setLoading(false);
>       }
>     }
> 
>     loadDashboardData();
>   }, [user]);
> 
>   const handleGoogleSync = async () => {
>     if (!user) return;
>     setIsSyncing(true);
>     try {
>         const gEvents = await syncGoogleEvents(user.id);
>         if (gEvents) {
>             toast.success("Agenda Google sincronizada!");
>             const holidays = await getHolidays();
>              setEvents([
>                 ...(holidays || []).map(h => ({ id: h.name, title: h.name, date: h.date, type: 'holiday', description: (h as any).location })),
>                 ...gEvents.map((ge: any) => ({
>                     id: ge.id,
>                     title: ge.summary,
>                     date: ge.start?.date || ge.start?.dateTime?.split('T')[0],
>                     type: 'google',
>                     description: ge.description || 'Google Calendar'
>                 }))
>             ]);
>         }
>     } catch (e) {
>         console.error(e);
>         toast.error("Falha ao sincronizar Google Calendar");
>     } finally {
>         setIsSyncing(false);
>     }
>   };
> 
>   if (loading) {
>     return (
>       <div className="flex items-center justify-center h-full">
>         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
>       </div>
>     );
>   }
> 
>   return (
>     <div className="space-y-8 animate-in fade-in duration-500">
>       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
>         <div>
>           <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
>             <Home className="w-6 h-6" /> Início
>           </div>
>           <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Dashboard</h1>
>           <p className="text-slate-500 dark:text-zinc-400 font-medium">Bem-vindo de volta, {user?.email?.split('@')[0]}</p>
>         </div>
>         <div className="flex items-center gap-3">
>             <button 
>                 onClick={handleGoogleSync}
>                 disabled={isSyncing || !googleConnected}
>                 className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold shadow-sm hover:border-indigo-500 transition-all disabled:opacity-50"
>             >
>                 <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
>                 {isSyncing ? "Sincronizando..." : "Atualizar Agenda"}
>             </button>
>             <div className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-wider shadow-lg shadow-indigo-200 dark:shadow-none">
>                 {settings.subscription_plan}
>             </div>
>         </div>
>       </div>
> 
>       {/* Agenda Quick Access */}
>       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
>         <motion.div 
>             initial={{ y: 20, opacity: 0 }}
>             animate={{ y: 0, opacity: 1 }}
>             className="lg:col-span-2 p-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] shadow-2xl relative overflow-hidden group"
>         >
>             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
>                 <CalendarDays className="w-48 h-48 text-white" />
>             </div>
>             
>             <div className="relative z-10 flex flex-col h-full justify-between gap-8">
>                 <div>
>                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-[0.2em]">Sua Agenda</span>
>                    <p className="text-3xl lg:text-4xl text-white font-black mt-4 leading-tight">
>                         Você tem <span className="text-amber-300">{events.filter(e => e.date === formatDateLocal(new Date())).length}</span> compromissos para hoje.
>                    </p>
>                 </div>
>                 
>                 <div className="flex flex-wrap items-center gap-4">
>                     <div className="flex items-center gap-2 text-white/90 font-bold bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
>                         <div className={cn("w-2 h-2 rounded-full", googleConnected ? "bg-green-400" : "bg-red-400")} />
>                         {googleConnected ? "Google Sincronizado" : "Google não conectado"}
>                     </div>
>                 </div>
>             </div>
>         </motion.div>
> 
>         <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-100 dark:border-zinc-800 p-6 flex flex-col gap-4">
>             <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Próximos Eventos</h3>
>             <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
>                 {events.slice(0, 5).map((ev, i) => (
>                     <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 hover:border-indigo-500 transition-all group">
>                         <div className={cn(
>                             "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
>                             ev.type === 'holiday' ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"
>                         )}>
>                             {ev.type === 'holiday' ? <AlertCircle className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
>                         </div>
>                         <div className="min-w-0 flex-1">
>                             <p className="text-xs font-black uppercase truncate text-slate-900 dark:text-white">{ev.title}</p>
>                             <p className="text-[10px] font-bold text-slate-400 mt-0.5">{ev.date} • {ev.description}</p>
>                         </div>
>                         <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
>                     </div>
>                 ))}
>             </div>
>         </div>
>       </div>
> 
>       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
>         <StatCard title="Total Clientes" value={stats.totalClients} icon={Users} color="indigo" />
>         <StatCard title="Total Pedidos" value={stats.totalOrders} icon={ShoppingCart} color="amber" />
>         <StatCard title="Total Faturamento" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)} icon={TrendingUp} color="emerald" />
>         <StatCard title="Representadas" value={stats.activeCompanies} icon={Building2} color="violet" />
>       </div>
> 
>       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
>         <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm relative">
>           <div className="flex items-center justify-between mb-8">
>             <div>
>               <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Faturamento por Empresa</h2>
>               <p className="text-sm text-slate-500 font-medium">Resumo baseado nos pedidos lançados</p>
>             </div>
>             <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl"><TrendingUp className="w-6 h-6 text-indigo-600" /></div>
>           </div>
>           <div className="h-[350px]">
>             <RevenueChart data={revenueData} loading={loading} />
>           </div>
>         </div>
> 
>         {isMaster ? (
>             <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm">
>                 <div className="flex items-center justify-between mb-8">
>                     <div>
>                         <div className="flex items-center gap-2 mb-1">
>                             <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
>                             <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Master Intelligence</span>
>                         </div>
>                         <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Relatório BI Master</h2>
>                     </div>
>                     <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl"><BarChart3 className="w-6 h-6 text-amber-600" /></div>
>                 </div>
>                 <div className="h-[350px]"><MasterReport /></div>
>             </div>
>         ) : (
>              <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-[32px] border border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col justify-center items-center text-center">
>                 <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
>                     <Star className="absolute top-10 left-10 w-20 h-20 text-white" />
>                     <Star className="absolute bottom-20 right-10 w-32 h-32 text-white" />
>                 </div>
>                 <Crown className="w-16 h-16 text-amber-400 mb-6 drop-shadow-glow" />
>                 <h3 className="text-2xl font-black text-white uppercase mb-2 tracking-tighter">Desbloqueie o BI Master</h3>
>                 <p className="text-zinc-400 max-w-sm mb-8 font-medium">Tenha acesso a análise preditiva, insights de mercado e relatórios avançados de faturamento por categoria.</p>
>                 <Link to="/dashboard/planos" className="px-8 py-4 bg-amber-500 text-black font-black uppercase rounded-2xl shadow-xl shadow-amber-900/20 hover:scale-105 transition-transform active:scale-95">Seja Premium Agora</Link>
>              </div>
>         )}
>       </div>
>     </div>
>   );
> }
> 
> function StatCard({ title, value, icon: Icon, color }: any) {
>   const colors: any = {
>     indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
>     amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
>     emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
>     violet: "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
>   };
> 
>   return (
>     <motion.div 
>       whileHover={{ y: -5 }}
>       className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm relative overflow-hidden"
>     >
>       <div className={cn("inline-flex p-3 rounded-2xl mb-4", colors[color])}>
>         <Icon className="w-6 h-6" />
>       </div>
>       <div>
>         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
>         <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
>       </div>
>     </motion.div>
>   );
> }
