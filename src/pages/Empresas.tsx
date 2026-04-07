import React, { useState, useEffect } from "react";
import { Building2, Plus, Trash2, FileText, ChevronRight, DollarSign, TrendingUp, Settings, X, Check, Loader2, Upload, Search, MapPin, AlertCircle, FileCheck, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { Link } from "react-router-dom";
import { processOrderFile } from "../lib/orderProcessor";
import { getHighPrecisionCoordinates } from "../lib/geminiGeocoding";
import { toast } from "sonner";

interface ProcessedFile {
  file: File;
  clientName: string;
  cnpj: string;
  category: string;
  value: number;
  address?: string;
  status: 'idle' | 'processing' | 'ready' | 'saving' | 'done' | 'error';
  isNewClient: boolean;
  error?: string;
  matchedClientId?: string;
}

export default function EmpresasPage() {
  const { user } = useAuth();
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");
  const [itemsLimit, setItemsLimit] = useState(15);
  const [syncStatus, setSyncStatus] = useState<{current: number, total: number} | null>(null);

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string>("");
  const [editNameInput, setEditNameInput] = useState<string>("");
  
  // Intelligent Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredOrders = (allOrders || []).filter(o => {
    const matchesCategory = selectedCategory === "all" || o.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesCategory;
  });

  const totalCategory = filteredOrders.reduce((sum, o) => sum + o.value, 0);

  const loadOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*, clients(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllOrders((data || []).map(o => ({
        ...o,
        clientName: o.clients?.name || "Cliente Desconhecido"
      })));
    } catch (err) {
      console.error("Load Orders Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const performDeepSync = async (isSilent = false) => {
    if (!user) return;
    try {
      if (!isSilent) setLoading(true);
      const { data: clients } = await supabase.from("clients").select("id, user_id").eq("user_id", user.id);
      if (!clients || clients.length === 0) {
        await loadOrders();
        return;
      }

      setSyncStatus({ current: 0, total: clients.length });

      for (let i = 0; i < clients.length; i += 5) {
        const batch = clients.slice(i, i + 5);
        await Promise.all(batch.map(async (client) => {
          const { data: files } = await supabase.storage.from("client_vault").list(`${user.id}/${client.id}`);
          if (files && files.length > 0) {
            const clientOrders: any[] = [];
            let newFaturamento: any = {};

            for (const file of files) {
              const parts = file.name.split("___");
              if (parts.length >= 2) {
                const category = parts[0];
                const valueStr = parts[1].replace("VALOR_", "");
                const value = parseFloat(valueStr) || 0;
                
                newFaturamento[category] = (newFaturamento[category] || 0) + value;
                clientOrders.push({
                  user_id: user.id,
                  client_id: client.id,
                  category,
                  value,
                  file_name: file.name,
                  file_path: `${user.id}/${client.id}/${file.name}`,
                  created_at: file.created_at
                });
              }
            }
            if (clientOrders.length > 0) {
              await supabase.from("orders").upsert(clientOrders, { onConflict: "client_id,file_path" });
            }
            await supabase.from("clients").update({ faturamento: newFaturamento }).eq("id", client.id);
          }
        }));
        setSyncStatus(prev => prev ? { ...prev, current: Math.min(i + batch.length, clients.length) } : null);
      }
      await loadOrders();
    } catch (err) {
      console.error("Deep Sync Error:", err);
    } finally {
      setSyncStatus(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!settingsLoading && user) {
       performDeepSync(true); 
    }
  }, [user, settingsLoading]);

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
    setUploadFiles([]);
  };

  const processFiles = async (files: FileList) => {
    setIsProcessing(true);
    const newFiles: ProcessedFile[] = Array.from(files).map(f => ({
      file: f,
      clientName: "",
      cnpj: "",
      category: (settings.categories && settings.categories[0]) || "",
      value: 0,
      status: 'processing',
      isNewClient: false
    }));
    
    setUploadFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < newFiles.length; i++) {
        const currentFile = newFiles[i].file;
        try {
            const result = await processOrderFile(currentFile, [], settings.categories || []);

            if (result.status === 'ready') {
                const cleanCnpj = result.cnpj.replace(/\D/g, "");
                let matchedClient = null;
                if (cleanCnpj) {
                    const { data: clientByCnpj } = await supabase
                        .from("clients")
                        .select("id, name")
                        .eq("cnpj", cleanCnpj)
                        .maybeSingle();
                    matchedClient = clientByCnpj;
                }

                setUploadFiles(prev => {
                    const updated = [...prev];
                    const idx = updated.length - newFiles.length + i;
                    updated[idx] = {
                        ...updated[idx],
                        clientName: result.client,
                        cnpj: result.cnpj,
                        category: result.category,
                        value: result.value,
                        address: result.address,
                        status: "ready",
                        isNewClient: !matchedClient,
                        matchedClientId: matchedClient?.id
                    };
                    return updated;
                });
            } else {
                throw new Error(result.error || "Falha na extração");
            }
        } catch (err) {
            console.error("Erro no processamento:", err);
            setUploadFiles(prev => {
                const updated = [...prev];
                const idx = updated.length - newFiles.length + i;
                updated[idx] = { 
                    ...updated[idx], 
                    status: 'error', 
                    error: (err as any).message || "Falha ao processar arquivo" 
                };
                return updated;
            });
        }
    }
    setIsProcessing(false);
  };

  const confirmSingleUpload = async (index: number) => {
      const item = uploadFiles[index];
      setUploadFiles(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'saving' } : f));

      try {
          let clientId = item.matchedClientId;

          if (!clientId) {
              const coords = await getHighPrecisionCoordinates(`${item.address}`, item.clientName, item.cnpj);
              const { data: newClientRes, error: clientErr } = await supabase
                  .from("clients")
                  .insert([{
                      user_id: user?.id,
                      name: item.clientName,
                      cnpj: item.cnpj,
                      address: item.address,
                      lat: coords?.lat,
                      lng: coords?.lng,
                      status: 'Ativo'
                  }])
                  .select()
                  .single();
              
              if (clientErr) throw clientErr;
              clientId = newClientRes.id;
              toast.success(`Cliente ${item.clientName} cadastrado com sucesso!`);
          }

          const cleanName = item.file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
          const cleanValue = `VALOR_${parseFloat(item.value.toString()).toFixed(2)}`;
          const formattedName = `${item.category}___${cleanValue}___${cleanName}`;
          const path = `${user?.id}/${clientId}/${formattedName}`;

          const { error: uploadError } = await supabase.storage
              .from("client_vault")
              .upload(path, item.file, { upsert: true });

          if (uploadError) throw uploadError;

          await supabase.from("orders").upsert([{
              user_id: user?.id,
              client_id: clientId,
              category: item.category,
              value: item.value,
              file_name: formattedName,
              file_path: path
          }], { onConflict: "client_id,file_path" });

          const { data: clientData } = await supabase.from("clients").select("faturamento").eq("id", clientId).single();
          const fat = clientData?.faturamento || {};
          fat[item.category] = (Number(fat[item.category] || 0) + Number(item.value));
          await supabase.from("clients").update({ faturamento: fat }).eq("id", clientId);

          setUploadFiles(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'done' } : f));
          await loadOrders();
      } catch (err) {
          console.error("Erro no salvamento:", err);
          toast.error("Erro ao salvar pedido.");
          setUploadFiles(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'error', error: "Falha ao salvar" } : f));
      }
  };

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
          const { data: clients } = await supabase.from("clients").select("id, faturamento, category_last_contact").eq("user_id", user?.id);
          if (clients) {
              for (const client of clients) {
                  const { data: files } = await supabase.storage.from("client_vault").list(`${user?.id}/${client.id}`);
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

                  if (fat[oldCat] !== undefined) {
                      const val = fat[oldCat];
                      delete fat[oldCat];
                      fat[newCatName] = val;
                      needsUpdate = true;
                  }

                  if (lastContact[oldCat] !== undefined) {
                      const val = lastContact[oldCat];
                      delete lastContact[oldCat];
                      lastContact[newCatName] = val;
                      needsUpdate = true;
                  }

                  if (needsUpdate) {
                      await supabase.from("clients").update({ faturamento: fat, category_last_contact: lastContact }).eq("id", client.id);
                  }
              }
          }

          const updated = (settings?.categories || []).map(c => c === oldCat ? newCatName : c);
          await updateSettings({ categories: updated });
          if (selectedCategory === oldCat) setSelectedCategory(newCatName);
          await loadOrders();
      } catch (err) {
          console.error("Erro no rename:", err);
      } finally {
          setLoading(false);
          setIsEditModalOpen(false);
      }
  };

  const handleDeleteSub = async () => {
    if (!window.confirm(`ATENÇÃO: Deseja realmente excluir a representada "${editingCategory}"? \n\nISSO APAGARÁ DEFINITIVAMENTE: \n1. Todos os pedidos registrados dela.\n2. Todos os arquivos anexados desta empresa.\n3. Todo o histórico de faturamento acumulado.\n\nESTA AÇÃO É IRREVERSÍVEL.`)) return;
    
    setLoading(true);
    try {
        await supabase.from("orders").delete().eq("category", editingCategory).eq("user_id", user?.id);
        const { data: clients } = await supabase.from("clients").select("id, faturamento, category_last_contact").eq("user_id", user?.id);
        
        if (clients) {
            for (const client of clients) {
                const { data: files } = await supabase.storage.from("client_vault").list(`${user?.id}/${client.id}`);
                if (files) {
                    const filesToDelete = files.filter(f => f.name.startsWith(`${editingCategory}___`)).map(f => `${user?.id}/${client.id}/${f.name}`);
                    if (filesToDelete.length > 0) await supabase.storage.from("client_vault").remove(filesToDelete);
                }

                let needsUpdate = false;
                const fat = client.faturamento || {};
                const lastC = client.category_last_contact || {};
                
                if (fat[editingCategory] !== undefined) { delete fat[editingCategory]; needsUpdate = true; }
                if (lastC[editingCategory] !== undefined) { delete lastC[editingCategory]; needsUpdate = true; }
                if (needsUpdate) await supabase.from("clients").update({ faturamento: fat, category_last_contact: lastC }).eq("id", client.id);
            }
        }

        const updated = (settings?.categories || []).filter(c => c !== editingCategory);
        await updateSettings({ categories: updated });
        if (selectedCategory === editingCategory) setSelectedCategory(updated.length > 0 ? updated[0] : "all");
        await loadOrders();
        setIsEditModalOpen(false);
    } catch (err) {
        console.error("Erro na exclusão:", err);
    } finally {
        setLoading(false);
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
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Gerencie seus pedidos e faturamentos inteligentes.</p>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
                onClick={handleUploadClick}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95 group"
            >
                <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                Enviar Pedidos
            </button>
            
            {syncStatus && (
               <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl animate-pulse">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
                    sincronização: {Math.round((syncStatus.current / syncStatus.total) * 100)}%
                  </span>
               </div>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
               <TrendingUp className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
               <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Faturamento geral</p>
               <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100 mt-1">{formatCurrency(totalGeral)}</h2>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
             <h3 className="text-sm font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Faturamento por Empresas</h3>
             
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
                    <span>Faturamento geral</span>
                  </div>
                </div>

                {(settings?.categories || []).map((cat: string) => (
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
                       <span className="font-bold text-sm truncate">{cat}</span>
                       <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-1">
                           {formatCurrency(catTotals[cat] || 0)}
                       </span>
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); openEditModal(cat); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 rounded-lg">
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
                  placeholder="Nova representada..."
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm bg-white dark:bg-zinc-950 dark:text-zinc-100"
                />
                <button onClick={addCategory} className="p-2 bg-indigo-600 text-white rounded-xl"><Plus className="w-5 h-5" /></button>
             </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 h-[calc(100vh-16rem)] flex flex-col">
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-zinc-850">
                <h2 className="text-lg font-black text-slate-900 dark:text-zinc-100">{selectedCategory === "all" ? "Faturamento geral" : selectedCategory}</h2>
                <div className="text-right">
                   <span className="text-xs text-slate-500 dark:text-zinc-400 uppercase">TOTAL:</span>
                   <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(totalCategory)}</p>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {loading ? (
                   <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
                ) : (
                   filteredOrders.slice(0, itemsLimit).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border border-slate-100 dark:border-zinc-850 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-950 transition-colors group">
                        <div className="flex items-center gap-3 truncate">
                          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                             <FileText className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                             <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">{order.file_name}</h4>
                             <Link to={`/dashboard/clientes/${order.client_id}`} className="text-xs text-indigo-600 hover:underline">{order.clientName}</Link>
                          </div>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] text-slate-400 font-bold">{new Date(order.created_at).toLocaleDateString("pt-BR")}</span>
                           <p className="text-sm font-black text-slate-800 dark:text-zinc-200">{formatCurrency(order.value)}</p>
                        </div>
                      </div>
                   ))
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md space-y-4">
                <div className="flex justify-between items-center">
                   <h3 className="text-xl font-bold">Editar Representada</h3>
                   <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400"><X className="w-5 h-5"/></button>
                </div>
                <input type="text" value={editNameInput} onChange={(e) => setEditNameInput(e.target.value)} className="w-full px-3 py-2 border rounded-xl dark:bg-zinc-950" />
                <div className="flex flex-col gap-2 pt-4">
                    <button onClick={handleSaveEdit} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm">Salvar Alterações</button>
                    <button onClick={handleDeleteSub} className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-sm border border-red-100">Excluir permanentemente</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-8 border-b dark:border-zinc-850 flex justify-between items-center bg-indigo-50/30 dark:bg-indigo-950/20">
                   <h3 className="text-2xl font-black">Portal de Envio Inteligente</h3>
                   <button onClick={() => setIsUploadModalOpen(false)} className="p-2 text-slate-400"><X className="w-6 h-6"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8">
                    {uploadFiles.length === 0 ? (
                        <div className="h-80 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-[32px] flex flex-col items-center justify-center space-y-4 bg-slate-50/50 dark:bg-zinc-950/50">
                            <Upload className="w-12 h-12 text-indigo-600" />
                            <label className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm cursor-pointer shadow-lg active:scale-95 transition-all">
                                Selecionar Arquivos
                                <input type="file" multiple onChange={(e) => e.target.files && processFiles(e.target.files)} className="hidden" />
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {uploadFiles.map((item, idx) => (
                                <div key={idx} className="p-5 rounded-3xl border border-slate-100 dark:border-zinc-850 bg-white dark:bg-zinc-900 flex items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 flex-1 truncate">
                                        <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-2xl"><FileText className="w-6 h-6" /></div>
                                        <div className="truncate">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">{item.file.name}</p>
                                            {item.status === 'processing' ? <span className="text-xs text-indigo-600 animate-pulse">Analisando...</span> : (
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                    <span className="text-xs font-black text-indigo-700">{item.clientName}</span>
                                                    <span className="text-xs font-bold text-slate-600">{item.category}</span>
                                                    <span className="text-xs font-black text-emerald-700">{formatCurrency(item.value)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {item.status === 'ready' && <button onClick={() => confirmSingleUpload(idx)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-xs">Confirmar e Salvar</button>}
                                    {item.status === 'saving' && <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />}
                                    {item.status === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
