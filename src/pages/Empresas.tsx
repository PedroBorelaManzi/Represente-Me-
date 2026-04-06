import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, Filter, FileText, Download, MoreHorizontal, Mail, Phone, Calendar, DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle, X, Upload, Loader2, Building2, LayoutGrid, Table as TableIcon, FileSpreadsheet, ArrowRight, ExternalLink } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../contexts/SettingsContext";

export default function EmpresasPage() {
  const { user } = useAuth();
  const { settings, loading: settingsLoading, updateSettings } = useSettings();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [itemsLimit, setItemsLimit] = useState(25);
  const [syncStatus, setSyncStatus] = useState<{current: number, total: number} | null>(null);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);

  // 1. OTIMIZAO: useMemo para evitar travamentos em cada render
  const filteredOrders = useMemo(() => {
    return (allOrders || []).filter(o => 
      selectedCategory === "all" || o.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [allOrders, selectedCategory]);

  const catTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    (settings?.categories || []).forEach(cat => {
        totals[cat] = (allOrders || [])
            .filter(o => o.category.toLowerCase() === cat.toLowerCase())
            .reduce((s, o) => s + (o.value || 0), 0);
    });
    return totals;
  }, [allOrders, settings?.categories]);

  const totalGeral = useMemo(() => {
    return Object.values(catTotals).reduce((sum, val) => sum + val, 0);
  }, [catTotals]);

  const totalCategory = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.value || 0), 0);
  }, [filteredOrders]);

  // Infinite Scroll Handler
  useEffect(() => {
    if (!scrollSentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && filteredOrders.length > itemsLimit) {
        setItemsLimit(prev => prev + 25);
      }
    }, { threshold: 0.1 });
    obs.observe(scrollSentinelRef.current);
    return () => obs.disconnect();
  }, [filteredOrders.length, itemsLimit]);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    
    // OTIMIZAO: Limite inicial para carregamento instantneo
    const { data: dbOrders, error } = await supabase
      .from("orders")
      .select(`
        id,
        category,
        value,
        file_name,
        file_path,
        created_at,
        client_id,
        clients (name)
      `)
      .order("created_at", { ascending: false })
      .limit(300);

    if (!error && dbOrders) {
      const orders = dbOrders.map((o: any) => ({
        id: o.id,
        name: o.file_name || o.file_path?.split("/").pop() || "Pedido",
        category: o.category,
        value: o.value,
        clientName: o.clients?.name || "Cliente",
        clientId: o.client_id,
        created_at: o.created_at
      }));
      setAllOrders(orders);
    }
    setLoading(false);
  };

  const performDeepSync = async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setLoading(true);
    
    try {
      const { data: clients } = await supabase.from("clients").select("id, name, user_id").limit(100);
      if (!clients) return;

      if (!isSilent) setSyncStatus({ current: 0, total: clients.length });

      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        const { data: files } = await supabase.storage.from("client_vault").list(`${client.user_id}/${client.id}`, { limit: 20 });
        
        if (files && files.length > 0) {
            const clientOrders = files.map(file => {
               const parts = file.name.split("___");
               const cat = parts[0];
               const valStr = parts[1]?.replace("VALOR_", "") || "0";
               return {
                  user_id: user.id, client_id: client.id, category: cat,
                  value: parseFloat(valStr) || 0, file_name: file.name,
                  file_path: `${client.user_id}/${client.id}/${file.name}`,
                  status: "concluido"
               };
            });
            if (clientOrders.length > 0) {
                await supabase.from("orders").upsert(clientOrders, { onConflict: "client_id,file_path" });
            }
        }
        if (!isSilent) setSyncStatus({ current: i + 1, total: clients.length });
      }
      await loadOrders();
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      if (!isSilent) setLoading(false);
      setSyncStatus(null);
    }
  };

  useEffect(() => { if (!settingsLoading && user) loadOrders(); }, [user, settingsLoading]);

  const stats = [
    { label: "Faturamento Geral", value: totalGeral, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Pedidos Processados", value: allOrders.length, isCount: true, icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Média por Pedido", value: totalGeral / (allOrders.length || 1), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" }
  ];

  return (
    <div className="p-6 space-y-8 bg-slate-50 dark:bg-zinc-950 min-h-screen text-slate-900 dark:text-zinc-100">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 italic tracking-tight uppercase"><Building2 className="w-10 h-10 text-indigo-600"/> EMPRESAS</h1>
          <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-widest">Análise de faturamento por fabricante e categoria</p>
        </div>
        <button onClick={() => performDeepSync()} disabled={loading} className="px-6 py-3 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
          {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>} Sincronizar Tudo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border dark:border-zinc-800 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform`}/>
            <stat.icon className={`w-8 h-8 ${stat.color} mb-4`}/>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-3xl font-black mt-1 tabular-nums">{stat.isCount ? stat.value : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stat.value)}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[40px] border dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b dark:border-zinc-800 flex flex-wrap gap-3 items-center justify-between bg-slate-50/50 dark:bg-zinc-950/50">
          <div className="flex gap-2 p-1 bg-white dark:bg-zinc-900 rounded-[20px] border dark:border-zinc-800 overflow-x-auto max-w-full">
            <button onClick={() => setSelectedCategory("all")} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === "all" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}>Todos</button>
            {(settings?.categories || []).map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedCategory === cat ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}>
                {cat} <span className="opacity-40 text-[8px] ml-1">({new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(catTotals[cat] || 0)})</span>
              </button>
            ))}
          </div>
          <div className="text-right">
             <span className="text-[10px] font-black text-slate-400 uppercase">Subtotal {selectedCategory}</span>
             <p className="font-black text-indigo-600 text-xl tabular-nums">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCategory)}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estabelecimento</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Documento</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoria</th>
                <th className="p-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor</th>
                <th className="p-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-zinc-850">
               {loading && allOrders.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-300"/><p className="text-xs font-black uppercase text-slate-400 mt-4">Carregando faturamentos...</p></td></tr>
               ) : filteredClients.length === 0 ? (
                 <tr><td colSpan={5} className="p-20 text-center"><p className="text-xs font-black uppercase text-slate-400">Nenhum pedido encontrado nesta categoria</p></td></tr>
               ) : filteredOrders.slice(0, itemsLimit).map((order) => (
                  <tr key={order.id} className="group hover:bg-slate-50 dark:hover:bg-zinc-950 transition-colors">
                    <td className="p-6">
                       <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-black">{order.clientName[0]}</div>
                          <span className="text-sm font-black italic">{order.clientName}</span>
                       </div>
                    </td>
                    <td className="p-6">
                       <div className="flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">
                          <FileText className="w-4 h-4"/> <span className="truncate max-w-[150px]">{order.name}</span>
                       </div>
                    </td>
                    <td className="p-6">
                       <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase">{order.category}</span>
                    </td>
                    <td className="p-6 text-right font-black tabular-nums group-hover:scale-110 transition-transform origin-right">
                       {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.value)}
                    </td>
                    <td className="p-6 text-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(order.created_at).toLocaleDateString("pt-BR")}</span>
                    </td>
                  </tr>
               ))}
            </tbody>
          </table>
          <div ref={scrollSentinelRef} className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
