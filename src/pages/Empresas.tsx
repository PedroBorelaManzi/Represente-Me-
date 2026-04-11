import React, { useState, useEffect } from "react";
import { Building2, Plus, Trash2, FileText, ChevronRight, DollarSign, TrendingUp, Settings, X, Check, Loader2, Upload, Search, MapPin, AlertCircle, FileCheck, CheckCircle2, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { Link } from "react-router-dom";
import { processOrderFile } from "../lib/orderProcessor";
import { getHighPrecisionCoordinates } from "../lib/geminiGeocoding";
import { toast } from "sonner";
import UpgradeModal from "../components/UpgradeModal";

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

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string>("");
  const [editNameInput, setEditNameInput] = useState<string>("");
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<'empresas' | 'lote'>('empresas');

  const plan = settings.subscription_plan || 'Acesso Exclusivo';

  const loadOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.from("orders").select("*, clients(id, name)").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      setAllOrders((data || []).map(o => ({ ...o, clientName: o.clients?.name || "Cliente Desconhecido", clientId: o.clients?.id })));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if (!settingsLoading && user) loadOrders(); }, [user, settingsLoading]);

  const handleUploadClick = () => {
    if (plan === 'Acesso Exclusivo') {
       setUpgradeFeature('lote');
       setIsUpgradeModalOpen(true);
       return;
    }
    setIsUploadModalOpen(true);
    setUploadFiles([]);
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    
    // Plan Limits
    const currentCount = settings.categories?.length || 0;
    if (plan === 'Acesso Exclusivo' && currentCount >= 1) {
       setUpgradeFeature('empresas');
       setIsUpgradeModalOpen(true);
       return;
    }
    if (plan === 'Profissional' && currentCount >= 3) {
       setUpgradeFeature('empresas');
       setIsUpgradeModalOpen(true);
       return;
    }
    if (plan === 'Master' && currentCount >= 10) {
       toast.error("Limite máximo de 10 empresas atingido.");
       return;
    }

    if (!settings.categories?.some(c => c.toLowerCase() === newCat.trim().toLowerCase())) {
      const updated = [...(settings?.categories || []), newCat.trim()];
      await updateSettings({ categories: updated });
      setNewCat("");
    } else {
        toast.error("Esta empresa já existe!");
    }
  };

  const processFiles = async (files: FileList) => {
    setIsProcessing(true);
    const newFiles: ProcessedFile[] = Array.from(files).map(f => ({ file: f, clientName: "", cnpj: "", category: settings.categories?.[0] || "", value: 0, status: 'processing', isNewClient: false }));
    setUploadFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < newFiles.length; i++) {
        try {
            const result = await processOrderFile(newFiles[i].file, [], settings.categories || []);
            if (result.status === 'ready') {
                const cleanCnpj = result.cnpj.replace(/\D/g, "");
                const { data: matchedClient } = await supabase.from("clients").select("id, name").eq("cnpj", cleanCnpj).eq("user_id", user?.id).maybeSingle();
                setUploadFiles(prev => {
                    const u = [...prev]; const idx = u.length - newFiles.length + i;
                    u[idx] = { ...u[idx], clientName: result.client, cnpj: result.cnpj, category: result.category, value: result.value, address: result.address, status: "ready", isNewClient: !matchedClient, matchedClientId: matchedClient?.id };
                    return u;
                });
            }
        } catch (err) {}
    }
    setIsProcessing(false);
  };

  const confirmSingleUpload = async (index: number) => {
      const item = uploadFiles[index];
      setUploadFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'saving' } : f));
      try {
          let clientId = item.matchedClientId;
          if (!clientId) {
              const coords = await getHighPrecisionCoordinates(`${item.address}`, item.clientName, item.cnpj);
              const { data: n } = await supabase.from("clients").insert([{ user_id: user?.id, name: item.clientName, cnpj: item.cnpj?.replace(/\D/g, ""), address: item.address, latitude: coords?.lat || -23.5505, longitude: coords?.lng || -46.6333, status: 'Ativo' }]).select().single();
              clientId = n?.id;
          }
          const cleanName = item.file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
          const formattedName = `${item.category}___VALOR_${item.value}___${cleanName}`;
          const path = `${user?.id}/${formattedName}`;
          await supabase.storage.from("client_vault").upload(path, item.file, { upsert: true });
          await supabase.from("orders").upsert([{ user_id: user?.id, client_id: clientId, category: item.category, value: item.value, file_name: formattedName, file_path: path }], { onConflict: "client_id,file_path" });
          setUploadFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'done' } : f));
          loadOrders();
      } catch (err) { setUploadFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'error' } : f)); }
  };

  const catTotals = (settings?.categories || []).reduce((acc: any, cat: string) => {
      acc[cat] = allOrders.filter(o => o.category.toLowerCase() === cat.toLowerCase()).reduce((s, o) => s + o.value, 0);
      return acc;
  }, {});

  const totalGeral = Object.values(catTotals).reduce((sum: number, val: any) => sum + Number(val), 0) as number;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-7 h-7 text-indigo-600" /> Empresas</h1>
          <p className="text-xs text-slate-500">Gestão de representadas e faturamento inteligente.</p>
        </div>
        <button onClick={handleUploadClick} className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"><Upload className="w-5 h-5" /> Enviar Arquivos</button>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border shadow-sm flex items-center gap-6">
         <div className="p-5 bg-indigo-50 rounded-2xl"><TrendingUp className="w-8 h-8 text-indigo-600" /></div>
         <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Faturamento geral</p><h2 className="text-4xl font-black text-slate-900 dark:text-zinc-100">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(totalGeral)}</h2></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
           <div className="bg-white dark:bg-zinc-900 rounded-3xl border p-6 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresas</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                 <div onClick={() => setSelectedCategory("all")} className={`p-4 rounded-2xl border cursor-pointer font-bold text-sm ${selectedCategory === "all" ? "bg-indigo-50 border-indigo-600" : "bg-slate-50 border-transparent"}`}>Categorias (Todas)</div>
                 {(settings.categories || []).map(cat => (
                    <div key={cat} onClick={() => setSelectedCategory(cat)} className={`p-4 rounded-2xl border cursor-pointer flex justify-between items-center ${selectedCategory === cat ? "bg-indigo-50 border-indigo-600" : "bg-slate-50 border-transparent"}`}>
                       <span className="font-bold text-sm truncate max-w-[120px]">{cat}</span>
                       <span className="font-black text-xs text-indigo-600 truncate">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(catTotals[cat]||0)}</span>
                    </div>
                 ))}
              </div>
              <div className="pt-4 border-t flex gap-2">
                 <input type="text" value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="NOVA REPRESENTADA" className="flex-1 px-4 py-2 border rounded-xl text-[10px] font-black" />
                 <button onClick={addCategory} className="p-2 bg-indigo-600 text-white rounded-xl"><Plus className="w-5 h-5"/></button>
              </div>
           </div>
        </div>
        <div className="md:col-span-2">
           <div className="bg-white dark:bg-zinc-900 rounded-3xl border p-6 shadow-sm h-full flex flex-col min-h-[400px]">
              <h3 className="text-sm font-black mb-6 uppercase tracking-widest">{selectedCategory === "all" ? "Histórico Geral" : selectedCategory}</h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                 {allOrders.filter(o => selectedCategory === "all" || o.category === selectedCategory).slice(0, 20).map(o => (
                    <div key={o.id} className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl flex justify-between items-center group">
                       <div className="truncate"><p className="font-bold text-xs truncate max-w-[400px]">{o.file_name}</p><Link to={`/dashboard/clientes/${o.client_id}`} className="text-[10px] font-black text-indigo-600 uppercase">{o.clientName}</Link></div>
                       <div className="text-right font-black text-xs">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(o.value)}</div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
           <div className="bg-white dark:bg-zinc-900 rounded-[48px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border p-12 shadow-2xl">
              <div className="flex justify-between items-center mb-10"><h3 className="text-3xl font-black uppercase">ENVIO IA</h3><X onClick={()=>setIsUploadModalOpen(false)} className="cursor-pointer"/></div>
              <div className="flex-1 overflow-y-auto pr-4">
                 {uploadFiles.length === 0 ? (
                    <div className="h-64 border-4 border-dashed rounded-[40px] flex items-center justify-center relative bg-slate-50"><input type="file" multiple onChange={e=>e.target.files && processFiles(e.target.files)} className="absolute inset-0 opacity-0 cursor-pointer"/><p className="font-black text-slate-400 uppercase tracking-widest text-center">SOLTE OS ARQUIVOS AQUI OU CLIQUE</p></div>
                 ) : (
                    <div className="space-y-4">
                       {uploadFiles.map((item, idx) => (
                          <div key={idx} className="p-6 rounded-3xl border bg-white flex items-center justify-between gap-4">
                             <div className="flex-1 truncate"><p className="text-[10px] font-black text-slate-400 uppercase">{item.file.name}</p>
                             {item.status === 'ready' && <div className="flex items-center gap-4 mt-1"><span className="text-xs font-black uppercase text-indigo-600">{item.clientName}</span><span className="text-xs font-black text-emerald-600">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(item.value)}</span></div>}
                             {item.status === 'processing' && <span className="text-[10px] font-black text-indigo-600 animate-pulse uppercase italic">Analistando via inteligência artificial...</span>}</div>
                             {item.status === 'ready' && <button onClick={()=>confirmSingleUpload(idx)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">CONFIRMAR</button>}
                             {item.status === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-500"/>}
                          </div>
                       ))}
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
