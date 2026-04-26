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
    const trimmedCat = newCat.trim();
    if (!trimmedCat) {
      toast.error("Por favor, digite o nome da empresa.");
      return;
    }
    
    try {
      const currentCategories = settings.categories || [];
      
      // Check if already exists (case-insensitive)
      if (currentCategories.some((c: string) => c.toLowerCase() === trimmedCat.toLowerCase())) {
        toast.error("Empresa \"" + trimmedCat + "\" jÃ¡ estÃ¡ cadastrada.");
        return;
      }

      console.log("Cadastrando empresa:", trimmedCat);
      
      await updateSettings({ 
        categories: [...currentCategories, trimmedCat] 
      });
      
      toast.success("Empresa \"" + trimmedCat + "\" cadastrada com sucesso!");
      setNewCat("");
      setIsAddModalOpen(false);
      
      // Trigger a reload of the categories in the dashboard logic if needed
      if (typeof loadOrders === 'function') loadOrders();
      
    } catch (err) {
      console.error("Erro ao cadastrar empresa:", err);
      toast.error("Erro ao salvar no banco de dados.");
    }
  };


  return (
    <div className="flex flex-col gap-6 md:gap-10 pb-20 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-3 md:gap-4 uppercase tracking-tight">
            <div className="p-2 md:p-3 bg-emerald-600 rounded-xl md:rounded-[20px]">
              <Building2 className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <span>Empresas <span className="text-slate-200 ml-1 md:ml-2">/</span> <span className="text-emerald-600">Pedidos</span></span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3 bg-white dark:bg-zinc-900 px-3 md:px-4 py-2 rounded-2xl md:rounded-[24px] border border-slate-100 dark:border-zinc-800 shadow-sm h-12 md:h-14">
            <button onClick={prevMonth} className="p-1.5 md:p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg md:rounded-xl transition-all active:scale-90">
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <div className="text-[9px] md:text-[10px] font-black uppercase text-emerald-600 tracking-widest min-w-[100px] md:min-w-[120px] text-center">
              {viewDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </div>
            <button onClick={nextMonth} className="p-1.5 md:p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg md:rounded-xl transition-all active:scale-90">
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl md:rounded-[24px] font-black uppercase text-[9px] md:text-[11px] tracking-widest transition-all shadow-xl active:scale-95 group h-12 md:h-14 whitespace-nowrap">
            <Upload className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden xs:inline">Enviar Pedidos</span>
            <span className="xs:hidden">Enviar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-sm group">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="p-3 md:p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Faturamento MÃªs</p>
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">{formatCurrency(totalGeral)}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-sm group">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="p-3 md:p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl md:rounded-3xl group-hover:rotate-12 transition-transform">
              <ShoppingBag className="w-6 h-6 md:w-8 md:h-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pedidos MÃªs</p>
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">{monthlyOrders.length}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-sm group">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="p-3 md:p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl md:rounded-3xl group-hover:scale-90 transition-transform">
              <Zap className="w-6 h-6 md:w-8 md:h-8 text-amber-600" />
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Feitos Hoje</p>
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">{ordersToday}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        <div className="lg:col-span-4 flex lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 snap-x scroll-px-4 custom-scrollbar">
          <div className="flex items-center justify-between px-2 md:px-4">
             <h3 className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">SeleÃ§Ã£o EstratÃ©gica</h3>
          </div>
          
          <div className="flex lg:flex-col gap-3 min-w-max lg:min-w-0">
            <button onClick={() => setIsAddModalOpen(true)} className="w-full text-left p-5 md:p-6 rounded-3xl md:rounded-[32px] bg-emerald-600 text-white shadow-xl flex items-center justify-between group mb-2 md:mb-4 transition-all active:scale-95">
              <span className="text-xs md:text-[14px] font-black uppercase tracking-tight">Nova Empresa</span>
              <Plus className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform" />
            </button>

            <button 
              onClick={() => setSelectedCategory("all")}
              className={cn("min-w-[240px] md:min-w-[280px] lg:min-w-0 lg:w-full text-left p-6 md:p-7 rounded-[30px] md:rounded-[35px] border transition-all relative group overflow-hidden active:scale-[0.98]",
                selectedCategory === "all" 
                  ? "bg-slate-900 dark:bg-zinc-800 border-slate-900 text-white shadow-[0_20px_40px_rgba(0,0,0,0.1)]" 
                  : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 hover:border-emerald-200 shadow-sm"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-emerald-500">VisÃ£o Consolidada</h4>
                <LayoutGrid className="w-4 h-4 md:w-5 md:h-5 opacity-40 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl md:text-2xl font-black tracking-tighter">Todas as Empresas</p>
                <div className="text-[8px] md:text-[10px] font-black bg-emerald-500/20 text-emerald-500 px-2 md:px-3 py-1 rounded-full">{monthlyOrders.length} Pedidos</div>
              </div>
            </button>

            <div className="flex lg:flex-col gap-3 min-w-max lg:min-w-0 lg:pt-6 lg:border-t border-slate-50 dark:border-zinc-800/50">
              {combinedCategories.map(cat => (
                <div
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn("cursor-pointer min-w-[200px] md:min-w-[240px] lg:min-w-0 lg:w-full text-left p-5 md:p-6 rounded-[28px] md:rounded-[32px] border transition-all relative group overflow-hidden active:scale-[0.98]",
                    selectedCategory === cat
                      ? "bg-slate-900 dark:bg-zinc-800 border-slate-900 text-white shadow-xl scale-[1.02]" 
                      : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 hover:border-emerald-200"
                  )
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] md:text-[13px] font-black uppercase tracking-tight truncate max-w-[120px] md:max-w-none">{cat}</h4>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setManagingCompany(cat); 
                        setEditName(cat);
                      }} 
                      className="p-1.5 md:p-2 hover:bg-white/20 rounded-full transition-all relative z-20"
                    >
                      <Settings className="w-3.5 h-3.5 md:w-4 md:h-4 opacity-30 group-hover:rotate-45 transition-transform" />
                    </button>
                  </div>
                  <p className="text-lg md:text-xl font-black tracking-tighter">{formatCurrency(catTotals[cat] || 0)}</p>
                </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-20">
              {loading ? (
                 <div className="col-span-full h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin text-emerald-600 opacity-20"/></div>
              ) : filteredOrders.length === 0 ? (
                <div className="col-span-full h-60 md:h-80 border-4 border-dashed border-slate-100 dark:border-zinc-800 rounded-[32px] md:rounded-[48px] flex flex-col items-center justify-center text-slate-300">
                  <ShoppingBag className="w-12 h-12 md:w-20 md:h-20 mb-4 md:mb-6 opacity-5" />
                  <p className="font-black uppercase text-[9px] md:text-[11px] tracking-[0.3em] text-center opacity-40 leading-relaxed px-6">Nenhum Pedido <br/> Identificado Neste PerÃ­odo</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className="bg-white dark:bg-zinc-900 p-6 md:p-9 rounded-[32px] md:rounded-[45px] border border-slate-100 dark:border-zinc-800 hover:border-emerald-300 hover:shadow-xl transition-all group relative overflow-hidden active:scale-[0.98]">
                    <div className="absolute top-0 right-0 w-32 md:w-40 h-32 md:h-40 bg-emerald-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="flex justify-between items-start mb-4 md:mb-6 relative z-10">
                      <div>
                        <span className="text-[7px] md:text-[8px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-[0.2em] mb-1 block">Processamento</span>
                        <span className="text-[10px] md:text-xs font-black text-slate-900 dark:text-zinc-100">{order.created_at ? new Date(order.created_at).toLocaleDateString("pt-BR") : "---"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[7px] md:text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 block">Valor LÃ­quido</span>
                        <span className="text-lg md:text-xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter tabular-nums">{formatCurrency(order.value)}</span>
                      </div>
                    </div>
                    
                    <div className="relative z-10 mb-6 md:mb-8">
                      <p className="text-[7px] md:text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-2">Cliente Adquirente</p>
                      <Link to={'/dashboard/clientes/' + order.client_id} className="block">
                        <h4 className="text-sm md:text-base font-black uppercase text-slate-900 dark:text-zinc-100 truncate hover:text-emerald-600 transition-colors leading-tight">
                          {order.client?.name || "Cliente Desconhecida"}
                        </h4>
                      </Link>
                    </div>

                    <div className="pt-5 md:pt-7 border-t border-slate-50 dark:border-zinc-800/50 flex justify-between items-center relative z-10">
                      <div className="flex items-center gap-3">
                        <span className="px-3 md:px-5 py-1.5 md:py-2 bg-emerald-600 text-white text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] rounded-full group-hover:bg-slate-900 transition-colors">
                          {order.category}
                        </span>
                      </div>
                      <Link to={'/dashboard/clientes/' + order.client_id} className="p-2 md:p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl md:rounded-2xl hover:bg-emerald-50 transition-colors group/arrow">
                         <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-slate-400 group-hover/arrow:text-emerald-600 transition-colors" />
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
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[40px] md:rounded-[56px] shadow-2xl relative z-10 w-full max-w-sm border border-white/20">
                <div className="flex justify-between items-center mb-8 md:mb-10">
                   <h3 className="text-xl md:text-2xl font-black uppercase text-slate-900 dark:text-zinc-100 tracking-tighter">Nova Empresa</h3>
                   <button onClick={() => setIsAddModalOpen(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X/></button>
                </div>
                <div className="space-y-6">
                   <div>
                     <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block">RazÃ£o Social / Fantasia</label>
                     <input placeholder="EX: COZIMAX" value={newCat} onChange={e => setNewCat(e.target.value)} className="w-full p-5 md:p-6 bg-slate-50 dark:bg-zinc-850 rounded-[24px] md:rounded-[28px] font-black uppercase text-sm outline-none border border-slate-100 dark:border-zinc-800 focus:border-emerald-500 transition-all shadow-inner" />
                   </div>
                   <button onClick={addCategory} className="w-full py-5 md:py-6 bg-emerald-600 text-white rounded-[24px] md:rounded-[32px] font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl hover:bg-emerald-700 transition-all active:scale-95">Efetivar Cadastro</button>
                </div>
             </motion.div>
          </div>
        )}

        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUploadModalOpen(false)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl" />
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-zinc-900 p-6 md:p-14 rounded-[40px] md:rounded-[70px] shadow-2xl relative z-10 w-full max-w-5xl h-[85vh] flex flex-col border border-white/10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
                <div className="flex justify-between items-center mb-8 md:mb-14">
                   <div>
                      <h3 className="text-2xl md:text-4xl font-black uppercase text-slate-900 dark:text-zinc-100 tracking-tighter mb-1">Upload de Faturamento</h3>
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Processamento Neural Ativo</p>
                      </div>
                   </div>
                   <button onClick={() => setIsUploadModalOpen(false)} className="p-3 md:p-5 bg-slate-50 dark:bg-zinc-800 rounded-2xl md:rounded-3xl text-slate-400 hover:text-red-500 transition-all shadow-sm active:scale-90"><X className="w-6 h-6 md:w-7 md:h-7"/></button>
                </div>
                <div onClick={() => { setIsUploadModalOpen(false); navigate("/dashboard/pedidos"); }} className="flex-1 border-4 border-dashed border-slate-100 dark:border-zinc-800 rounded-[32px] md:rounded-[60px] flex flex-col items-center justify-center text-center p-6 md:p-16 hover:bg-emerald-50/10 transition-all cursor-pointer group relative overflow-hidden">
                   <div className="p-8 md:p-14 bg-white dark:bg-zinc-900 rounded-[32px] md:rounded-[50px] shadow-2xl text-emerald-600 mb-6 md:mb-10 group-hover:scale-110 transition-all duration-500">
                      <Upload className="w-12 h-12 md:w-20 md:h-20" />
                   </div>
                   <h4 className="text-xl md:text-2xl font-black uppercase text-slate-900 dark:text-zinc-100 mb-2 md:mb-4 tracking-tight">Enviar Pedidos</h4>
                   <p className="text-slate-400 text-sm md:text-lg max-w-sm font-medium leading-relaxed italic mx-auto">Clique para ir Ã  central de pedidos e registrar via IA ou manualmente.</p>
                </div>
             </motion.div>
          </div>
        )}
      
        {managingCompany && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setManagingCompany(null)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white dark:bg-zinc-900 p-8 md:p-10 rounded-[32px] md:rounded-[48px] shadow-2xl relative z-10 w-full max-w-sm border border-white/20">
                <div className="flex justify-between items-center mb-6 md:mb-8">
                   <h3 className="text-lg md:text-xl font-black uppercase text-slate-900 dark:text-zinc-100 tracking-tighter">Gerenciar Empresa</h3>
                   <button onClick={() => setManagingCompany(null)} className="text-slate-300 hover:text-slate-900 transition-colors"><X/></button>
                </div>
                <div className="space-y-6">
                   <div>
                     <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nome da Empresa</label>
                     <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-4 md:p-5 bg-slate-50 dark:bg-zinc-850 rounded-2xl md:rounded-3xl font-black uppercase text-sm outline-none border border-slate-100 dark:border-zinc-800" />
                   </div>
                   <div className="flex flex-col gap-3">
                     <button onClick={handleUpdateCompany} className="w-full py-4 md:py-5 bg-emerald-600 text-white rounded-[20px] md:rounded-[24px] font-black uppercase tracking-widest text-[9px] md:text-[10px]">Salvar AlteraÃ§Ãµes</button>
                     <button onClick={() => handleDeleteCompany(managingCompany)} className="w-full py-4 md:py-5 bg-red-50 text-red-600 hover:bg-red-100 rounded-[20px] md:rounded-[24px] font-black uppercase tracking-widest text-[9px] md:text-[10px]">Excluir Empresa</button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
