import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Filter, FileText, Download, MoreHorizontal, Mail, Phone, Calendar, DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle, X, Upload, Loader2, FileSpreadsheet, ArrowRight, ExternalLink, ShoppingBag, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
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
    
    // Verificação de integridade silenciosa
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
        
        // Matching inteligente com limpeza de CNPJ
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
      const cleanName = selectedFile.name.replace(/[^\w.-]/g, "_");
      const path = ${user.id}//___VALOR____;
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
        
        // Matching inteligente com limpeza de CNPJ
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
      const path = ${user.id}//___VALOR____;
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
          <button onClick={() => setIsBatchModalOpen(true)} className="px-6 py-3 bg-white dark:bg-zinc-900 border rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm">Lote IA</button>
          <button onClick={() => setIsManualModalOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg">Novo Pedido</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Total</span>
          <p className="text-4xl font-black mt-1">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(orders.reduce((a,b)=>a+(b.value||0),0))}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pedidos</span>
          <p className="text-4xl font-black mt-1">{orders.length}</p>
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisar pedidos..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-slate-50 dark:bg-zinc-950 border-none rounded-2xl text-xs font-bold w-64 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-zinc-950/50 text-[10px] font-black text-slate-400 uppercase"><tr> <th className="p-6">Cliente</th> <th className="p-6">Categoria</th> <th className="p-6 text-right">Valor</th> <th className="p-6 text-center">Data</th> </tr></thead>
          <tbody className="divide-y border-t">
            {orders.filter(o=>o.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(order => (
              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-6 font-bold">{order.client?.name}</td>
                <td className="p-6"><span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase text-center block w-fit">{order.category}</span></td>
                <td className="p-6 text-right font-black">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.value)}</td>
                <td className="p-6 text-center text-xs font-bold text-slate-500">{new Date(order.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[40px] p-10 shadow-2xl border">
            <form onSubmit={handleManualSubmit} className="space-y-8">
              <div className="flex justify-between"><h2 className="text-2xl font-black uppercase">Novo Pedido</h2><X onClick={()=>setIsManualModalOpen(false)} className="cursor-pointer"/></div>
              <div className="space-y-4">
                <div className="relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950">
                  <input type="file" onChange={handleManualFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-[10px] font-black text-slate-400 uppercase">{selectedFile ? selectedFile.name : "Clique para selecionar arquivo"}</p>
                </div>
                {isAnalyzingManual && <p className="animate-pulse text-indigo-600 font-bold text-xs uppercase px-2 text-center">Analisando pela IA...</p>}
                {analysisResult && <div className="p-6 bg-emerald-50 rounded-3xl"><span className="text-[10px] font-black text-emerald-600 uppercase">LIDO:</span><p className="font-black text-slate-900">{analysisResult.client}</p></div>}
                <div className="grid grid-cols-2 gap-4">
                  <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} required className="p-5 bg-slate-50 border rounded-2xl font-black text-xs uppercase outline-none"><option value="">CATEGORIA</option>{(settings.categories||[]).map(c=>(<option key={c} value={c}>{c}</option>))}</select>
                  <input type="text" value={orderValue} onChange={e=>setOrderValue(e.target.value)} required className="p-5 bg-slate-50 border rounded-2xl font-black text-xl outline-none" />
                </div>
              </div>
              <button disabled={isSaving} className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">{isSaving ? "SALVANDO..." : "CONFIRMAR"}</button>
            </form>
          </div>
        </div>
      )}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-6xl max-h-[90vh] rounded-[48px] p-12 overflow-hidden flex flex-col shadow-2xl border">
            <div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-black uppercase">Lote IA</h2><X onClick={()=>setIsBatchModalOpen(false)} className="cursor-pointer"/></div>
            <div className="flex-1 overflow-y-auto mb-10 pr-4">
              {batchResults.length === 0 ? (<div className="h-64 border-4 border-dashed rounded-[40px] flex items-center justify-center relative bg-slate-50"><input type="file" multiple onChange={handleBatchUpload} className="absolute inset-0 opacity-0 cursor-pointer"/><p className="font-black text-slate-400 uppercase tracking-widest text-sm">Arraste seus pedidos aqui</p></div>) : (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{batchResults.map((r,i)=>(<div key={i} className="p-6 bg-slate-50 dark:bg-zinc-950 border rounded-3xl flex justify-between items-center shadow-sm"><div><p className="font-black truncate max-w-[200px]">{r.client}</p><span className="text-[10px] font-black text-indigo-600 uppercase">{r.category}</span></div><div className="text-right"><p className="font-black text-xl tabular-nums">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(r.value)}</p><button onClick={()=>confirmBatchOrder(r)} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-sm">CONFIRMAR</button></div></div>))}</div>)}
            </div>
            {isProcessingBatch && (
              <div className="flex items-center gap-3 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                <p className="text-indigo-600 font-black uppercase text-xs tracking-widest italic">PROCESSANDO LOTE COM IA...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
