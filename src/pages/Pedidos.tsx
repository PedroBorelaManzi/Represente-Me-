import React, { useState, useEffect, useRef } from 'react';
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
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  const [itemsLimit, setItemsLimit] = useState(15);
  const scrollSentinelRef = React.useRef<HTMLDivElement>(null);
  
  const filteredOrders = (orders || []).filter(order => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      order.client?.name?.toLowerCase().includes(term) ||
      order.category?.toLowerCase().includes(term) ||
      order.status?.toLowerCase().includes(term);
    
    const matchesCategory = !filterCategory || order.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

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

  useEffect(() => {
    if (!scrollSentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && filteredOrders.length > itemsLimit) {
        setItemsLimit(prev => prev + 15);
      }
    }, { threshold: 0.1 });
    observer.observe(scrollSentinelRef.current);
    return () => observer.disconnect();
  }, [filteredOrders.length, itemsLimit]);

  const loadSettings = async () => {
    if (!user) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();
      if (data) setSettings(data || {});
    }
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Load Orders with client names
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
        const genAI = new GoogleGenerativeAI(api_key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
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
          file_path: file_path,
          status: 'concluido'
        }]);

      if (orderError) throw orderError;

      // Update Client Analytics
      const client = clients.find(c => c.id === selectedClient);
      if (client) {
        const currentFat = client.faturamento || {};
        const updatedFat = { ...currentFat, [selectedCategory]: (Number(currentFat[selectedCategory] || 0) + val) };
        
        const currentLastContact = client.category_last_contact || {};
        const updatedLastContact = { ...currentLastContact, [selectedCategory]: new Date().toISOString() };

        await supabase
          .from("clients")
          .update({ 
            faturamento: updatedFat, 
            category_last_contact: updatedLastContact,
            last_contact: new Date().toISOString()
          })
          .eq("id", selectedClient);
      }

      alert("Pedido registrado com sucesso!");
      setIsManualModalOpen(false);
      loadData();
      
      // Reset form
      setSelectedClient("");
      setSelectedCategory("");
      setOrderValue("");
      setSelectedFile(null);

    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBatchUpload = async () => {
    if (!user || batchFiles.length === 0) return;
    setIsProcessingBatch(true);
    setBatchResults([]);

    const api_key = import.meta.env.VITE_GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(api_key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    for (const file of batchFiles) {
      try {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        });

        const result = await model.generateContent([
          { inlineData: { mimeType: file.type, data: base64 as string } },
          `Analise este pedido e extraia:
          1. Nome da Empresa/Cliente (tente encontrar o mais próximo na lista fornecida)
          2. Categoria/Representada
          3. Valor Total
          
          Lista de Clientes conhecidos: ${clients.map(c => c.name).join(", ")}
          Lista de Categorias conhecidas: ${(settings.categories || []).join(", ")}
          
          Retorne em JSON: {"client": "NOME", "category": "CATEGORIA", "value": 0.00}`
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{.*\}/s);
        const data = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (data) {
          setBatchResults(prev => [...prev, { file: file, ...data, status: 'processed' }]);
        }
      } catch (err) {
        console.error("Erro no lote:", err);
      }
    }
    setIsProcessingBatch(false);
  };

  const confirmBatchOrder = async (result: any) => {
    const matchedClient = clients.find(c => c.name.toLowerCase().includes(result.client.toLowerCase()));
    if (!matchedClient) {
      alert(`Não foi possível encontrar o cliente: ${result.client}`);
      return;
    }

    try {
      const cleanName = result.file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
      const cleanValue = `VALOR_${parseFloat(result.value).toFixed(2)}`;
      const formattedName = `${result.category}___${cleanValue}___${cleanName}`;
      const path = `${user.id}/${matchedClient.id}/${formattedName}`;

      const { error: uploadError } = await supabase.storage
        .from("client_vault")
        .upload(path, result.file, { upsert: true });

      if (uploadError) throw uploadError;

      await supabase.from("orders").insert([{
        user_id: user.id,
        client_id: matchedClient.id,
        category: result.category,
        value: result.value,
        file_path: path,
        status: 'concluido'
      }]);

      setBatchResults(prev => prev.filter(r => r.file !== result.file));
      loadData();
    } catch (err: any) {
      alert("Erro ao confirmar: " + err.message);
    }
  };

  const totalRevenue = orders.reduce((acc, order) => acc + (order.value || 0), 0);
  const totalOrders = orders.length;

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-indigo-600" />
            Gestão de Pedidos
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Acompanhe e registre suas representações.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Lote IA
          </button>
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            <Plus className="w-4 h-4" /> Novo Pedido
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-600 shadow-sm shadow-emerald-200/50" />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Faturamento Total</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-zinc-100 tabular-nums">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
          </p>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-indigo-600 shadow-sm shadow-indigo-200/50" />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total de Pedidos</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-zinc-100 tabular-nums">{totalOrders}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <TrendingUp className="w-5 h-5 text-amber-600 shadow-sm shadow-amber-200/50" />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Ticket Médio</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-zinc-100 tabular-nums">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOrders > 0 ? totalRevenue / totalOrders : 0)}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou representada..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-5 py-3 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all">
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {/* Orders View - Responsive Table & Cards */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="flex items-center justify-center p-12 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 shadow-sm text-slate-400 font-medium italic">
            Nenhum pedido encontrado.
          </div>
        ) : (
          filteredOrders.slice(0, itemsLimit).map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
              className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-black text-slate-900 dark:text-zinc-100 truncate">{order.client?.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{order.client?.cnpj}</p>
                </div>
                <button className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-950 rounded-xl transition-all">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mb-4 mt-2">
                <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100/50 dark:border-indigo-900/30">
                  {order.category}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100/50 dark:border-emerald-800/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-850">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor</span>
                  <span className="text-base font-black text-slate-900 dark:text-zinc-100 tabular-nums">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data</span>
                   <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-950/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-zinc-800">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-zinc-800">Representada</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-zinc-800">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-zinc-800">Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-zinc-800">Status</th>
                <th className="sticky right-0 z-20 bg-slate-50 dark:bg-zinc-950/50 px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-l border-slate-200 dark:border-zinc-800 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.05)]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Carregando pedidos...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">Nenhum pedido encontrado.</td>
                </tr>
              ) : (
                filteredOrders.slice(0, itemsLimit).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-zinc-100">{order.client?.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{order.client?.cnpj}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg text-xs font-black uppercase tracking-wider">
                        {order.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-black text-slate-900 dark:text-zinc-100 tabular-nums">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold leading-none">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100/50 dark:border-emerald-800/30">
                        <CheckCircle2 className="w-3 h-3" /> Concluído
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-zinc-900 group-hover:bg-slate-50 dark:group-hover:bg-zinc-950 px-6 py-4 text-right border-l border-slate-200 dark:border-zinc-800 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.05)] transition-colors">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all">
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

      <div ref={scrollSentinelRef} className="h-4 w-full" />

      {/* Manual Modal */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800"
            >
              <form onSubmit={handleManualSubmit} className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                      <Plus className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Registrar Pedido</h2>
                  </div>
                  <button type="button" onClick={() => setIsManualModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Client Select */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Cliente</label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-700 dark:text-zinc-100"
                      required
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category Select */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Representada</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-700 dark:text-zinc-100"
                      required
                    >
                      <option value="">Selecione uma representada...</option>
                      {(settings.categories || []).map((cat: string) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* File Upload & Analysis */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Anexar Pedido (PDF/Foto)</label>
                    <div className="relative">
                        <input 
                            type="file" 
                            onChange={handleManualFileChange}
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-500 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                        />
                        {isAnalyzingManual && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Lendo PDF IA...</span>
                            </div>
                        )}
                    </div>
                  </div>

                  {/* Order Value */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Valor do Pedido</label>
                    <div className="relative group">
                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            value={orderValue}
                            onChange={(e) => setOrderValue(e.target.value.replace(/[^0-9.]/g, ""))}
                            placeholder="0.00"
                            className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 rounded-2xl text-lg font-black text-slate-900 dark:text-zinc-100 tabular-nums active:scale-[0.99] transition-transform"
                            required
                        />
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-[2] px-6 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 shadow-xl shadow-slate-200 dark:shadow-none transition-all active:scale-[0.98]"
                  >
                    {isSaving ? "Salvando..." : "Confirmar Pedido"}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[85vh] rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Sincronização em Lote</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Suba múltiplos pedidos para inteligência artificial processar</p>
                  </div>
                </div>
                <button onClick={() => setIsBatchModalOpen(false)} className="p-3 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {batchResults.length === 0 ? (
                  <div className="h-64 border-4 border-dashed border-slate-100 dark:border-zinc-800 rounded-[32px] flex flex-col items-center justify-center text-center p-8 group hover:border-indigo-400/30 transition-all cursor-pointer bg-slate-50/30">
                    <input 
                      type="file" 
                      multiple 
                      onChange={(e) => setBatchFiles(Array.from(e.target.files || []))}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-12 h-12 text-slate-300 mb-4 group-hover:scale-110 group-hover:text-indigo-500 transition-all" />
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Arraste aqui ou clique para selecionar</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Selecione todos os pedidos que deseja importar de uma vez.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {batchResults.map((result, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between group hover:border-indigo-400/50 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center border border-slate-100 dark:border-zinc-800">
                            <FileText className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg uppercase tracking-wider">{result.category}</span>
                                <span className="text-[10px] font-black text-slate-400">•</span>
                                <span className="text-xs font-black text-slate-900 dark:text-zinc-100 truncate max-w-[200px]">{result.client}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-400">{result.file.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <span className="text-lg font-black text-slate-900 dark:text-zinc-100 tabular-nums">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.value)}
                            </span>
                            <button 
                                onClick={() => confirmBatchOrder(result)}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                            >
                                Confirmar
                            </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 dark:bg-zinc-950/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-500">
                  {batchFiles.length > 0 ? `${batchFiles.length} arquivos selecionados` : "Nenhum arquivo de lote selecionado"}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setBatchFiles([]); setBatchResults([]); }}
                    className="px-6 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    Limpar
                  </button>
                  <button 
                    onClick={handleBatchUpload}
                    disabled={batchFiles.length === 0 || isProcessingBatch}
                    className="px-8 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 shadow-xl"
                  >
                    {isProcessingBatch ? "Processando IA..." : "Processar Lote"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
