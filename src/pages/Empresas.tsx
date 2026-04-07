import { useState, useEffect } from "react";
import React from "react";
import { Building2, Plus, Trash2, Edit, X, Save, AlertCircle, Loader2, DollarSign, TrendingUp, Filter, Search, MoreHorizontal, ChevronRight, CheckCircle2, FileText, ShoppingBag } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function EmpresasPage() {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    if (!user) return [];
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id);
    
    if (error) return [];
    return ordersData;
  };

  const { data: orders = [], refetch } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: loadData,
    enabled: !!user
  });

  const categoryStats = React.useMemo(() => {
    const stats: any = {};
    (settings.categories || []).forEach(cat => {
      const catOrders = orders.filter(o => o.category?.toLowerCase() === cat.toLowerCase());
      stats[cat] = {
        total: catOrders.reduce((acc, o) => acc + (o.value || 0), 0),
        count: catOrders.length
      };
    });
    return stats;
  }, [orders, settings.categories]);

  const filteredCategories = (settings.categories || []).filter(cat => 
    cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEditModal = (cat: string) => {
    setEditingCategory(cat);
    setIsModalOpen(true);
  };

  const handleDeleteSub = async () => {
    if (!editingCategory) return;
    const cleanCategory = editingCategory.trim();

    if (!window.confirm(`ATENÇÃO: Deseja realmente excluir a representada "${cleanCategory}"? \n\nISSO APAGARÁ DEFINITIVAMENTE: \n1. Todos os pedidos registrados dela.\n2. Todos os arquivos anexados desta empresa.\n3. Todo o histórico de faturamento acumulado.\n\nESTA AÇÃO É IRREVERSÍVEL.`)) return;
    
    setLoading(true);
    try {
        // 1. Deletar os pedidos da tabela (Usando o nome limpo)
        const { error: orderError } = await supabase.from("orders").delete().eq("category", cleanCategory).eq("user_id", user?.id);
        if (orderError) throw orderError;

        // 2. Buscar TODOS os arquivos do usuário para identificar quais clientes têm arquivos desta categoria
        const { data: userFiles } = await supabase.rpc("list_user_files", { u_id: user.id });
        
        const clientsWithTargetFiles = new Set<string>();
        if (userFiles) {
            userFiles.forEach((f: any) => {
                if (f.file_name?.startsWith(`${cleanCategory}___`)) {
                    clientsWithTargetFiles.add(f.client_id);
                }
            });
        }

        // 3. Deletar arquivos apenas dos clientes identificados
        for (const clientId of Array.from(clientsWithTargetFiles)) {
             const { data: files } = await supabase.storage.from("client_vault").list(`${user?.id}/${clientId}`);
             if (files) {
                 const filesToDelete = files
                    .filter(f => f.name.startsWith(`${cleanCategory}___`))
                    .map(f => `${user?.id}/${clientId}/${f.name}`);
                 
                 if (filesToDelete.length > 0) {
                     await supabase.storage.from("client_vault").remove(filesToDelete);
                 }
             }
        }

        // 4. Limpar o histórico de faturamento e último contato nos clientes
        const { data: clientsToUpdate } = await supabase.from("clients").select("id, faturamento, category_last_contact").eq("user_id", user?.id);
        
        if (clientsToUpdate) {
            for (const client of clientsToUpdate) {
                let updated = false;
                const newFat = { ...(client.faturamento || {}) };
                const newLastC = { ...(client.category_last_contact || {}) };

                if (newFat[cleanCategory]) { delete newFat[cleanCategory]; updated = true; }
                if (newLastC[cleanCategory]) { delete newLastC[cleanCategory]; updated = true; }

                if (updated) {
                    await supabase.from("clients").update({
                        faturamento: newFat,
                        category_last_contact: newLastC
                    }).eq("id", client.id);
                }
            }
        }

        // 5. Remover da lista global de configurações
        const newGlobalCats = (settings.categories || []).filter(c => c !== editingCategory);
        await updateSettings({ categories: newGlobalCats });
        
        toast.success(`Representada "${cleanCategory}" excluída com sucesso!`);
        setIsModalOpen(false);
        setEditingCategory("");
        refetch();
    } catch (err: any) {
        console.error("Delete Category Error:", err);
        toast.error("Erro ao excluir: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleAddCategory = () => {
    const name = prompt("Nome da nova representada:");
    if (name && !settings.categories?.includes(name)) {
      updateSettings({ categories: [...(settings.categories || []), name] });
      toast.success("Empresa adicionada!");
    }
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50 dark:bg-zinc-950 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2 italic uppercase tracking-tighter">
            <Building2 className="w-8 h-8 text-indigo-600" /> Minhas Representadas
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">Gestão de faturamento e carteira por empresa.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar representada..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={handleAddCategory}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Empresa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredCategories.map((cat) => {
            const stats = categoryStats[cat] || { total: 0, count: 0 };
            return (
              <motion.div 
                key={cat}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-zinc-850 shadow-sm hover:shadow-xl transition-all relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-6">
                   <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl text-indigo-600 border border-indigo-100 dark:border-indigo-900/50">
                      <ShoppingBag className="w-6 h-6" />
                   </div>
                   <button onClick={() => openEditModal(cat)} className="p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400">
                      <MoreHorizontal className="w-5 h-5" />
                   </button>
                </div>
                
                <div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight line-clamp-1">{cat}</h3>
                   <div className="mt-6 space-y-4">
                      <div>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Faturamento Acumulado</span>
                         <p className="text-2xl font-black text-indigo-600 tabular-nums">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.total)}
                         </p>
                      </div>
                      <div className="flex items-center gap-4 pt-4 border-t border-slate-50 dark:border-zinc-850">
                         <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Pedidos</span>
                            <p className="text-sm font-black text-slate-700 dark:text-zinc-300">{stats.count}</p>
                         </div>
                         <div className="ml-auto">
                            <button onClick={() => openEditModal(cat)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">Detalhes <ChevronRight className="w-3 h-3" /></button>
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[40px] p-10 border border-white/20 shadow-2xl"
          >
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tight italic">Gestão de Representada</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-6 h-6" /></button>
             </div>

             <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-zinc-950 rounded-3xl border border-dashed text-center">
                   <p className="text-xs font-bold text-slate-400 uppercase mb-2">Empresa Selecionada</p>
                   <p className="text-xl font-black text-slate-900 dark:text-zinc-100">{editingCategory}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-6 border-t">
                   <button 
                     onClick={handleDeleteSub}
                     disabled={loading}
                     className="w-full py-5 bg-red-50 text-red-600 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                   >
                     {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Trash2 className="w-5 h-5" />} EXCLUIR EMPRESA E DADOS
                   </button>
                   <p className="text-[10px] text-center text-slate-400 font-bold uppercase mt-2 italic px-4">
                      Atenção: A exclusão removerá permanentemente faturamentos, arquivos e pedidos associados a esta representada.
                   </p>
                </div>
             </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
