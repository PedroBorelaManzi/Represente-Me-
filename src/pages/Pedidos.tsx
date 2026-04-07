import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Filter, FileText, Download, MoreHorizontal, Mail, Phone, Calendar, DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle, X, Upload, Loader2, FileSpreadsheet, ArrowRight, ExternalLink, ShoppingBag, UserPlus, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { processOrderFile } from "../lib/orderProcessor";
import { getHighPrecisionCoordinates } from "../lib/geminiGeocoding";
import { toast } from "sonner";

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
    const cleanName = name?.trim();
    
    // Verificação de INTEGRIDADE/DUPLICIDADE (Melhorada para evitar duplicatas sem CNPJ)
    let query = supabase.from("clients").select("id, name").eq("user_id", user.id);
    if (cleanCnpj) {
      query = query.eq("cnpj", cleanCnpj);
    } else {
      query = query.eq("name", cleanName);
    }

    const { data: existing } = await query.maybeSingle();
    if (existing) return existing;

    let lat = -23.5505, lng = -46.6333;
    if (address) { 
        try { 
            const coords = await getHighPrecisionCoordinates(address, cleanName, cleanCnpj); 
            if (coords) { lat = coords.lat; lng = coords.lng; } 
        } catch (e) {} 
    }

    const { data, error } = await supabase.from("clients").insert([{ 
        user_id: user.id, 
        name: cleanName, 
        cnpj: cleanCnpj || null, 
        address: address || "", 
        lat, 
        lng, 
        status: "Ativo" 
    }]).select().single();

    if (error) throw error; 
    loadData(); 
    return data;
  };

  const handleManualFileChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSelectedFile(file); setIsAnalyzingManual(true);
    try {
      const result = await processOrderFile(file, clients.map(c => c.name), settings.categories || []);
      if (result.status === "ready") {
        setAnalysisResult(result); setOrderValue(result.value?.toString() || "");
        
        const cleanResCnpj = result.cnpj?.replace(/\D/g, "");
        const match = clients.find(c => {
          const clientCnpj = c.cnpj?.replace(/\D/g, "");
          return (cleanResCnpj && clientCnpj === cleanResCnpj) || c.name?.toLowerCase().includes(result.client?.toLowerCase());
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
      
      if (!cid) throw new Error("Cliente não selecionado ou criado.");

      const cleanName = selectedFile.name.replace(/[^\w.-]/g, "_");
      const path = `${user.id}/${cid}/${selectedCategory}___VALOR_${orderValue}___${cleanName}`;
      
      const { error: uploadError } = await supabase.storage.from("client_vault").upload(path, selectedFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: orderError } = await supabase.from("orders").insert([{ 
          user_id: user.id, 
          client_id: cid, 
          category: selectedCategory, 
          value: parseFloat(orderValue), 
          file_name: cleanName, 
          file_path: path, 
          status: "concluido" 
      }]);
      
      if (orderError) throw orderError;

      toast.success("Pedido registrado com sucesso!");
      setIsManualModalOpen(false); 
      loadData();
    } catch (err: any) { 
      toast.error("Erro ao salvar: " + err.message); 
    } finally { 
      setIsSaving(false); 
    }
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
      
      if (!cid) throw new Error("Erro ao identificar cliente.");

      const path = `${user.id}/${cid}/${res.category}___VALOR_${res.value}___${res.file.name}`;
      await supabase.storage.from("client_vault").upload(path, res.file, { upsert: true });
      await supabase.from("orders").insert([{ user_id: user.id, client_id: cid, category: res.category, value: res.value, file_name: res.file.name, file_path: path, status: "concluido" }]);
      
      toast.success(`Pedido ${res.file.name} confirmado!`);
      setBatchResults(prev => prev.filter(item => item.file !== res.file)); 
      loadData();
    } catch (err: any) { 
      toast.error("Erro: " + err.message); 
    }
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50 dark:bg-zinc-950 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2 italic uppercase tracking-tighter">
            <ShoppingBag className="w-8 h-8 text-indigo-600" /> Fluxo de Pedidos
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Sincronização de vendas e faturamento automático.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsBatchModalOpen(true)} 
            className="px-6 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" /> Lote IA
          </button>
          <button 
            onClick={() => setIsManualModalOpen(true)} 
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Pedido
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border dark:border-zinc-800 shadow-sm overflow-hidden relative group">
          <div className="flex justify-between items-start mb-6">
             <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl text-indigo-600">
                <DollarSign className="w-6 h-6" />
             </div>
             <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Faturamento Acumulado</span>
          <p className="text-4xl font-black text-slate-900 dark:text-zinc-100 tabular-nums">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(orders.reduce((a,b)=>a+(b.value||0),0))}
          </p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase italic">
             <CheckCircle2 className="w-3 h-3" /> Atualizado em tempo real
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border dark:border-zinc-800 shadow-sm overflow-hidden relative group">
          <div className="flex justify-between items-start mb-6">
             <div className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-600">
                <ShoppingBag className="w-6 h-6" />
             </div>
             <Clock className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Volume de Pedidos</span>
          <p className="text-4xl font-black text-slate-900 dark:text-zinc-100 tabular-nums">{orders.length}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60 italic">
             Total de envios processados
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[40px] border dark:border-zinc-800 shadow-xl overflow-hidden">
        <div className="p-8 border-b dark:border-zinc-850 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Localizar comanda ou cliente..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-slate-50 dark:bg-zinc-950 border-none rounded-2xl text-xs font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
            />
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Visibilidade: Global</span>
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-zinc-950/50">
               <tr> 
                 <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente / Razão Social</th> 
                 <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Representada</th> 
                 <th className="px-8 py-5 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor do Pedido</th> 
                 <th className="px-8 py-5 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Data Processamento</th> 
               </tr>
            </thead>
            <tbody className="divide-y dark:divide-zinc-850">
              {orders.filter(o=>o.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(order => (
                <tr key={order.id} className="group hover:bg-slate-50/80 dark:hover:bg-zinc-950/50 transition-colors">
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 flex items-center justify-center text-xs font-black text-indigo-600 shadow-sm">{order.client?.name?.charAt(0)}</div>
                        <div className="font-black text-sm text-slate-900 dark:text-zinc-100 line-clamp-1">{order.client?.name}</div>
                     </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-tight border border-indigo-100/50 dark:border-indigo-900/30">
                      {order.category}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-zinc-100 tabular-nums">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.value)}
                  </td>
                  <td className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[40px] p-10 shadow-2xl border border-white/10 overflow-hidden">
              <form onSubmit={handleManualSubmit} className="space-y-8">
                <div className="flex justify-between items-center">
                   <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter italic">Lançamento de Pedido</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronize arquivos e faturamento de forma manual</p>
                   </div>
                   <button type="button" onClick={()=>setIsManualModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400"/></button>
                </div>

                <div className="space-y-5">
                  <div className="relative border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-[32px] p-10 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-950 transition-all hover:border-indigo-500 group cursor-pointer">
                    <input type="file" onChange={handleManualFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Upload className="w-10 h-10 text-slate-400 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center px-4">
                      {selectedFile ? selectedFile.name : "Clique ou arraste o arquivo do pedido"}
                    </p>
                    <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase tracking-widest italic">Suporta PDF, Imagens e Excel</p>
                  </div>

                  {isAnalyzingManual && (
                    <div className="flex items-center justify-center gap-3 py-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 animate-pulse">
                       <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                       <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest italic">Inteligência Artificial Analisando...</span>
                    </div>
                  )}

                  {analysisResult && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100/50">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">Dados Detectados:</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                       </div>
                       <p className="font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">{analysisResult.client}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">CNPJ: {analysisResult.cnpj || "Não detectado"}</p>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-3 italic">Representada</label>
                       <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} required className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-black text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer">
                          <option value="">SELECIONE</option>
                          {(settings.categories||[]).map(c=>(<option key={c} value={c}>{c}</option>))}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-3 italic">Valor R$</label>
                       <input type="text" placeholder="00,00" value={orderValue} onChange={e=>setOrderValue(e.target.value)} required className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                   <button 
                     disabled={isSaving} 
                     type="submit"
                     className="w-full py-6 bg-indigo-600 text-white rounded-[28px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-500/30 hover:translate-y-[-2px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                   >
                     {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <>AUTORIZAR LANÇAMENTO <ChevronRight className="w-5 h-5"/></>}
                   </button>
                   {showNewClientForm && (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                         <UserPlus className="w-5 h-5 text-amber-600" />
                         <p className="text-[9px] font-black text-amber-700 uppercase tracking-tight">Novo cliente detectado e será cadastrado automaticamente.</p>
                      </div>
                   )}
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 w-full max-w-6xl max-h-[85vh] rounded-[48px] p-12 overflow-hidden flex flex-col shadow-2xl border border-white/10">
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic italic">Processamento em Lote</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">Sincronização em massa guiada por Inteligência Artificial</p>
                 </div>
                 <button onClick={()=>setIsBatchModalOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-8 h-8 text-slate-400"/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto mb-8 pr-4 custom-scrollbar">
                {batchResults.length === 0 ? (
                   <div className="h-80 border-4 border-dashed border-slate-100 dark:border-zinc-850 rounded-[40px] flex flex-col items-center justify-center relative bg-slate-50/30 dark:bg-zinc-950/30 group hover:border-indigo-500 transition-all cursor-pointer">
                      <input type="file" multiple onChange={handleBatchUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                      <div className="p-8 bg-white dark:bg-zinc-800 rounded-3xl shadow-xl mb-6 group-hover:scale-110 transition-transform">
                         <Upload className="w-12 h-12 text-indigo-600" />
                      </div>
                      <p className="font-black text-slate-900 dark:text-zinc-100 uppercase tracking-widest text-base">Arraste múltiplos arquivos aqui</p>
                      <p className="text-[10px] text-slate-400 mt-2 font-black uppercase opacity-60">Ideal para faturamento mensal e auditorias</p>
                   </div>
                ) : (
                   <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-10">
                      {batchResults.map((r,i)=>(
                         <motion.div 
                           key={i} 
                           initial={{ opacity: 0, x: -20 }} 
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: i * 0.05 }}
                           className="p-8 bg-white dark:bg-zinc-950 border dark:border-zinc-850 rounded-[32px] flex flex-col sm:flex-row justify-between items-center shadow-sm relative overflow-hidden group"
                         >
                            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 opacity-20" />
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-2">
                                  <FileText className="w-4 h-4 text-slate-400" />
                                  <span className="text-[10px] font-black text-slate-400 uppercase truncate">{r.file.name}</span>
                               </div>
                               <p className="font-black text-xl text-slate-900 dark:text-zinc-100 uppercase truncate mb-1">{r.client}</p>
                               <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase border border-indigo-100/50 italic">{r.category}</span>
                            </div>
                            <div className="text-right mt-6 sm:mt-0 ml-0 sm:ml-8 border-t sm:border-t-0 sm:border-l dark:border-zinc-850 pt-6 sm:pt-0 pl-0 sm:pl-8 min-w-[200px]">
                               <p className="font-black text-3xl text-slate-900 dark:text-zinc-100 tabular-nums">
                                  {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(r.value)}
                               </p>
                               <button 
                                 onClick={()=>confirmBatchOrder(r)} 
                                 className="w-full mt-4 py-3 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                               >
                                  CONFIRMAR ENVIO
                               </button>
                            </div>
                         </motion.div>
                      ))}
                   </div>
                )}
              </div>
              
              {isProcessingBatch && (
                <div className="flex items-center justify-between p-8 bg-indigo-600 rounded-[32px] shadow-2xl shadow-indigo-500/40">
                   <div className="flex items-center gap-4">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                      <div>
                         <p className="text-white font-black uppercase text-base tracking-tighter italic leading-none">Análise Coletiva em Andamento</p>
                         <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mt-1">Aguarde enquanto a IA processa os documentos selecionados</p>
                      </div>
                   </div>
                   <div className="hidden md:block">
                      <div className="h-1.5 w-48 bg-white/20 rounded-full overflow-hidden">
                         <div className="h-full w-1/3 bg-white animate-progress-flow" />
                      </div>
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
