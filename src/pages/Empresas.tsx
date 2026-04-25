import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, 
  Plus, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Settings, 
  X, 
  Check, 
  Loader2, 
  Upload, 
  ShoppingBag, 
  ArrowUpRight, 
  Zap,
  LayoutGrid
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

export default function EmpresasPage() {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [viewDate, setViewDate] = useState(new Date());
  const [managingCompany, setManagingCompany] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const formatCurrency = (val: any) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*, client:clients(name)")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllOrders(data || []);
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setLoading(false);
    }
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

  const monthlyOrders = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    return (allOrders || []).filter(o => {
      if (!o || !o.created_at) return false;
      const d = new Date(o.created_at);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [allOrders, viewDate]);

  const combinedCategories = useMemo(() => {
    const cats = new Set<string>();
    // First add categories from settings
    if (settings?.categories) {
      settings.categories.forEach((cat: string) => {
        if (cat) cats.add(cat);
      });
    }
    // Then add categories found in orders
    if (Array.isArray(allOrders)) {
      allOrders.forEach(o => { 
        if (o && o.category) cats.add(o.category); 
      });
    }
    return Array.from(cats);
  }, [allOrders, settings?.categories]);

  const catTotals = useMemo(() => {
    const currentMonthly = monthlyOrders || [];
    return combinedCategories.reduce((acc: any, cat: string) => {
      acc[cat] = currentMonthly
        .filter(o => o && o.category && o.category.toLowerCase() === cat.toLowerCase())
        .reduce((sum, o) => sum + (Number(o.value) || 0), 0);
      return acc;
    }, {});
  }, [combinedCategories, monthlyOrders]);

  const totalGeral = useMemo(() => (monthlyOrders || []).reduce((sum, o) => sum + (Number(o.value) || 0), 0), [monthlyOrders]);

  const ordersToday = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
    return (allOrders || []).filter(o => o && o.created_at && o.created_at.startsWith(today)).length;
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    const currentMonthly = monthlyOrders || [];
    if (selectedCategory === "all") return currentMonthly;
    return currentMonthly.filter(o => o && o.category && o.category.toLowerCase() === selectedCategory.toLowerCase());
  }, [selectedCategory, monthlyOrders]);

  
  const handleUpdateCompany = async () => {
    if (!managingCompany || !editName.trim()) return;
    try {
      const updatedCategories = settings.categories.map((c: string) => 
        c === managingCompany ? editName.trim() : c
      );
      await updateSettings({ categories: updatedCategories });
      
      // Update orders if they use this category
      const { error } = await supabase
        .from("orders")
        .update({ category: editName.trim() })
        .eq("user_id", user?.id)
        .eq("category", managingCompany);
      
      toast.success("Empresa atualizada!");
      setManagingCompany(null);
      loadOrders();
    } catch (err) {
      toast.error("Erro ao atualizar.");
    }
  };

  const handleDeleteCompany = async (name: string) => {
    if (!window.confirm("Deseja realmente excluir a empresa " + name + "?")) return;
    try {
      const updatedCategories = settings.categories.filter((c: string) => c !== name);
      await updateSettings({ categories: updatedCategories });
      toast.success("Empresa removida.");
      setManagingCompany(null);
    } catch (err) {
      toast.error("Erro ao remover.");
    }
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      const currentCategories = settings.categories || [];
      if (currentCategories.some((c: string) => c.toLowerCase() === newCat.trim().toLowerCase())) {
        toast.error("Empresa já cadastrada.");
        return;
      }
      await updateSettings({ categories: [...currentCategories, newCat.trim()] });
      toast.success("Empresa \"" + newCat.trim() + "\" cadastrada com sucesso!");
      setNewCat("");
      setIsAddModalOpen(false);
    } catch (err) {
      toast.error("Erro ao cadastrar empresa.");
    }
  };

  return (
    <div className="h-full flex flex-col gap-8 md:gap-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-4 uppercase tracking-tight">
            <div className="p-3 bg-emerald-600 rounded-[20px]">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            Empresas <span className="text-slate-200 ml-2">/</span> <span className="text-emerald-600">Pedidos</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-4 py-2 rounded-[24px] border border-slate-100 dark:border-zinc-800 shadow-sm h-14">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-all active:scale-90">
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <div className="text-[10px] font-black uppercase text-emerald-600 tracking-widest min-w-[120px] text-center">
              {viewDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-all active:scale-90">
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[24px] font-black uppercase text-[11px] tracking-widest transition-all shadow-xl active:scale-95 group h-14">
            <Upload className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
            Enviar Pedidos
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl group-hover:scale-110 transition-transform">
              <TrendingUp className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Faturamento Mês</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">{formatCurrency(totalGeral)}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-sm group">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl group-hover:rotate-12 transition-transform">
              <ShoppingBag className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pedidos Mês</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">{monthlyOrders.length}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-sm group">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-3xl group-hover:scale-90 transition-transform">
              <Zap className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pedidos Feitos Hoje</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">{ordersToday}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 flex lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible pb-6 lg:pb-0 snap-x scroll-px-4 custom-scrollbar">
          <div className="flex items-center justify-between px-4">
             <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Seleção Estratégica</h3>
          </div>
          
          <div className="flex lg:flex-col gap-3 min-w-max lg:min-w-0">
            <button onClick={() => setIsAddModalOpen(true)} className="w-full text-left p-6 rounded-[32px] bg-emerald-600 text-white shadow-xl flex items-center justify-between group mb-4  transition-all active:scale-95">
              <span className="text-[14px] font-black uppercase tracking-tight">Nova Empresa</span>
              <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>

            <button 
              onClick={() => setSelectedCategory("all")}
              className={cn("min-w-[280px] lg:min-w-0 lg:w-full text-left p-7 rounded-[35px] border transition-all relative group overflow-hidden active:scale-[0.98]",
                selectedCategory === "all" 
                  ? "bg-slate-900 dark:bg-zinc-800 border-slate-900 text-white shadow-[0_20px_40px_rgba(0,0,0,0.1)]" 
                  : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 hover:border-emerald-200 shadow-sm"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[12px] font-black uppercase tracking-widest text-emerald-500">Visão Consolidada</h4>
                <LayoutGrid className="w-5 h-5 opacity-40 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-black tracking-tighter">Todas as Empresas</p>
                <div className="text-[10px] font-black bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full">{monthlyOrders.length} Pedidos</div>
              </div>
            </button>

            <div className="flex lg:flex-col gap-3 min-w-max lg:min-w-0 lg:pt-6 lg:border-t border-slate-50 dark:border-zinc-800/50">
              {combinedCategories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn("min-w-[240px] lg:min-w-0 lg:w-full text-left p-6 rounded-[32px] border transition-all relative group overflow-hidden active:scale-[0.98]",
                    selectedCategory === cat
                      ? "bg-slate-900 dark:bg-zinc-800 border-slate-900 text-white shadow-xl scale-[1.02]" 
                      : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 hover:border-emerald-200"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[13px] font-black uppercase tracking-tight truncate">{cat}</h4>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setManagingCompany(cat); 
                        setEditName(cat);
                      }} 
                      className="p-2 hover:bg-white/20 rounded-full transition-all relative z-20"
                    >
                      <Settings className="w-4 h-4 opacity-30 group-hover:rotate-45 transition-transform" />
                    </button>
                  </div>
                  <p className="text-xl font-black tracking-tighter">{formatCurrency(catTotals[cat] || 0)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              {loading ? (
                 <div className="col-span-full h-40 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-emerald-600 opacity-20"/></div>
              ) : filteredOrders.length === 0 ? (
                <div className="col-span-full h-80 border-4 border-dashed border-slate-100 dark:border-zinc-800 rounded-[48px] flex flex-col items-center justify-center text-slate-300">
                  <ShoppingBag className="w-20 h-20 mb-6 opacity-5" />
                  <p className="font-black uppercase text-[11px] tracking-[0.4em] text-center opacity-40 leading-relaxed">Vácuo de Pedidos <br/> Identificado Neste Período</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className="bg-white dark:bg-zinc-900 p-9 rounded-[45px] border border-slate-100 dark:border-zinc-800 hover:border-emerald-300 hover:shadow-[0_30px_60px_-15px_rgba(79,70,229,0.15)] transition-all group relative overflow-hidden active:scale-[0.98]">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-600/5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-[0.3em] mb-1 block">Data de Processamento</span>
                        <span className="text-xs font-black text-slate-900 dark:text-zinc-100">{order.created_at ? new Date(order.created_at).toLocaleDateString("pt-BR") : "---"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1 block">Valor Líquido</span>
                        <span className="text-xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter tabular-nums">{formatCurrency(order.value)}</span>
                      </div>
                    </div>
                    
                    <div className="relative z-10 mb-8">
                      <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-2">Cliente Adquirente</p>
                      <Link to={'/dashboard/clientes/' + order.client_id} className="block">
                        <h4 className="text-base font-black uppercase text-slate-900 dark:text-zinc-100 truncate hover:text-emerald-600 transition-colors leading-tight">
                          {order.client?.name || "Cliente Desconhecida"}
                        </h4>
                      </Link>
                    </div>

                    <div className="pt-7 border-t border-slate-50 dark:border-zinc-800/50 flex justify-between items-center relative z-10">
                      <div className="flex items-center gap-3">
                        <span className="px-5 py-2 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-full /50 group-hover:bg-slate-900 transition-colors">
                          {order.category}
                        </span>
                      </div>
                      <Link to={'/dashboard/clientes/' + order.client_id} className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl hover:bg-emerald-50 transition-colors group/arrow">
                         <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover/arrow:text-emerald-600 transition-colors" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white dark:bg-zinc-900 p-12 rounded-[56px] shadow-2xl relative z-10 w-full max-w-sm border border-white/20">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-zinc-100 tracking-tighter">Nova Empresa</h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X/></button>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Razão Social / Fantasia</label>
                    <input placeholder="EX: COZIMAX" value={newCat} onChange={e => setNewCat(e.target.value)} className="w-full p-6 bg-slate-50 dark:bg-zinc-850 rounded-[28px] font-black uppercase text-sm outline-none border border-slate-100 dark:border-zinc-800 focus:border-emerald-500 transition-all shadow-inner" />
                  </div>
                  <button onClick={addCategory} className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black uppercase tracking-widest text-xs shadow-[0_20px_40px_rgba(79,70,229,0.3)] hover:bg-emerald-700 transition-all active:scale-95">Efetivar Cadastro</button>
                </div>
             </motion.div>
          </div>
        )}

        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUploadModalOpen(false)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl" />
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-zinc-900 p-14 rounded-[70px] shadow-2xl relative z-10 w-full max-w-5xl h-[85vh] flex flex-col border border-white/10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-purple-500 to-pink-500" />
                <div className="flex justify-between items-center mb-14">
                   <div>
                      <h3 className="text-4xl font-black uppercase text-slate-900 dark:text-zinc-100 tracking-tighter mb-1">Upload de Faturamento</h3>
                      <div className="flex items-center gap-3">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processamento Neural Ativo</p>
                      </div>
                   </div>
                   <button onClick={() => setIsUploadModalOpen(false)} className="p-5 bg-slate-50 dark:bg-zinc-800 rounded-3xl text-slate-400 hover:text-red-500 transition-all shadow-sm active:scale-90"><X className="w-7 h-7"/></button>
                </div>
                <div onClick={() => { setIsUploadModalOpen(false); navigate("/dashboard/pedidos"); }} className="flex-1 border-4 border-dashed border-slate-100 dark:border-zinc-800 rounded-[60px] flex flex-col items-center justify-center text-center p-16 hover:bg-emerald-50/10 transition-all cursor-pointer group relative overflow-hidden">
                   <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/[0.02] transition-colors" />
                   <div className="p-14 bg-white dark:bg-zinc-900 rounded-[50px] shadow-[0_30px_100px_rgba(0,0,0,0.1)] text-emerald-600 mb-10 group-hover:scale-110 group-hover:-translate-y-4 transition-all duration-500 relative z-10">
                      <Upload className="w-20 h-20" />
                   </div>
                   <div className="relative z-10">
                    <h4 className="text-2xl font-black uppercase text-slate-900 dark:text-zinc-100 mb-4 tracking-tight">Enviar Pedidos</h4>
                    <p className="text-slate-400 text-lg max-w-sm font-medium leading-relaxed italic ml-auto mr-auto">Clique para ir à central de pedidos onde você pode registrar manualmente ou em lote via IA.</p>
                   </div>
                </div>
                <div className="mt-14 grid grid-cols-3 gap-8">
                  <div className="p-8 bg-slate-50 dark:bg-zinc-800/50 rounded-[40px] flex items-center gap-5 border border-transparent hover:border-emerald-100 transition-all">
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm"><FileText className="text-emerald-600 w-6 h-6"/></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Suporte PDF/Img</span>
                  </div>
                  <div className="p-8 bg-slate-50 dark:bg-zinc-800/50 rounded-[40px] flex items-center gap-5 border border-transparent hover:border-emerald-100 transition-all">
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm"><Check className="text-emerald-600 w-6 h-6"/></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">99% de Precisão IA</span>
                  </div>
                  <div className="p-8 bg-slate-50 dark:bg-zinc-800/50 rounded-[40px] flex items-center gap-5 border border-transparent hover:border-emerald-100 transition-all">
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm"><Settings className="text-emerald-600 w-6 h-6"/></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Autocompleta CRM</span>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      
        {managingCompany && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setManagingCompany(null)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white dark:bg-zinc-900 p-10 rounded-[48px] shadow-2xl relative z-10 w-full max-w-sm border border-white/20">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black uppercase text-slate-900 dark:text-zinc-100 tracking-tighter">Gerenciar Empresa</h3>
                  <button onClick={() => setManagingCompany(null)} className="text-slate-300 hover:text-slate-900 transition-colors"><X/></button>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nome da Empresa</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-zinc-850 rounded-3xl font-black uppercase text-sm outline-none border border-slate-100 dark:border-zinc-800" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={handleUpdateCompany} className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase tracking-widest text-[10px]">Salvar Alterações</button>
                    <button onClick={() => handleDeleteCompany(managingCompany)} className="w-full py-5 bg-red-50 text-red-600 hover:bg-red-100 rounded-[24px] font-black uppercase tracking-widest text-[10px]">Excluir Empresa</button>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
  
      </AnimatePresence>
    </div>
  );
}
