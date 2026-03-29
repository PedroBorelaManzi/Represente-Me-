import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Download, 
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Loader2,
  FileSpreadsheet,
  ArrowRight,
  ExternalLink,
  Table as TableIcon,
  LayoutGrid,
  ShoppingBag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/generative-ai';

export default function PedidosPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [settings, setSettings] = useState<any>({});

  // Manual Upload Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzingManual, setIsAnalyzingManual] = useState(false);

  // Batch Upload Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", user.id)
      .single();
    if (profile?.settings) setSettings(profile.settings);
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Load Orders
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(`
        *,
        client:clients(name, cnpj)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Load Clients
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, cnpj, faturamento, category_last_contact")
      .eq("user_id", user.id)
      .order("name");

    if (!ordersError) setOrders(ordersData || []);
    if (!clientsError) setClients(clientsData || []);
    setLoading(false);
  };

  const handleManualFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    
    setIsAnalyzingManual(true);
    try {
        const api_key = import.meta.env.VITE_GEMINI_API_KEY;
        const ai = new GoogleGenAI(api_key);
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(file);
        });

        const result = await model.generateContent([
            { inlineData: { mimeType: file.type, data: base64 as string } },
            "Extraia o valor total final deste pedido. Retorne APENAS o número com ponto decimal. Exemplo: 1250.50"
        ]);

        const text = result.response.text().trim();
        if (text) {
            const val = text.replace(/[^0-9.]/g, "");
            if (!isNaN(parseFloat(val))) {
                setOrderValue(val);
            }
        }
    } catch (err) {
        console.error("Erro na análise:", err);
    } finally {
        setIsAnalyzingManual(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClient || !selectedCategory || !orderValue || !selectedFile) {
        if (!selectedFile) alert("Por favor, anexe o arquivo do pedido.");
        return;
    }
    setIsSaving(true);

    try {
      let file_path = "";
      const cleanName = selectedFile.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
      const cleanValue = `VALOR_${parseFloat(orderValue).toFixed(2)}`;
      const formattedName = `${selectedCategory}___${cleanValue}___${cleanName}`;
      const path = `${user.id}/${selectedClient}/${formattedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("client_vault")
        .upload(path, selectedFile, { upsert: true });
      
      if (uploadError) throw uploadError;
      file_path = path;

      const val = parseFloat(orderValue);
      const { error: orderError } = await supabase
        .from("orders")
        .insert([{
          user_id: user.id,
          client_id: selectedClient,
          category: selectedCategory,
          value: val,
          file_path: file_path
        }]);

      if (orderError) throw orderError;

      const client = clients.find(c => c.id === selectedClient);
      const currentFat = client?.faturamento || {};
      const updatedFat = { ...currentFat, [selectedCategory]: (Number(currentFat[selectedCategory] || 0) + val) };
      const currentLC = client?.category_last_contact || {};
      const updatedLC = { ...currentLC, [selectedCategory]: new Date().toISOString() };

      await supabase.from("clients").update({ 
        faturamento: updatedFat, 
        category_last_contact: updatedLC,
        last_contact: new Date().toISOString()
      }).eq("id", selectedClient);

      setIsManualModalOpen(false);
      resetManualForm();
      loadData();
    } catch (err: any) {
      alert("Erro ao salvar pedido: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetManualForm = () => {
    setSelectedClient("");
    setSelectedCategory("");
    setOrderValue("");
    setSelectedFile(null);
  };

  const handleBatchUpload = async (files: FileList | null) => {
    if (!files) return;
    setBatchFiles(Array.from(files));
    setIsBatchModalOpen(true);
  };

  const processBatch = async () => {
    setIsProcessingBatch(true);
    setBatchResults([]);
    const api_key = import.meta.env.VITE_GEMINI_API_KEY;
    const ai = new GoogleGenAI(api_key);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    for (const file of batchFiles) {
        try {
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(",")[1]);
                reader.readAsDataURL(file);
            });

            const result = await model.generateContent([
                { inlineData: { mimeType: file.type, data: base64 as string } },
                `Analise este documento e extraia:
                1. Valor total final em formato numérico.
                2. CNPJ do cliente/comprador (apenas números).
                3. Nome do Cliente.
                4. Nome da Empresa Vendedora/Representada (escolha entre: ${settings.categories?.join(", ")}).
                Retorne APENAS um objeto JSON como este: {"valor": 1200.50, "cnpj": "12345678901234", "cliente": "NOME LTDA", "empresa": "NOME DA MARCA"}`
            ]);

            const text = result.response.text();
            const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const data = JSON.parse(cleanedJson);

            const clientMatch = clients.find(c => c.cnpj?.replace(/\D/g, "") === data.cnpj?.replace(/\D/g, ""));
            
            setBatchResults(prev => [...prev, {
                file,
                data,
                clientMatch,
                status: clientMatch ? "success" : (data.cnpj && data.cliente ? "warning" : "error"),
                message: clientMatch ? "Cliente reconhecido" : (data.cnpj && data.cliente ? "Novo Cliente (pelo CNPJ)" : "Erro na leitura")
            }]);
        } catch (err) {
            console.error("Erro no arquivo:", file.name, err);
            setBatchResults(prev => [...prev, { file, status: "error", message: "Falha ao processar" }]);
        }
    }
    setIsProcessingBatch(false);
  };

  const saveBatch = async () => {
    if (!user) return;
    setIsSaving(true);
    
    for (const res of batchResults) {
        let currentClient = res.clientMatch;
        const val = res.data.valor || 0;
        const category = res.data.empresa || settings.categories?.[0] || "Geral";

        if (!currentClient && res.data.cnpj && res.data.cliente) {
            const { data: existing } = await supabase
                .from("clients")
                .select("id, name, cnpj, faturamento, category_last_contact")
                .eq("user_id", user.id)
                .eq("cnpj", res.data.cnpj)
                .maybeSingle();
            
            if (existing) {
                currentClient = existing;
            } else {
                const { data: newClient, error: createError } = await supabase
                    .from("clients")
                    .insert([{
                        user_id: user.id,
                        name: res.data.cliente,
                        cnpj: res.data.cnpj,
                        address: "",
                        city: "",
                        state: "",
                        last_contact: new Date().toISOString()
                    }])
                    .select()
                    .single();
                
                if (!createError) {
                    currentClient = newClient;
                }
            }
        }

        if (currentClient) {
            const cleanName = res.file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
            const path = `${user.id}/${currentClient.id}/${category}___VALOR_${val.toFixed(2)}___${cleanName}`;
            
            const { error: uploadError } = await supabase.storage
                .from("client_vault")
                .upload(path, res.file, { upsert: true });

            if (!uploadError) {
                await supabase.from("orders").insert([{
                    user_id: user.id,
                    client_id: currentClient.id,
                    category: category,
                    value: val,
                    file_path: path
                }]);

                const currentFat = currentClient.faturamento || {};
                const updatedFat = { ...currentFat, [category]: (Number(currentFat[category] || 0) + val) };
                const currentLC = currentClient.category_last_contact || {};
                const updatedLC = { ...currentLC, [category]: new Date().toISOString() };

                await supabase.from("clients").update({
                    faturamento: updatedFat,
                    category_last_contact: updatedLC,
                    last_contact: new Date().toISOString()
                }).eq("id", currentClient.id);
            }
        }
    }

    setIsBatchModalOpen(false);
    setBatchResults([]);
    loadData();
    setIsSaving(false);
  };

  const filteredOrders = orders.filter(o => 
    (o.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     o.category?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterCategory === "" || o.category === filterCategory)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter italic flex items-center gap-3">
            PEDIDOS
            <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black tracking-widest not-italic">
              {orders.length} TOTAL
            </div>
          </h1>
          <p className="text-slate-500 font-medium">Gerencie as vendas e acompanhe o faturamento por empresa.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative cursor-pointer group">
            <input 
              type="file" 
              multiple 
              onChange={(e) => handleBatchUpload(e.target.files)} 
              className="hidden" 
              accept=".pdf,.jpg,.png"
            />
            <div className="px-6 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-100 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:border-indigo-500 transition-all shadow-sm">
              <Upload className="w-4 h-4" /> Enviar Vários Pedidos
            </div>
          </label>
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            <Plus className="w-4 h-4" /> Novo Pedido
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-wider">+12% vs Mês Ant.</span>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Faturado</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter">
            R$ {orders.reduce((acc, o) => acc + (o.value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-2xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pedidos Emitidos</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter">{orders.length}</h3>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Valor Médio / Pedido</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter">
            R$ {orders.length > 0 ? (orders.reduce((acc, o) => acc + (o.value || 0), 0) / orders.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "0,00"}
          </h3>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
            <Filter className="w-4 h-4 text-slate-400" />
          </div>
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 md:w-48 px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Todas Empresas</option>
            {settings.categories?.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 px-6">
                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Representada</th>
                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase">Carregando pedidos...</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-medium">Nenhum pedido encontrado.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="group hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors border-b border-slate-50 dark:border-zinc-800/50">
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-xl group-hover:scale-110 transition-transform">
                          <Calendar className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-600 dark:text-zinc-400">{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 dark:text-zinc-100">{order.client?.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{order.client?.cnpj}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-[11px] font-black tracking-widest uppercase">
                        {order.category}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <span className="text-sm font-black text-slate-900 dark:text-zinc-100">
                        R$ {order.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      {order.file_path ? (
                        <button 
                          onClick={async () => {
                            const { data } = await supabase.storage.from('client_vault').getPublicUrl(order.file_path);
                            window.open(data.publicUrl, '_blank');
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          <FileText className="w-3 h-3" /> Ver PDF
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Não anexado</span>
                      )}
                    </td>
                    <td className="py-5 px-6">
                      <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Upload Modal */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-8 w-full max-w-lg"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 dark:text-zinc-100 italic tracking-tighter">Novo Pedido</h2>
                <button onClick={() => setIsManualModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"><X className="w-5 h-5"/></button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                  <select 
                    value={selectedClient} 
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Selecione o Cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa Representada</label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Selecione a Empresa</option>
                    {Object.keys(settings.faturamento_metas || {}).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    {settings.categories?.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Arquivo do Pedido</label>
                  <input 
                    type="file" 
                    onChange={handleManualFileChange}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700"
                    accept=".pdf,.jpg,.png"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                    Valor do Pedido (R$)
                    {isAnalyzingManual && <span className="text-indigo-600 animate-pulse flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Analisando...</span>}
                  </label>
                  <input 
                    type="number" step="0.01" 
                    value={orderValue} 
                    onChange={(e) => setOrderValue(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsManualModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 font-bold text-sm">Cancelar</button>
                  <button type="submit" disabled={isSaving || isAnalyzingManual} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar Pedido"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Upload Modal */}
      <AnimatePresence>
        {isBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
               className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 w-full max-w-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 italic tracking-tighter">Enviar Vários Pedidos</h2>
                    <p className="text-xs text-slate-500">O sistema vai extrair dados de {batchFiles.length} arquivos.</p>
                </div>
                {!isProcessingBatch && (
                    <button onClick={() => { setIsBatchModalOpen(false); setBatchResults([]); }} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"><X className="w-5 h-5"/></button>
                )}
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {batchResults.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-3xl">
                        <FileText className="w-12 h-12 text-slate-300" />
                        <p className="text-sm text-slate-500 font-medium tracking-tight">Pronto para iniciar a leitura Inteligente dos arquivos.</p>
                        <button onClick={processBatch} disabled={isProcessingBatch} className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100">Iniciar Leitura de Pedidos</button>
                    </div>
                ) : (
                    batchResults.map((res, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`p-2.5 rounded-xl flex-shrink-0 ${res.status === "success" ? "bg-emerald-50 text-emerald-600" : res.status === "warning" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-black text-slate-900 dark:text-zinc-100 truncate">{res.file.name}</span>
                                    {res.data && <span className="text-[10px] text-indigo-600 font-black tracking-wide uppercase truncate">{res.data.empresa} • {res.data.cliente} • R$ {res.data.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${res.status === "success" ? "bg-emerald-100 text-emerald-700" : res.status === "warning" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                                    {res.message}
                                </span>
                            </div>
                        </div>
                    ))
                )}
              </div>

              {isProcessingBatch && (
                <div className="mt-8 flex flex-col items-center gap-3">
                    <div className="w-full max-w-xs h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2, repeat: Infinity }} className="h-full bg-indigo-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">O sistema está lendo os arquivos e extraindo dados...</p>
                </div>
              )}

              {batchResults.length > 0 && !isProcessingBatch && (
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold bg-slate-50 dark:bg-zinc-950 px-3 py-2 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <AlertCircle className="w-3 h-3" />
                        * Pedidos com CNPJ reconhecido serão cadastrados como novos clientes automaticamente.
                    </div>
                    <button onClick={saveBatch} disabled={isSaving || !batchResults.some(r => r.status !== "error")} className="w-full md:w-auto px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:-translate-y-0.5">
                        {isSaving ? "Salvando..." : "Confirmar e Salvar"}
                    </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
