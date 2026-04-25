import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search, FileText, Upload, Loader2, ShoppingBag, Trash2, ArrowUpRight, TrendingUp, DollarSign, Calendar, ChevronRight, Filter, MoreVertical, ShieldCheck, Zap, Layers, X, Sparkles, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { processOrderFile } from "../lib/orderProcessor";
import { getHighPrecisionCoordinates } from "../lib/geminiGeocoding";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function PedidosPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzingManual, setIsAnalyzingManual] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => { if (user) { loadData();  } }, [user]);

  

  const loadData = async () => {
    setLoading(true);
    const { data: o } = await supabase.from("orders").select("*, client:clients(id, name, cnpj, city, state)").eq("user_id", user?.id).order("created_at", { ascending: false });
    const { data: c } = await supabase.from("clients").select("id, name, cnpj").eq("user_id", user?.id).order("name");
    setOrders(o || []); setClients(c || []); setLoading(false);
  };

  const registerNewClient = async (name: string, cnpj: string, address: string) => {
    const cleanCnpj = cnpj ? cnpj.replace(/\D/g, "") : "";
    const cleanName = name?.trim();
    if (cleanCnpj) {
      const { data: existing } = await supabase.from("clients").select("id").eq("cnpj", cleanCnpj).eq("user_id", user?.id).maybeSingle();
      if (existing) return existing;
    }
    if (cleanName) {
      const { data: existingName } = await supabase.from("clients").select("id").eq("name", cleanName).eq("user_id", user?.id).maybeSingle();
      if (existingName) return existingName;
    }
    let lat = -23.5505, lng = -46.6333;
    if (address) { try { const coords = await getHighPrecisionCoordinates(address, name, cnpj); if (coords) { lat = coords.lat; lng = coords.lng; } } catch (e) {} }
    const { data, error } = await supabase.from("clients").insert([{ user_id: user?.id, name: cleanName, cnpj: cleanCnpj, address: address || "", lat, lng, status: "Ativo" }]).select().single();
    if (error) throw error; loadData(); return data;
  };

  const handleManualFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSelectedFile(file); setIsAnalyzingManual(true);
    try {
      const result = await processOrderFile(file, clients.map(c => c.name), settings.categories || []);
      if (result.status === "ready") {
        setAnalysisResult(result); setOrderValue(result.value?.toString() || "");
        const cleanResCnpj = result.cnpj?.replace(/\D/g, "");
        const cleanResName = result.client?.trim().toLowerCase();
        const match = clients.find(c => {
          const clientCnpj = c.cnpj?.replace(/\D/g, "");
          const clientName = c.name?.trim().toLowerCase();
          return (cleanResCnpj && clientCnpj === cleanResCnpj) || (clientName && clientName === cleanResName);
        });
        if (match) { setSelectedClient(match.id); setShowNewClientForm(false); } else { setShowNewClientForm(true); setSelectedClient(""); }
        if (result.category) {
          const catMatch = (settings.categories || []).find((cat: string) => cat.toLowerCase().includes(result.category.toLowerCase()));
          if (catMatch) setSelectedCategory(catMatch);
        }
      }
    } catch (err) {} finally { setIsAnalyzingManual(false); }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !selectedCategory || !orderValue || !selectedFile) return;
    setIsSaving(true);
    try {
      let cid = selectedClient;
      if (showNewClientForm && analysisResult) {
        const n = await registerNewClient(analysisResult.client, analysisResult.cnpj, analysisResult.address);
        if (n) cid = n.id;
      }
      const cleanName = selectedFile.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
      const formattedName = `${selectedCategory}___VALOR_${orderValue}___${cleanName}`;
      const path = `${user.id}/${cid}/${formattedName}`;
      await supabase.storage.from("client_vault").upload(path, selectedFile, { upsert: true });
      await supabase.from("orders").upsert([{ user_id: user.id, client_id: cid, category: selectedCategory, value: parseFloat(orderValue), file_name: formattedName, file_path: path, status: "concluido" }], { onConflict: "client_id,file_path" });
      const { data: clientData } = await supabase.from("clients").select("faturamento").eq("id", cid).single();
      if (clientData) {
        const fat = clientData.faturamento || {};
        const updatedFat = { ...fat, [selectedCategory]: (Number(fat[selectedCategory] || 0) + parseFloat(orderValue)) };
        await supabase.from("clients").update({ faturamento: updatedFat }).eq("id", cid);
      }
      setIsManualModalOpen(false); loadData();
      toast.success("Pedido registrado com sucesso!");
    } catch (err: any) { toast.error(err.message); } finally { setIsSaving(false); }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); setIsProcessingBatch(true);
    for (const file of files) {
      try {
        const res = await processOrderFile(file, clients.map(c => c.name), settings.categories || []);
        const cleanResCnpj = res.cnpj?.replace(/\D/g, "");
        const cleanResName = res.client?.trim().toLowerCase();
        const match = clients.find(c => {
          const clientCnpj = c.cnpj?.replace(/\D/g, "");
          const clientName = c.name?.trim().toLowerCase();
          return (cleanResCnpj && clientCnpj === cleanResCnpj) || (clientName && clientName === cleanResName);
        });
        setBatchResults(prev => [...prev, { file, client: res.client, category: res.category, value: res.value, needsNewClient: !match, clientId: match?.id, address: res.address, cnpj: res.cnpj }]);
      } catch (err) {} 
    }
    setIsProcessingBatch(false);
  };

  const confirmBatchOrder = async (res: any) => {
    try {
      let cid = res.clientId;
      if (res.needsNewClient) { const n = await registerNewClient(res.client, res.cnpj, res.address); if (n) cid = n.id; }
      const cleanName = res.file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
      const formattedName = `${res.category}___VALOR_${res.value}___${cleanName}`;
      const path = `${user?.id}/${cid}/${formattedName}`;
      await supabase.storage.from("client_vault").upload(path, res.file, { upsert: true });
      await supabase.from("orders").upsert([{ user_id: user?.id, client_id: cid, category: res.category, value: res.value, file_name: formattedName, file_path: path, status: "concluido" }], { onConflict: "client_id,file_path" });
      const { data: clientData } = await supabase.from("clients").select("faturamento").eq("id", cid).single();
      if (clientData) {
        const fat = clientData.faturamento || {};
        const updatedFat = { ...fat, [res.category]: (Number(fat[res.category] || 0) + res.value) };
        await supabase.from("clients").update({ faturamento: updatedFat }).eq("id", cid);
      }
      setBatchResults(prev => prev.filter(item => item.file !== res.file)); loadData();
      toast.success("Pedido em lote processado!");
    } catch (err: any) { alert(err.message); }
  };

  
  const nextMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
  };
  const prevMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  };

  const handleDeleteOrder = async (order: any) => {
    if (!window.confirm("Deseja realmente excluir este pedido?")) return;
    try {
      if (order.file_path) await supabase.storage.from("client_vault").remove([order.file_path]);
      const { error } = await supabase.from("orders").delete().eq("id", order.id);
      if (error) throw error;
      if (order.client_id) {
        const { data: clientData } = await supabase.from("clients").select("faturamento").eq("id", order.client_id).single();
        if (clientData) {
          const fat = clientData.faturamento || {};
          const currentVal = Number(fat[order.category] || 0);
          const updatedFat = { ...fat, [order.category]: Math.max(0, currentVal - (order.value || 0)) };
          await supabase.from("clients").update({ faturamento: updatedFat }).eq("id", order.client_id);
        }
      }
      toast.success("Pedido excluído!");
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  
  const monthlyOrders = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    return orders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [orders, viewDate]);

  const filteredOrders = useMemo(() => {
    return monthlyOrders.filter(o => o.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [monthlyOrders, searchTerm]);

  const stats = useMemo(() => [
    { label: "Faturamento Total Mês", val: monthlyOrders.reduce((a,b)=>a+(b.value||0),0), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", suffix: "BRL" },
    { label: "Total de Pedidos Mês", val: monthlyOrders.length, icon: ShoppingBag, color: "text-emerald-600", bg: "bg-emerald-50", suffix: "Pedidos" },
    { label: "Média por Pedido", val: monthlyOrders.length > 0 ? (monthlyOrders.reduce((a,b)=>a+(b.value||0),0) / monthlyOrders.length) : 0, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", suffix: "BRL" },
  ], [monthlyOrders]);


  return (
    <div className="h-[100dvh] flex flex-col gap-8 md:gap-10 pb-20">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-4 uppercase tracking-tight">
            <div className="p-3 bg-emerald-600 rounded-[20px] ">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            Gestão <span className="text-slate-200 dark:text-zinc-800 ml-2">/</span> <span className="text-emerald-600">Pedidos</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 font-medium">Monitoramento de faturamento e orquestração de registros via IA.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsBatchModalOpen(true)}
              className="px-6 py-4 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[24px] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-all shadow-sm flex items-center gap-3 active:scale-95"
            >
              <Zap className="w-5 h-5" />
              Processar Lote
            </button>
            <button 
              onClick={() => setIsManualModalOpen(true)}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[24px] font-black uppercase text-[11px] tracking-widest transition-all shadow-[0_20px_40px_-10px_rgba(99,102,241,0.4)] active:scale-95 flex items-center gap-3 group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Novo Registro
            </button>
        </div>
      </div>




      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((item, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="p-8 bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-100 dark:border-zinc-850 shadow-sm group hover:border-emerald-200 transition-all"
          >
             <div className="flex items-center justify-between mb-4">
                <div className={cn("p-4 rounded-2xl group-hover:scale-110 transition-transform", item.bg)}>
                   <item.icon className={cn("w-6 h-6", item.color)} />
                </div>
                <div className="p-2 bg-slate-50 dark:bg-zinc-800 rounded-xl group-hover:rotate-12 transition-transform">
                   <ArrowUpRight className="w-4 h-4 text-slate-300" />
                </div>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-2xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">
                      {typeof item.val === 'number' && item.suffix === 'BRL' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(item.val) : item.val}
                   </p>
                   {item.suffix !== 'BRL' && <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{item.suffix}</span>}
                </div>
             </div>
          </motion.div>
        ))}
      </div>

      {/* Main List */}
      <div className="bg-white dark:bg-zinc-950 rounded-[48px] border border-slate-100 dark:border-zinc-850 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Table Controls */}
        <div className="p-8 border-b border-slate-50 dark:border-zinc-850 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30 dark:bg-zinc-950/20">
          <div className="relative group flex-1 max-w-md">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Rastrear registros financeiros..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-8 py-5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[28px] text-xs font-black uppercase tracking-widest text-slate-900 dark:text-zinc-100 focus:ring-8 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-300 shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-4">
             <div className="h-14 px-6 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl flex items-center gap-3 shadow-sm">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ativos:</span>
                <span className="text-sm font-black text-slate-900 dark:text-zinc-100">{filteredOrders.length}</span>
             </div>
          </div>
        </div>

        {/* List View (Desktop) */}
        <div className="hidden md:block flex-1 overflow-x-auto custom-scrollbar">
           <div className="min-w-[900px]">
              <div className="grid grid-cols-12 px-10 py-6 border-b border-slate-50 dark:border-zinc-850 bg-slate-50/10 dark:bg-zinc-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <div className="col-span-4">Cliente / Cliente</div>
                 <div className="col-span-3">Faturamento / Empresa</div>
                 <div className="col-span-2 text-center">Data</div>
                 <div className="col-span-2 text-right">Valor Bruto</div>
                 <div className="col-span-1 text-right">Ações</div>
              </div>

              <div className="divide-y divide-slate-50 dark:divide-zinc-850">
                {filteredOrders.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-4 grayscale opacity-50">
                     <ShoppingBag className="w-16 h-16 text-slate-200" />
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Nenhum registro encontrado</p>
                  </div>
                ) : (
                  filteredOrders.map((order, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={order.id} 
                      className="grid grid-cols-12 px-10 py-8 hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-all group items-center"
                    >
                       <div className="col-span-4 flex items-center gap-5">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl border flex items-center justify-center text-sm font-black uppercase transition-all shadow-sm",
                            i % 2 === 0 ? "bg-white dark:bg-zinc-800 border-slate-100 dark:border-zinc-700 text-slate-300" : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-900/40 text-emerald-600"
                          )}>
                             {order.client?.name?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                             <Link to={`/dashboard/clientes/${order.client_id}`} className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight truncate hover:text-emerald-600 transition-colors flex items-center gap-2 group/link">
                                {order.client?.name || "Cliente Desconhecida"}
                                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-all" />
                             </Link>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{order.client?.cnpj || "N/A"}</span>
                                <span className="text-slate-200">/</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Navigation className="w-3 h-3" /> {order.client?.city || "N/A"}</span>
                             </div>
                          </div>
                       </div>

                       <div className="col-span-3">
                          <div className="flex flex-col gap-2">
                             <span className="px-4 py-1.5 bg-slate-900 dark:bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest rounded-xl w-fit shadow-md">
                                {order.category}
                             </span>
                          </div>
                       </div>

                       <div className="col-span-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-tighter flex flex-col items-center">
                          <Calendar className="w-4 h-4 mb-1 text-slate-200" />
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                       </div>

                       <div className="col-span-2 text-right">
                          <p className="text-base font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter tabular-nums">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
                          </p>
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Processado</span>
                       </div>

                       <div className="col-span-1 text-right flex justify-end gap-2">
                          <button onClick={() => handleDeleteOrder(order)} className="p-4 bg-white dark:bg-zinc-800 rounded-2xl text-slate-300 hover:text-red-500 active:scale-95 transition-all shadow-sm border border-slate-50 dark:border-zinc-700">
                             <Trash2 className="w-5 h-5" />
                          </button>
                       </div>
                    </motion.div>
                  ))
                )}
              </div>
           </div>
        </div>

        {/* Card View (Mobile) */}
        <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-4 grayscale opacity-50">
               <ShoppingBag className="w-16 h-16 text-slate-200" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Nenhum registro encontrado</p>
            </div>
          ) : (
            filteredOrders.map((order, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={order.id} 
                className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col gap-4 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center text-sm font-black text-emerald-600">
                    {order.client?.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={'/dashboard/clientes/' + order.client_id} className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase truncate block">
                      {order.client?.name || "Cliente Desconhecida"}
                    </Link>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{order.client?.cnpj || "N/A"}</p>
                  </div>
                  <button onClick={() => handleDeleteOrder(order)} className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-zinc-800/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Categoria</span>
                    <span className="text-[10px] font-black text-slate-900 dark:text-zinc-100 uppercase">{order.category}</span>
                  </div>
                  <div className="text-right flex flex-col gap-1">
                    <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest leading-none">Valor Bruto</span>
                    <span className="text-sm font-black text-slate-900 dark:text-zinc-100 tracking-tighter">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {order.client?.city || "N/A"}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Manual Order Modal */}
      <AnimatePresence>
        {isManualModalOpen && (
           <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsManualModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} className="bg-white dark:bg-zinc-900 rounded-[56px] border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-xl relative z-[5001] overflow-hidden">
                 <div className="p-10 border-b dark:border-zinc-850 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/20">
                    <div>
                       <h3 className="text-2xl font-black uppercase tracking-tighter">Novo Pedido</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 text-emerald-600">Sincronização Manual de Registro</p>
                    </div>
                    <button onClick={() => setIsManualModalOpen(false)} className="p-4 bg-white dark:bg-zinc-800 rounded-2xl text-slate-300 hover:text-red-500 transition-all shadow-sm"><X className="w-6 h-6" /></button>
                 </div>
                 
                 <form onSubmit={handleManualSubmit} className="p-10 space-y-10">
                    <div className="relative group">
                       <input 
                         type="file" 
                         onChange={handleManualFileChange} 
                         className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                       />
                       <div className="border-4 border-dashed border-slate-100 dark:border-zinc-850 rounded-[40px] p-12 text-center group-hover:bg-slate-50 dark:group-hover:bg-zinc-950 transition-all flex flex-col items-center gap-6">
                          <div className="p-6 bg-white dark:bg-zinc-900 rounded-[32px] shadow-xl text-emerald-600 group-hover:rotate-12 transition-transform">
                             <Upload className="w-8 h-8" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{selectedFile ? selectedFile.name : "Solte o arquivo do pedido aqui"}</p>
                       </div>
                    </div>

                    {isAnalyzingManual && (
                       <div className="flex items-center justify-center gap-3 p-6 bg-emerald-50 dark:bg-emerald-950/40 rounded-[32px] border border-emerald-100 dark:border-emerald-900/40 animate-pulse">
                          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">IA Analisando Metadados...</span>
                       </div>
                    )}

                    {analysisResult && (
                       <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-emerald-50 dark:bg-emerald-500/10 rounded-[32px] border border-emerald-100 dark:border-emerald-900/40">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center text-emerald-600 shadow-sm">
                                <ShieldCheck className="w-6 h-6" />
                             </div>
                             <div>
                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Cliente Detectada</p>
                                <p className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase truncate">{analysisResult.client}</p>
                             </div>
                          </div>
                       </motion.div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-4">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Representada</label>
                          <select 
                            value={selectedCategory} 
                            onChange={e=>setSelectedCategory(e.target.value)} 
                            required 
                            className="w-full p-6 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[28px] text-[10px] font-black uppercase tracking-widest outline-none focus:ring-8 focus:ring-emerald-500/10 transition-all"
                          >
                             <option value="">SELECIONAR</option>
                             {(settings.categories||[]).map((c: string)=>(<option key={c} value={c}>{c}</option>))}
                          </select>
                       </div>
                       <div className="space-y-4">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Valor Estimado</label>
                          <div className="relative">
                             <input 
                               type="text" 
                               value={orderValue} 
                               onChange={e=>setOrderValue(e.target.value)} 
                               required 
                               className="w-full p-6 pl-14 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[28px] text-xl font-black text-emerald-600 outline-none focus:ring-8 focus:ring-emerald-500/10 transition-all"
                             />
                             <div className="absolute left-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">R$</div>
                          </div>
                       </div>
                    </div>

                    <button 
                      disabled={isSaving} 
                      className="w-full py-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[32px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                    >
                       {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                       {isSaving ? "Sincronizando..." : "Efetivar Registro"}
                    </button>
                 </form>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Batch Modal Premium */}
      <AnimatePresence>
        {isBatchModalOpen && (
           <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBatchModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} className="bg-white dark:bg-zinc-900 rounded-[56px] border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-6xl max-h-[90vh] relative z-[6001] overflow-hidden flex flex-col">
                 <div className="p-12 border-b dark:border-zinc-850 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/20">
                    <div>
                       <h3 className="text-3xl font-black uppercase tracking-tighter">Processamento em Lote</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 text-emerald-600">Automação de Alto Desempenho via IA Gemini</p>
                    </div>
                    <button onClick={() => setIsBatchModalOpen(false)} className="p-6 bg-white dark:bg-zinc-800 rounded-2xl text-slate-300 hover:text-red-500 transition-all shadow-sm"><X className="w-8 h-8" /></button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                   {batchResults.length === 0 ? (
                      <div className="h-96 border-4 border-dashed border-slate-100 dark:border-zinc-850 rounded-[56px] flex flex-col items-center justify-center relative group hover:bg-slate-50 dark:hover:bg-zinc-950 transition-all cursor-pointer">
                         <input type="file" multiple onChange={handleBatchUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                         <div className="p-10 bg-white dark:bg-zinc-900 rounded-[48px] shadow-2xl text-emerald-600 mb-8 rotate-12 group-hover:rotate-0 transition-transform">
                            <Sparkles className="w-16 h-16" />
                         </div>
                         <p className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Solte Múltiplos Arquivos</p>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{isProcessingBatch ? "Aguarde, extraindo dados estratégicos..." : "Formatos suportados: PDF, JPG, PNG"}</p>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                        {batchResults.map((r, i) => (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={i} 
                            className="p-10 bg-slate-50 dark:bg-zinc-950/20 rounded-[48px] border border-slate-100 dark:border-zinc-850 flex flex-col gap-8 shadow-sm group hover:border-emerald-200 transition-all"
                          >
                             <div className="flex items-center gap-5">
                                <div className="p-4 bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm">
                                   <FileText className="w-8 h-8 text-emerald-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cliente Detectada</p>
                                   <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase truncate">{r.client}</h4>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm border border-slate-50 dark:border-zinc-850">
                                   <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Representada</p>
                                   <p className="text-[10px] font-black text-slate-900 dark:text-zinc-100 uppercase truncate">{r.category}</p>
                                </div>
                                <div className="p-5 bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm border border-slate-50 dark:border-zinc-850">
                                   <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Valor Final</p>
                                   <p className="text-[10px] font-black text-emerald-600 uppercase tabular-nums">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.value)}</p>
                                </div>
                             </div>

                             <div className="pt-2">
                                <button 
                                  onClick={() => confirmBatchOrder(r)}
                                  className="w-full py-5 bg-emerald-600 text-white rounded-[28px] font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                   <ShieldCheck className="w-4 h-4" />
                                   Efetivar
                                </button>
                             </div>
                          </motion.div>
                        ))}
                      </div>
                   )}
                 </div>

                 {isProcessingBatch && (
                    <div className="p-10 bg-emerald-600 flex items-center justify-center gap-6">
                       <Loader2 className="w-8 h-8 text-white animate-spin" />
                       <div className="flex flex-col">
                          <p className="text-white font-black uppercase tracking-[0.2em] text-sm italic">Inteligência Artificial Ativa</p>
                          <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest">Digitalizando registros financeiros em tempo real</p>
                       </div>
                    </div>
                 )}
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
