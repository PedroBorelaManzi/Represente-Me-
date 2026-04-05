import React, { useState, useEffect, useRef } from "react";
import { Building2, Plus, Trash2, FileText, ChevronRight, DollarSign, TrendingUp, Settings, X, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { Link } from "react-router-dom";

export default function EmpresasPage() {
  const { user } = useAuth();
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");
  const [itemsLimit, setItemsLimit] = useState(15);
  const [syncStatus, setSyncStatus] = useState<{current: number, total: number} | null>(null);
  const scrollSentinelRef = React.useRef(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string>("");
  const [editNameInput, setEditNameInput] = useState<string>("");

  const filteredOrders = (allOrders || []).filter(o => {
    const matchesCategory = selectedCategory === "all" || o.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesCategory;
  });

  const totalCategory = filteredOrders.reduce((sum, o) => sum + o.value, 0);

  useEffect(() => {
    if (!scrollSentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && filteredOrders.length > itemsLimit) {
        setItemsLimit(prev => prev + 15);
      }
    }, { threshold: 0.1 });
    obs.observe(scrollSentinelRef.current);
    return () => obs.disconnect();
  }, [filteredOrders.length, itemsLimit]);

  
  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    
    // Updated to include file_name if present, otherwise fallback
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
      .order("created_at", { ascending: false });

    if (!error && dbOrders) {
      const orders = dbOrders.map(o => ({
        id: o.id,
        name: o.file_name || o.file_path?.split("/").pop() || "Pedido sem nome",
        category: o.category,
        value: o.value,
        clientName: o.clients?.name || "Cliente Desconhecido",
        clientId: o.client_id,
        created_at: o.created_at
      }));

      // Update global categories if any are new
      const discoveredCategories = [...new Set(orders.map(o => o.category))];
      const currentGlobal = settings?.categories || [];
      const newCats = discoveredCategories.filter(c => 
          !currentGlobal.some(gc => gc.toLowerCase() === c.toLowerCase())
      );
      
      if (newCats.length > 0) {
          await updateSettings({ categories: Array.from(new Set([...currentGlobal, ...newCats])) });
      }

      setAllOrders(orders);
    }
    setLoading(false);
  };

  const performDeepSync = async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setLoading(true);
    
    try {
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, user_id, faturamento");

      if (clientsError) throw clientsError;
      if (!clients) return;

      if (!isSilent) setSyncStatus({ current: 0, total: clients.length });

      // Parallel processing with batching (Max 10 parallel clients)
      const batchSize = 10;
      for (let i = 0; i < clients.length; i += batchSize) {
        const clientBatch = clients.slice(i, i + batchSize);
        
        await Promise.all(clientBatch.map(async (client) => {
          const { data: files } = await supabase.storage
            .from("client_vault")
            .list(`${client.user_id}/${client.id}`);

          if (files && files.length > 0) {
            const clientOrders = [];
            const newFaturamento = {};
            
            for (const file of files) {
               const parts = file.name.split("___");
               if (parts.length >= 2) {
                  const cat = parts[0];
                  const hasValue = parts[1].startsWith("VALOR_");
                  const val = hasValue ? parseFloat(parts[1].replace("VALOR_", "")) || 0 : 0;
                  
                  newFaturamento[cat] = (newFaturamento[cat] || 0) + val;
                  
                  clientOrders.push({
                      user_id: user.id,
                      client_id: client.id,
                      category: cat,
                      value: val,
                      file_name: file.name,
                      file_path: `${client.user_id}/${client.id}/${file.name}`,
                      created_at: file.created_at
                  });
               }
            }

            // High-speed batch upsert for orders of this client
            if (clientOrders.length > 0) {
              await supabase.from("orders").upsert(clientOrders, { onConflict: "client_id,file_path" });
            }

            // Single update for faturamento
            await supabase
              .from("clients")
              .update({ faturamento: newFaturamento })
              .eq("id", client.id);
          }
        }));

        if (!isSilent) setSyncStatus(prev => prev ? { ...prev, current: i + clientBatch.length } : null);
      }
      
      await loadOrders();
    } catch (err) {
      console.error("Fast Sync Error:", err);
      if (!isSilent) alert("Erro na sincronização rápida: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (!isSilent) setLoading(false);
      setSyncStatus(null);
    }
  };

  useEffect(() => {
    if (!settingsLoading && user) {
       performDeepSync(true); 
       return () => {
          performDeepSync(true); 
       };
    }
  }, [user, settingsLoading]);

  const addCategory = async () => {
    if (newCat.trim() && !settings.categories?.some(c => c.toLowerCase() === newCat.trim().toLowerCase())) {
      const updated = [...(settings?.categories || []), newCat.trim()];
      await updateSettings({ categories: updated });
      setNewCat("");
      if (!selectedCategory) setSelectedCategory(newCat.trim());
    } else if (newCat.trim()) {
        alert("Esta empresa já existe!");
        setNewCat("");
    }
  };

  const openEditModal = (cat: string) => {
      setEditingCategory(cat);
      setEditNameInput(cat);
      setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
      if (!editNameInput.trim() || editNameInput.trim() === editingCategory) {
          setIsEditModalOpen(false);
          return;
      }
      
      const oldCat = editingCategory;
      const newCatName = editNameInput.trim();
      setLoading(true);

      try {
          const { data: clients } = await supabase.from("clients").select("id, faturamento, category_last_contact");
          if (clients) {
              for (const client of clients) {
                  const { data: files } = await supabase.storage
                    .from("client_vault")
                    .list(`${user?.id}/${client.id}`);
                  
                  if (files) {
                      for (const file of files) {
                          const parts = file.name.split("___");
                          if (parts.length > 0 && parts[0].toLowerCase() === oldCat.toLowerCase()) {
                              const newName = file.name.replace(parts[0], newCatName);
                              const oldPath = `${user?.id}/${client.id}/${file.name}`;
                              const newPath = `${user?.id}/${client.id}/${newName}`;
                              await supabase.storage.from("client_vault").copy(oldPath, newPath);
                              await supabase.storage.from("client_vault").remove([oldPath]);
                          }
                      }
                  }

                  let needsUpdate = false;
                  const fat = client.faturamento || {};
                  const lastContact = client.category_last_contact || {};

                  Object.keys(fat).forEach(key => {
                      if (key.toLowerCase() === oldCat.toLowerCase()) {
                          const val = fat[key];
                          delete fat[key];
                          fat[newCatName] = val;
                          needsUpdate = true;
                      }
                  });

                  Object.keys(lastContact).forEach(key => {
                      if (key.toLowerCase() === oldCat.toLowerCase()) {
                          const val = lastContact[key];
                          delete lastContact[key];
                          lastContact[newCatName] = val;
                          needsUpdate = true;
                      }
                  });

                  if (needsUpdate) {
                      await supabase.from("clients").update({ 
                          faturamento: fat,
                          category_last_contact: lastContact
                      }).eq("id", client.id);
                  }
              }
          }

          const updated = (settings?.categories || [])
             .filter(c => c.toLowerCase() !== oldCat.toLowerCase())
             .concat(newCatName);
          
          await updateSettings({ categories: updated });

          if (selectedCategory.toLowerCase() === oldCat.toLowerCase()) {
              setSelectedCategory(newCatName);
          }
          await loadOrders();
      } catch (err) {
          console.error("Erro no rename sync:", err);
          alert("Erro ao renomear: " + (err instanceof Error ? err.message : String(err)));
      } finally {
          setLoading(false);
          setIsEditModalOpen(false);
      }
  };

  const handleDeleteSub = async () => {
      if (window.confirm(`Deseja realmente excluir a empresa/categoria "${editingCategory}"? TODOS os arquivos e dados vinculados serão mantidos, mas a categoria não aparecerá mais nos filtros.`)) {
          const updated = (settings?.categories || []).filter(c => c.toLowerCase() !== editingCategory.toLowerCase());
          await updateSettings({ categories: updated });
          if (selectedCategory.toLowerCase() === editingCategory.toLowerCase()) {
             setSelectedCategory(updated.length > 0 ? updated[0] : "");
          }
          setIsEditModalOpen(false);
      }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const catTotals = (settings?.categories || []).reduce((acc: any, cat: string) => {
      acc[cat] = allOrders
          .filter(o => o.category.toLowerCase() === cat.toLowerCase())
          .reduce((s, o) => s + o.value, 0);
      return acc;
  }, {});

  const totalGeral = Object.values(catTotals).reduce((sum: number, val: any) => sum + Number(val), 0) as number;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" /> Pedidos e Empresas
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Gerencie seus pedidos e empresas em uma visão unificada.</p>
        </div>
        {syncStatus && (
           <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl animate-pulse">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
                Sincronizando: {Math.round((syncStatus.current / syncStatus.total) * 100)}%
              </span>
           </div>
        )}
      </div>

      {/* Total Revenue Card */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm dark:shadow-none flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
               <TrendingUp className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
               <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Faturamento Total das Empresas</p>
               <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100 mt-1">{formatCurrency(totalGeral)}</h2>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: List of Categories */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
             <h3 className="text-sm font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Suas Empresas</h3>
             
             <div className="space-y-2 max-h-[calc(100vh-24rem)] overflow-y-auto pr-1">
                <div 
                  onClick={() => setSelectedCategory("all")}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedCategory === "all" 
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200" 
                      : "border-slate-100 dark:border-zinc-850 hover:bg-slate-50 dark:hover:bg-zinc-950 text-slate-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <FileText className={`w-4 h-4 ${selectedCategory === "all" ? "text-indigo-600" : "text-slate-400"}`} />
                    <span>Todos os Pedidos</span>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    {allOrders.length}
                  </span>
                </div>
                <div className="h-px bg-slate-100 dark:bg-zinc-800 my-2 mx-2" />

                {(settings?.categories || []).map((cat) => (
                   <div 
                     key={cat}
                     onClick={() => setSelectedCategory(cat)}
                     className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                       selectedCategory.toLowerCase() === cat.toLowerCase() 
                         ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200" 
                         : "border-slate-100 dark:border-zinc-850 hover:bg-slate-50 dark:hover:bg-zinc-950 text-slate-700 dark:text-zinc-300"
                     }`}
                   >
                     <div className="flex flex-col truncate flex-1">
                       <div className="flex items-center gap-2 truncate">
                          <Building2 className={`w-4 h-4 ${selectedCategory.toLowerCase() === cat.toLowerCase() ? "text-indigo-600" : "text-slate-400"}`} />
                          <span className="font-bold text-sm truncate">{cat}</span>
                       </div>
                       <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-1 pl-6">
                           {formatCurrency(catTotals[cat] || 0)}
                       </span>
                     </div>
                     <button 
                       onClick={(e) => { e.stopPropagation(); openEditModal(cat); }}
                       className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700"
                       title="Editar"
                     >
                       <Settings className="w-3.5 h-3.5" />
                     </button>
                   </div>
                ))}
             </div>

             <div className="pt-4 border-t border-slate-100 dark:border-zinc-850 flex gap-2">
                <input 
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="Nova empresa..."
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-zinc-950 dark:text-zinc-100"
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                />
                <button 
                  onClick={addCategory}
                  disabled={!newCat.trim()}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
             </div>
          </div>
        </div>

        {/* Right Column: Orders for Selected Category */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col h-[calc(100vh-16rem)]">
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-zinc-850">
                <div>
                   <h2 className="text-lg font-black text-slate-900 dark:text-zinc-100">{selectedCategory === "all" ? "" : selectedCategory}</h2>
                   <p className={`mt-0.5 ${selectedCategory === "all" ? "text-lg font-black text-indigo-600 dark:text-indigo-400" : "text-xs text-slate-500 dark:text-zinc-400"}`}>{selectedCategory === "all" ? "TODOS OS PEDIDOS:" : "Listagem de pedidos vinculados a esta empresa."}</p>
                </div>
                <div className="text-right">
                   <span className="text-xs text-slate-500 dark:text-zinc-400">Faturamento</span>
                   <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(totalCategory)}</p>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {loading ? (
                   <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                ) : (
                   <AnimatePresence>
                      {filteredOrders.slice(0, itemsLimit).map((order) => (
                         <motion.div
                           key={order.id}
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="flex items-center justify-between p-4 border border-slate-100 dark:border-zinc-850 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-950 transition-colors"
                         >
                           <div className="flex items-center gap-3 truncate">
                             <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                                <FileText className="w-5 h-5 text-indigo-600" />
                             </div>
                             <div className="truncate max-w-sm">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">{order.name}</h4>
                                <Link to={`/dashboard/clientes/${order.clientId}`} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5 mt-0.5">{order.clientName}</Link>
                             </div>
                           </div>
                           <div className="flex items-center gap-4">
                             <div className="text-right">
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500">{new Date(order.created_at).toLocaleDateString("pt-BR")}</span>
                                <p className="text-sm font-black text-slate-800 dark:text-zinc-200">{formatCurrency(order.value)}</p>
                             </div>
                           </div>
                         </motion.div>
                      ))}
                   </AnimatePresence>
                )}
             </div>
             <div ref={scrollSentinelRef} className="h-4 w-full" />
          </div>
        </div>

      </div>

      {/* Edit/Delete Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl p-6 w-full max-w-md space-y-4"
             >
                <div className="flex justify-between items-center">
                   <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Editar Empresa</h3>
                   <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-xl"><X className="w-5 h-5"/></button>
                </div>
                <div className="space-y-4">
                   <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Nome da Empresa</label>
                      <input 
                        type="text"
                        value={editNameInput}
                        onChange={(e) => setEditNameInput(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-zinc-950 dark:text-zinc-100"
                      />
                   </div>
                   <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">Nota: A alteração renomeará todos os registros e arquivos vinculados a esta empresa.</p>
                </div>
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 dark:border-zinc-850">
                    <button onClick={handleSaveEdit} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Salvar Alterações</button>
                    <button onClick={handleDeleteSub} className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-1 border border-red-100"><Trash2 className="w-4 h-4" /> Excluir Empresa</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
