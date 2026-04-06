import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Filter, FileText, Download, MoreHorizontal, Mail, Phone, Calendar, DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle, X, Upload, Loader2, FileSpreadsheet, ArrowRight, ExternalLink, Table as TableIcon, LayoutGrid, ShoppingBag, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { processOrderFile } from "../lib/orderProcessor";
import { getHighPrecisionCoordinates } from "../lib/geminiGeocoding";

export default function PedidosPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [settings, setSettings] = useState({});
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzingManual, setIsAnalyzingManual] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  useEffect(() => { if (user) { loadData(); loadSettings(); } }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
    if (data) setSettings(data);
  };

  const loadData = async () => {
    setLoading(true);
    const { data: o } = await supabase.from("orders").select("*, client:clients(name, cnpj)").eq("user_id", user.id).order("created_at", { ascending: false });
    const { data: c } = await supabase.from("clients").select("id, name, cnpj").eq("user_id", user.id).order("name");
    setOrders(o || []); setClients(c || []); setLoading(false);
  };

  const registerNewClient = async (name, cnpj, address) => {
    const cleanCnpj = cnpj ? cnpj.replace(/\D/g, "") : "";
    
    // Verificação de última hora para evitar duplicatas em processos paralelos
    if (cleanCnpj) {
      const { data: existing } = await supabase.from("clients").select("id").eq("cnpj", cleanCnpj).eq("user_id", user.id).maybeSingle();
      if (existing) return existing;
    }

    let lat = -23.5505, lng = -46.6333;
    if (address) { try { const coords = await getHighPrecisionCoordinates(address); if (coords) { lat = coords.lat; lng = coords.lng; } } catch (e) {} }
    const { data, error } = await supabase.from("clients").insert([{ user_id: user.id, name, cnpj: cleanCnpj, address: address || "", latitude: lat, longitude: lng, status: "Ativo" }]).select().single();
    if (error) throw error; loadData(); return data;
  };

  const handleManualFileChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSelectedFile(file); setIsAnalyzingManual(true);
    try {
      const result = await processOrderFile(file, clients.map(c => c.name), settings.categories || []);
      if (result.status === "ready") {
        setAnalysisResult(result); setOrderValue(result.value?.toString() || "");
        const cleanResultCnpj = result.cnpj?.replace(/\D/g, "");
        const match = clients.find(c => {
          const clientCnpj = c.cnpj?.replace(/\D/g, "");
          return (cleanResultCnpj && clientCnpj === cleanResultCnpj) || c.name?.toLowerCase().includes(result.client?.toLowerCase());
        });
        if (match) { setSelectedClient(match.id); setShowNewClientForm(false); } else { setShowNewClientForm(true); setSelectedClient(""); }
        if (result.category) {
          const catMatch = (settings.categories || []).find(cat => cat.toLowerCase().includes(result.category.toLowerCase()));
          if (catMatch) setSelectedCategory(catMatch);
        }
      }
    } catch (err) {} finally { setIsAnalyzingManual(false); }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault(); if (!user || !selectedCategory || !orderValue || !selectedFile) return;
    setIsSaving(true);
    try {
      let cid = selectedClient;
      if (showNewClientForm && analysisResult) {
        const n = await registerNewClient(analysisResult.client, analysisResult.cnpj, analysisResult.address);
        if (n) cid = n.id;
      }
      const cleanName = selectedFile.name.replace(/[^\w.-]/g, "_");
      const path = `${user.id}/${cid}/${selectedCategory}___VALOR_${orderValue}___${cleanName}`;
      await supabase.storage.from("client_vault").upload(path, selectedFile, { upsert: true });
      await supabase.from("orders").upsert([{ user_id: user.id, client_id: cid, category: selectedCategory, value: parseFloat(orderValue), file_name: cleanName, file_path: path, status: "concluido" }]);
      setIsManualModalOpen(false); loadData();
    } catch (err) { alert(err.message); } finally { setIsSaving(false); }
  };

  const handleBatchUpload = async (e) => {
    const files = Array.from(e.target.files || []); setIsProcessingBatch(true);
    for (const file of files) {
      try {
        const res = await processOrderFile(file, clients.map(c => c.name), settings.categories || []);
        const cleanResCnpj = res.cnpj?.replace(/\D/g, "");
        const match = clients.find(c => {
          const clientCnpj = c.cnpj?.replace(/\D/g, "");
          return (cleanResCnpj && clientCnpj === cleanResCnpj) || c.name?.toLowerCase().includes(res.client?.toLowerCase());
        });
        setBatchResults(prev => [...prev, { file, client: res.client, category: res.category, value: res.value, needsNewClient: !match, clientId: match?.id, address: res.address, cnpj: res.cnpj }]);
      } catch (err) {} 
    }
    setIsProcessingBatch(false);
  };

  const confirmBatchOrder = async (res) => {
    try {
      let cid = res.clientId;
      if (res.needsNewClient) { const n = await registerNewClient(res.client, res.cnpj, res.address); if (n) cid = n.id; }
      const path = `${user.id}/${cid}/${res.category}___VALOR_${res.value}___${res.file.name}`;
      await supabase.storage.from("client_vault").upload(path, res.file, { upsert: true });
      await supabase.from("orders").upsert([{ user_id: user.id, client_id: cid, category: res.category, value: res.value, file_name: res.file.name, file_path: path, status: "concluido" }]);
      setBatchResults(prev => prev.filter(item => item.file !== res.file)); loadData();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-zinc-950 min-h-screen text-slate-900 dark:text-zinc-100">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black flex items-center gap-3"><ShoppingBag className="w-10 h-10 text-indigo-600"/> PEDIDOS</h1>
        <div className="flex gap-3">
          <button onClick={() => setIsBatchModalOpen(true)} className="px-6 py-3 bg-white dark:bg-zinc-900 border rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-colors">Lote IA</button>
          <button onClick={() => setIsManualModalOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-colors">Novo Pedido</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border dark:border-zinc-800 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Total</span>
          <p className="text-4xl font-black mt-1 tabular-nums">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(orders.reduce((a,b)=>a+(b.value||0),0))}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border dark:border-zinc-800 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pedidos</span>
          <p className="text-4xl font-black mt-1 tabular-nums">{orders.length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-950/30">
           <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Histórico Recente</h2>
           <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950 border dark:border-zinc-850 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-zinc-950/50 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              <tr> <th className="p-6">Cliente</th> <th className="p-6">Categoria</th> <th className="p-6 text-right">Valor</th> <th className="p-6 text-center">Data</th> </tr>
            </thead>
            <tbody className="divide-y dark:divide-zinc-800">
              {orders.filter(o=>o.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(order => (
                <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-zinc-950/50 transition-colors">
                  <td className="p-6 font-bold text-sm">{order.client?.name}</td>
                  <td className="p-6"><span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{order.category}</span></td>
                  <td className="p-6 text-right font-black tabular-nums">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.value)}</td>
                  <td className="p-6 text-center text-xs font-bold text-slate-500">{new Date(order.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/95 dark:bg-zinc-900/95 w-full max-w-xl rounded-[32px] p-10 shadow-2xl border border-white/20 dark:border-zinc-800/50 backdrop-blur-xl"
            >
              <form onSubmit={handleManualSubmit} className="space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                       <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-indigo-600"><Plus className="w-5 h-5"/></div>
                       Novo Pedido
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Extração inteligente de dados</p>
                  </div>
                  <button type="button" onClick={() => setIsManualModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                
                <div className="space-y-4">
                  <div className="relative h-40 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-950/50 group hover:border-indigo-400 transition-all overflow-hidden">
                    <input type="file" onChange={handleManualFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Arraste ou clique para selecionar</p>
                    {selectedFile && <div className="absolute inset-0 bg-indigo-600 flex items-center justify-center px-6"><p className="text-white font-bold text-sm truncate">{selectedFile.name}</p></div>}
                  </div>

                  {isAnalyzingManual && (
                    <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                       <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Analisando documento...</p>
                    </div>
                  )}

                  {analysisResult && (
                    <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/20">
                       <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Empresa Detectada:</span>
                       <p className="font-black text-slate-900 dark:text-zinc-100 mt-1 uppercase italic">{analysisResult.client}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label>
                       <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} required className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-black text-xs uppercase outline-none focus:border-indigo-500 transition-colors">
                          <option value="">SELECIONE</option>
                          {(settings.categories||[]).map(c=>(<option key={c} value={c}>{c}</option>))}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Valor do Pedido</label>
                       <input type="text" value={orderValue} onChange={e=>setOrderValue(e.target.value)} required className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-black text-xl outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                  </div>
                </div>

                <button 
                  disabled={isSaving} 
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all"
                >
                  {isSaving ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : "CONFIRMAR PEDIDO"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 40 }}
              className="bg-white/95 dark:bg-zinc-900/95 w-full max-w-6xl max-h-[92vh] rounded-[48px] p-12 overflow-hidden flex flex-col shadow-2xl border border-white/20 dark:border-zinc-800/50 backdrop-blur-xl"
            >
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-zinc-100 italic">Lote IA</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Processamento de alta performance</p>
                </div>
                <button onClick={() => setIsBatchModalOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-8 h-8 text-slate-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto mb-10 pr-2 custom-scrollbar">
                {batchResults.length === 0 ? (
                  <div className="h-96 border-4 border-dashed border-slate-200 dark:border-zinc-800 rounded-[48px] flex flex-col items-center justify-center relative group hover:border-indigo-400 transition-all bg-slate-50/50 dark:bg-zinc-950/30">
                    <input type="file" multiple onChange={handleBatchUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                       <Upload className="w-12 h-12 text-indigo-600" />
                    </div>
                    <p className="font-black text-slate-900 dark:text-zinc-100 uppercase tracking-widest">Solte seus arquivos aqui</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Suporta PDF, Imagens e Excel</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {batchResults.map((r, i) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        key={i} 
                        className="p-6 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-[32px] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border-l-8 border-l-indigo-600"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                             <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600"><FileText className="w-5 h-5"/></div>
                             {r.needsNewClient && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100 italic">Novo Cadastro</span>}
                          </div>
                          <p className="font-black text-slate-900 dark:text-zinc-100 truncate text-lg">{r.client || "Não detectado"}</p>
                          <div className="flex gap-2 mt-2">
                             <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 rounded-md text-[9px] font-black uppercase tracking-tighter">{r.category || "Sem categoria"}</span>
                             <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-black uppercase tracking-tighter">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(r.value)}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => confirmBatchOrder(r)} 
                          className="mt-6 w-full py-3 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-white transition-colors"
                        >
                          CONFIRMAR
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              
              {isProcessingBatch && (
                <div className="flex items-center justify-center p-6 bg-indigo-600 rounded-3xl gap-4">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                  <p className="text-white font-black uppercase tracking-widest text-sm text-center">IA extraindo dados de múltiplos pedidos...</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
