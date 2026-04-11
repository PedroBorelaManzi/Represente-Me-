import React, { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Search, Filter, FileText, Download, MoreHorizontal, Mail, Phone, Calendar, DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle, X, Upload, Loader2, FileSpreadsheet, ArrowRight, ExternalLink, ShoppingBag, UserPlus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { processOrderFile } from "../lib/orderProcessor";
import { getHighPrecisionCoordinates } from "../lib/geminiGeocoding";
import { toast } from "sonner";
import UpgradeModal from "../components/UpgradeModal";

export default function PedidosPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzingManual, setIsAnalyzingManual] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<'lote'>('lote');

  useEffect(() => { if (user) { loadData(); } }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: o } = await supabase.from("orders").select("*, client:clients(id, name, cnpj)").eq("user_id", user?.id).order("created_at", { ascending: false });
    const { data: c } = await supabase.from("clients").select("id, name, cnpj").eq("user_id", user?.id).order("name");
    setOrders(o || []); setClients(c || []); setLoading(false);
  };

  const registerNewClient = async (name: string, cnpj: string, address: string) => {
    const cleanCnpj = cnpj ? cnpj.replace(/\D/g, "") : "";
    const cleanName = name?.trim();
    if (cleanCnpj) {
      const { data: existing } = await supabase.from("clients").select("id").eq("cnpj", cleanCnpj).eq("user_id", user?.id).maybeSingle();
      if (existing) return existing;
    }
    const { data, error } = await supabase.from("clients").insert([{ user_id: user?.id, name: cleanName, cnpj: cleanCnpj, address: address || "", status: "Ativo" }]).select().single();
    if (error) throw error; loadData(); return data;
  };

  const handleManualFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSelectedFile(file); setIsAnalyzingManual(true);
    try {
      const result = await processOrderFile(file, clients.map(c => c.name), settings.categories || []);
      if (result.status === "ready") {
        setAnalysisResult(result); setOrderValue(result.value?.toString() || "");
        const match = clients.find(c => (result.cnpj && c.cnpj?.replace(/\D/g, "") === result.cnpj.replace(/\D/g, "")) || (c.name?.trim().toLowerCase() === result.client?.trim().toLowerCase()));
        if (match) { setSelectedClient(match.id); setShowNewClientForm(false); } else { setShowNewClientForm(true); setSelectedClient(""); }
        if (result.category) {
          const catMatch = (settings.categories || []).find((cat: string) => cat.toLowerCase().includes(result.category.toLowerCase()));
          if (catMatch) setSelectedCategory(catMatch);
        }
      }
    } catch (err) {} finally { setIsAnalyzingManual(false); }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const plan = settings.subscription_plan || 'Acesso Exclusivo';
    
    if (plan === 'Acesso Exclusivo' && files.length > 1) {
       setUpgradeFeature('lote');
       setIsUpgradeModalOpen(true);
       return;
    }
    if (plan === 'Profissional' && files.length > 10) {
       setUpgradeFeature('lote');
       setIsUpgradeModalOpen(true);
       return;
    }

    setIsProcessingBatch(true);
    for (const file of files) {
      try {
        const res = await processOrderFile(file, clients.map(c => c.name), settings.categories || []);
        const match = clients.find(c => (res.cnpj && c.cnpj?.replace(/\D/g, "") === res.cnpj.replace(/\D/g, "")) || (c.name?.trim().toLowerCase() === res.client?.trim().toLowerCase()));
        setBatchResults(prev => [...prev, { file, client: res.client, category: res.category, value: res.value, needsNewClient: !match, clientId: match?.id, address: res.address, cnpj: res.cnpj }]);
      } catch (err) {} 
    }
    setIsProcessingBatch(false);
  };

  const confirmBatchOrder = async (res: any) => {
    try {
      let cid = res.clientId;
      if (res.needsNewClient) { const n = await registerNewClient(res.client, res.cnpj, res.address); if (n) cid = n.id; }
      const cleanName = res.file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
      const formattedName = `${res.category}___VALOR_${res.value}___${cleanName}`;
      const path = `${user?.id}/${cid}/${formattedName}`;
      await supabase.storage.from("client_vault").upload(path, res.file, { upsert: true });
      await supabase.from("orders").upsert([{ user_id: user?.id, client_id: cid, category: res.category, value: res.value, file_name: formattedName, file_path: path, status: "concluido" }], { onConflict: "client_id,file_path" });
      setBatchResults(prev => prev.filter(item => item.file !== res.file)); loadData();
      toast.success("Pedido processado!");
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteOrder = async (order: any) => {
    if (!window.confirm("Excluir pedido?")) return;
    try {
      if (order.file_path) await supabase.storage.from("client_vault").remove([order.file_path]);
      await supabase.from("orders").delete().eq("id", order.id);
      toast.success("Pedido excluído!"); loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const faturamentoPorEmpresa = useMemo(() => {
    const caps: any = {};
    orders.forEach(o => { caps[o.category] = (caps[o.category] || 0) + (o.value || 0); });
    return Object.entries(caps).sort((a: any, b: any) => b[1] - a[1]);
  }, [orders]);

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-zinc-950 min-h-screen text-slate-900 dark:text-zinc-100">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black flex items-center gap-3 uppercase"><ShoppingBag className="w-10 h-10 text-indigo-600"/> Pedidos</h1>
        <div className="flex gap-3">
          <button onClick={() => setIsBatchModalOpen(true)} className="px-6 py-3 bg-white dark:bg-zinc-900 border rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">Lote IA</button>
          <button onClick={() => setIsManualModalOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Novo Pedido</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-6">
           <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border shadow-sm">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Geral</span>
             <p className="text-4xl font-black mt-1 text-indigo-600">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(orders.reduce((a,b)=>a+(b.value||0),0))}</p>
           </div>
        </div>
        <div className="md:col-span-3 bg-white dark:bg-zinc-900 p-8 rounded-3xl border shadow-sm flex flex-wrap gap-4 items-center">
           {faturamentoPorEmpresa.map(([cat, val]: any) => (
              <div key={cat} className="px-4 py-2 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-100">
                 <span className="text-[8px] font-black text-slate-400 uppercase block leading-none">{cat}</span>
                 <p className="text-xs font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}</p>
              </div>
           ))}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Filtrar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold w-64 outline-none" />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase"><tr> <th className="p-6">Cliente</th> <th className="p-6">Categoria</th> <th className="p-6 text-right">Valor</th> <th className="p-6 text-center">Data</th> <th className="p-6 text-right"></th> </tr></thead>
          <tbody className="divide-y">{orders.filter(o=>o.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(order => (
            <tr key={order.id} className="hover:bg-slate-50">
              <td className="p-6 font-bold">{order.client?.name}</td>
              <td className="p-6 font-black text-[10px] uppercase text-indigo-600">{order.category}</td>
              <td className="p-6 text-right font-black">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.value)}</td>
              <td className="p-6 text-center text-[10px] font-bold text-slate-400">{new Date(order.created_at).toLocaleDateString("pt-BR")}</td>
              <td className="p-6 text-right"><button onClick={() => handleDeleteOrder(order)} className="p-2 text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[40px] p-10 shadow-2xl border">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase">Novo Pedido</h2><X onClick={()=>setIsManualModalOpen(false)} className="cursor-pointer"/></div>
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="relative border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center bg-slate-50">
                <input type="file" onChange={handleManualFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-[10px] font-black text-slate-400 uppercase">{selectedFile ? selectedFile.name : "Clique ou arraste o arquivo"}</p>
              </div>
              {analysisResult && <div className="p-4 bg-emerald-50 rounded-2xl"><p className="text-[10px] font-black text-emerald-600">CLIENTE LIDO:</p><p className="font-bold text-sm uppercase">{analysisResult.client}</p></div>}
              <div className="grid grid-cols-2 gap-4">
                <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} className="p-4 bg-slate-50 border rounded-2xl font-black text-[10px] uppercase"><option value="">REPRESENTADA</option>{(settings.categories||[]).map(c=>(<option key={c} value={c}>{c}</option>))}</select>
                <input type="text" value={orderValue} onChange={e=>setOrderValue(e.target.value)} placeholder="VALOR" className="p-4 bg-slate-50 border rounded-2xl font-black text-lg text-center" />
              </div>
              <button disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-lg">{isSaving ? "SALVANDO..." : "REGISTRAR PEDIDO"}</button>
            </form>
          </div>
        </div>
      )}

      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-6xl max-h-[90vh] rounded-[48px] p-12 overflow-hidden flex flex-col shadow-2xl border">
            <div className="flex justify-between mb-8"><h2 className="text-2xl font-black uppercase">Lote IA</h2><X onClick={()=>setIsBatchModalOpen(false)} className="cursor-pointer"/></div>
            <div className="flex-1 overflow-y-auto mb-8 pr-4">
              {batchResults.length === 0 ? (<div className="h-64 border-4 border-dashed rounded-[40px] flex items-center justify-center relative bg-slate-50"><input type="file" multiple onChange={handleBatchUpload} className="absolute inset-0 opacity-0 cursor-pointer"/><p className="font-black text-slate-400 uppercase tracking-widest text-center">SOLTE OS ARQUIVOS AQUI</p></div>) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {batchResults.map((r,i)=>(<div key={i} className="p-4 bg-white border border-slate-100 rounded-3xl flex justify-between items-center"><div><p className="font-black truncate uppercase text-xs">{r.client}</p><span className="text-[10px] font-black text-indigo-600 uppercase">{r.category}</span></div><div className="text-right font-black text-sm">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(r.value)}<button onClick={()=>confirmBatchOrder(r)} className="block mt-1 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase">CONFIRMAR</button></div></div>))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} feature={upgradeFeature} />
    </div>
  );
}
