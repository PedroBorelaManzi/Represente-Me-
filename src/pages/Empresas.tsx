import { useState, useEffect } from "react";
import { Building2, Plus, Trash2, FileText, ChevronRight, DollarSign, TrendingUp, Settings, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { Link } from "react-router-dom";

export default function EmpresasPage() {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newCat, setNewCat] = useState("");
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string>("");
  const [editNameInput, setEditNameInput] = useState<string>("");

  // Load select initial category
  useEffect(() => {
    if (settings.categories && settings.categories.length > 0 && !selectedCategory) {
      setSelectedCategory(settings.categories[0]);
    }
  }, [settings.categories]);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, name");

    if (!error && clients) {
      const orders: any[] = [];
      const filesPromises = clients.map(async (client: any) => {
         const { data: files } = await supabase.storage
           .from("client_vault")
           .list(`${user.id}/${client.id}`);

         if (files) {
             files.forEach((file: any) => {
                 const parts = file.name.split("___");
                 const hasCategory = parts.length > 1;
                 const categoryName = hasCategory ? parts[0] : "Documento";
                 const hasValue = parts.length > 2 && parts[1].startsWith("VALOR_");
                 const valueString = hasValue ? parts[1].replace("VALOR_", "") : "0";
                 const orderValue = parseFloat(valueString) || 0;

                 orders.push({
                     id: file.id || file.name,
                     name: file.name,
                     category: categoryName,
                     value: orderValue,
                     clientName: client.name,
                     clientId: client.id,
                     created_at: file.created_at
                 });
             });
         }
      });

      await Promise.all(filesPromises);
      orders.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllOrders(orders);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  const addCategory = async () => {
    if (newCat.trim() && !settings.categories?.includes(newCat.trim())) {
      const updated = [...(settings.categories || []), newCat.trim()];
      await updateSettings({ categories: updated });
      setNewCat("");
      if (!selectedCategory) setSelectedCategory(newCat.trim());
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
      const newCat = editNameInput.trim();

      setLoading(true);

      try {
          const { data: clients } = await supabase.from("clients").select("id, faturamento");
          if (clients) {
              for (const client of clients) {
                  // 1. Rename files in storage
                  const { data: files } = await supabase.storage
                    .from("client_vault")
                    .list(`${user?.id}/${client.id}`);
                  
                  if (files) {
                      for (const file of files) {
                          if (file.name.startsWith(oldCat + "___")) {
                              const newName = file.name.replace(oldCat + "___", newCat + "___");
                              const oldPath = `${user?.id}/${client.id}/${file.name}`;
                              const newPath = `${user?.id}/${client.id}/${newName}`;
                              await supabase.storage.from("client_vault").copy(oldPath, newPath);
                              await supabase.storage.from("client_vault").remove([oldPath]);
                          }
                      }
                  }

                  // 2. Update faturamento table row
                  const fat = client.faturamento || {};
                  if (fat[oldCat] !== undefined) {
                      fat[newCat] = fat[oldCat];
                      delete fat[oldCat];
                      await supabase.from("clients").update({ faturamento: fat }).eq("id", client.id);
                  }
              }
          }

          // 3. Save core settings
          const updated = (settings.categories || []).map(c => c === oldCat ? newCat : c);
          await updateSettings({ categories: updated });

          if (selectedCategory === oldCat) {
              setSelectedCategory(newCat);
          }
          await loadOrders();
      } catch (err) {
          console.error("Erro no rename sync:", err);
      } finally {
          setLoading(false);
          setIsEditModalOpen(false);
      }
  };

  const handleDeleteSub = async () => {
      if (window.confirm(`Deseja realmente excluir a empresa/categoria "${editingCategory}"?`)) {
          const updated = (settings.categories || []).filter(c => c !== editingCategory);
          await updateSettings({ categories: updated });
          if (selectedCategory === editingCategory) {
             setSelectedCategory(updated.length > 0 ? updated[0] : "");
          }
          setIsEditModalOpen(false);
      }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Compute Totals
  const catTotals = (settings.categories || []).reduce((acc: any, cat: string) => {
      acc[cat] = allOrders.filter(o => o.category === cat).reduce((s, o) => s + o.value, 0);
      return acc;
  }, {});

  const totalGeral = Object.values(catTotals).reduce((sum: number, val: any) => sum + Number(val), 0) as number;

  const filteredOrders = allOrders.filter(o => o.category === selectedCategory);
  const totalCategory = filteredOrders.reduce((sum, o) => sum + o.value, 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          <Building2 className="w-7 h-7 text-indigo-600" /> Empresas e Representações
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Gerencie suas representações e visualize todos os pedidos vinculados.</p>
      </div>

      {/* 🟢 Consolidated Total Revenue Card */}
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
                {(settings.categories || []).map((cat) => (
                   <div 
                     key={cat}
                     onClick={() => setSelectedCategory(cat)}
                     className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                       selectedCategory === cat 
                         ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200" 
                         : "border-slate-100 dark:border-zinc-850 hover:bg-slate-50 dark:hover:bg-zinc-950 text-slate-700 dark:text-zinc-300"
                     }`}
                   >
                     <div className="flex flex-col truncate flex-1">
                       <div className="flex items-center gap-2 truncate">
                          <Building2 className={`w-4 h-4 ${selectedCategory === cat ? "text-indigo-600" : "text-slate-400"}`} />
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
                {(settings.categories || []).length === 0 && (
                   <p className="text-xs text-slate-400 text-center py-4">Nenhuma empresa cadastrada.</p>
                )}
             </div>

             <div className="pt-4 border-t border-slate-100 dark:border-zinc-850 flex gap-2">
                <input 
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="Nova empresa..."
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-zinc-950 dark:text-zinc-100"
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
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
                   <h2 className="text-lg font-black text-slate-900 dark:text-zinc-100">{selectedCategory || "Detalhes"}</h2>
                   <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Listagem de pedidos vinculados a esta empresa.</p>
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
                      {filteredOrders.map((order) => (
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
                                <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">{order.name.split("___")[order.name.split("___").length - 1]}</h4>
                                <Link to={`/dashboard/clientes/${order.clientId}`} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5 mt-0.5">{order.clientName}</Link>
                             </div>
                           </div>
                           <div className="flex items-center gap-4">
                             <div className="text-right">
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                                <p className="text-sm font-black text-slate-800 dark:text-zinc-200">{formatCurrency(order.value)}</p>
                             </div>
                           </div>
                         </motion.div>
                      ))}
                      {filteredOrders.length === 0 && (
                         <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500 py-12">
                           <FileText className="w-12 h-12 stroke-[1.5] mb-3 text-slate-300" />
                           <p className="text-sm font-medium">Nenhum pedido listado para esta empresa.</p>
                         </div>
                      )}
                   </AnimatePresence>
                )}
             </div>
          </div>
        </div>

      </div>

      {/* 🟡 Edit/Delete Modal */}
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
                        placeholder="Nome..."
                      />
                   </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">Nota: A alteração renomeará todos os registros e arquivos vinculados a esta empresa.</p>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 dark:border-zinc-850">
                    <button 
                      onClick={handleSaveEdit}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Salvar Alterações
                    </button>
                    
                    <button 
                      onClick={handleDeleteSub}
                      className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-1 border border-red-100"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir Empresa
                    </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
