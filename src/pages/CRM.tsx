import React, { useState, useEffect, useMemo } from "react";
import { Search, MapPin, Building2, Phone, Mail, FileText, ChevronRight, Filter, Plus, Trash2, Clock, CheckCircle2, TrendingUp, AlertCircle, X, Download, UserPlus, MoreHorizontal, Settings, LayoutGrid, Info, Loader2, Upload } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import Map from "../components/Map";

export default function CRMPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{current: number, total: number} | null>(null);

  const loadClients = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true }); // Ordenação alfabética padrão

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error("Load Clients Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj?.includes(searchTerm) ||
      c.address?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, searchTerm]);

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este cliente? Todos os pedidos associados serão mantidos, mas o vínculo será perdido.")) return;
    
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id).eq("user_id", user?.id);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedClient?.id === id) setSelectedClient(null);
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  // Verificação de Duplicidade por CNPJ
  const checkDuplicateCnpj = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (!cleanCnpj) return null;
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .eq("cnpj", cleanCnpj)
      .eq("user_id", user?.id)
      .maybeSingle();
    return data;
  };

  const getClientFaturamentoTotal = (client: any) => {
    const fat = client.faturamento || {};
    return Object.values(fat).reduce((sum: number, val: any) => sum + Number(val), 0) as number;
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <MapPin className="w-7 h-7 text-indigo-600" /> CRM Geográfico
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Gerencie {clients.length} clientes e sua distribuição no mapa.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
               type="text"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="Buscar por nome, CNPJ ou endereço..."
               className="pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm w-80 outline-none focus:ring-2 focus:ring-indigo-500"
             />
           </div>
        </div>
      </div>

      {/* Main Content: Map & List Split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* List Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 flex flex-col min-h-0 shadow-sm overflow-hidden">
          <div className="p-4 border-b dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/20 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <LayoutGrid className="w-3 h-3" /> LISTA ALFABÉTICA
            </span>
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 text-[10px] font-black rounded-md">
                {filteredClients.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {loading ? (
                <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /></div>
             ) : (
                filteredClients.map((client) => (
                   <div 
                     key={client.id}
                     onClick={() => setSelectedClient(client)}
                     className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 relative group ${selectedClient?.id === client.id ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40' : 'hover:bg-slate-50 dark:hover:bg-zinc-950 border border-transparent'}`}
                   >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase ${selectedClient?.id === client.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-zinc-850 text-slate-500 dark:text-zinc-400'}`}>
                         {client.name?.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-xs font-black text-slate-900 dark:text-zinc-100 truncate uppercase">{client.name}</p>
                         <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">{client.cnpj || "Sem CNPJ"}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-all">
                         <Trash2 className="w-3.5 h-3.5" />
                      </button>
                   </div>
                ))
             )}
          </div>
        </div>

        {/* Map Panel */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col">
           <Map 
             clients={filteredClients} 
             onClientSelect={setSelectedClient}
             selectedClientId={selectedClient?.id}
           />
           
           {/* Floating Client Detail Overlay */}
           <AnimatePresence>
             {selectedClient && (
                <motion.div 
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  className="absolute top-4 right-4 w-80 bg-white dark:bg-zinc-900/95 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 z-20"
                >
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex-1 min-w-0">
                         <h3 className="text-lg font-black text-slate-900 dark:text-zinc-100 uppercase leading-tight">{selectedClient.name}</h3>
                         <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{selectedClient.status}</p>
                      </div>
                      <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-slate-400"><X className="w-5 h-5"/></button>
                   </div>

                   <div className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Resumo de Faturamento</span>
                         <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(getClientFaturamentoTotal(selectedClient))}
                         </p>
                      </div>

                      <div className="space-y-2">
                         <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-zinc-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{selectedClient.address}</span>
                         </div>
                         <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-zinc-400">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>CNPJ: {selectedClient.cnpj}</span>
                         </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-zinc-850 flex gap-2">
                         <button className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Ver Histórico</button>
                      </div>
                   </div>
                </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      {/* Settings Modal (Simplified) */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
             <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-lg p-8 space-y-6 shadow-2xl border border-slate-100 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                   <h2 className="text-xl font-black uppercase">Importação Geográfica</h2>
                   <X onClick={() => setIsImportModalOpen(false)} className="cursor-pointer text-slate-400" />
                </div>
                
                {importProgress && (
                   <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                         <span>PROCESSANDO...</span>
                         <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                         <motion.div 
                           className="h-full bg-indigo-600"
                           initial={{ width: 0 }}
                           animate={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                         />
                      </div>
                   </div>
                )}

                <div className="p-6 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-[28px] flex flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-zinc-950/50">
                    <Upload className="w-10 h-10 text-indigo-600" />
                    <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Selecionar Arquivo</button>
                    <p className="text-[10px] text-slate-400 font-bold">Suporte para Excel (.xlsx) e CSV</p>
                </div>
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}