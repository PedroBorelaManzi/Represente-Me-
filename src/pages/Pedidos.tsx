import { useState, useEffect } from "react";
import { ShoppingCart, Plus, Upload, Filter, Search, Download, FileText, Loader2, AlertCircle, X, ChevronRight, User, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { GoogleGenAI } from "@google/genai";

export default function PedidosPage() {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Manual Upload Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Batch Upload Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClient || !selectedCategory || !orderValue) return;
    setIsSaving(true);

    try {
      let file_path = "";
      if (selectedFile) {
        const cleanName = selectedFile.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\w\s.-]/g, "")
          .replace(/\s+/g, "_");
        
        const cleanValue = `VALOR_${parseFloat(orderValue).toFixed(2)}`;
        const formattedName = `${selectedCategory}___${cleanValue}___${cleanName}`;
        const path = `${user.id}/${selectedClient}/${formattedName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("client_vault")
          .upload(path, selectedFile, { upsert: true });
        
        if (uploadError) throw uploadError;
        file_path = path;
      }

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

      // Update client faturamento
      const client = clients.find(c => c.id === selectedClient);
      const currentFat = client?.faturamento || {};
      const updatedFat = { ...currentFat, [selectedCategory]: (Number(currentFat[selectedCategory] || 0) + val) };
      
      const currentLastContact = client?.category_last_contact || {};
      const updatedLastContact = { ...currentLastContact, [selectedCategory]: new Date().toISOString() };

      await supabase
        .from("clients")
        .update({ 
          faturamento: updatedFat, 
          category_last_contact: updatedLastContact,
          last_contact: new Date().toISOString()
        })
        .eq("id", selectedClient);

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
    if (!user || batchFiles.length === 0) return;
    setIsProcessingBatch(true);
    const api_key = import.meta.env.VITE_GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey: api_key });
    

    const results = [];

    for (const file of batchFiles) {
        try {
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(",")[1]);
                reader.readAsDataURL(file);
            });

            const prompt = `Analise este arquivo de pedido/fatura e extraia:
            1. CNPJ do Cliente (apenas números).
            2. Nome/Razão Social do Cliente.
            3. Valor Total Final do Pedido (número formatado com ponto decimal).
            4. Nome da Empresa/Marca vendedora (Representada).
            
            Retorne APENAS um JSON no formato: {"cnpj": "string", "cliente": "string", "valor": number, "empresa": "string"}.
            Se não encontrar algum dado, retorne null no campo.`;

            const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: [
                    { inlineData: { mimeType: file.type, data: base64 as string } },
                    prompt
                ]
            });

            const text = response.text ? response.text.trim() : "";
            const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const data = JSON.parse(cleanedText);

            // Try to match client
            let clientMatch = null;
            if (data.cnpj) {
                clientMatch = clients.find(c => c.cnpj?.replace(/\D/g, "") === data.cnpj.replace(/\D/g, ""));
            }
            if (!clientMatch && data.cliente) {
                clientMatch = clients.find(c => c.name.toLowerCase().includes(data.cliente.toLowerCase()));
            }

            results.push({
                file,
                data,
                clientMatch,
                status: clientMatch ? "success" : "warning",
                message: clientMatch ? "Cliente reconhecido" : "Cliente não encontrado"
            });
        } catch (err) {
            results.push({ file, status: "error", message: "Erro ao processar" });
        }
    }

    setBatchResults(results);
    setIsProcessingBatch(false);
  };

  const saveBatch = async () => {
    if (!user) return;
    setIsSaving(true);
    
    for (const res of batchResults) {
        if (res.status === "success" && res.clientMatch) {
            const val = res.data.valor || 0;
            const category = res.data.empresa || settings.categories?.[0] || "Geral";
            
            const cleanName = res.file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
            const path = `${user.id}/${res.clientMatch.id}/${category}___VALOR_${val.toFixed(2)}___${cleanName}`;
            
            const { error: uploadError } = await supabase.storage
                .from("client_vault")
                .upload(path, res.file, { upsert: true });

            if (!uploadError) {
                await supabase.from("orders").insert([{
                    user_id: user.id,
                    client_id: res.clientMatch.id,
                    category: category,
                    value: val,
                    file_path: path
                }]);

                const currentFat = res.clientMatch.faturamento || {};
                const updatedFat = { ...currentFat, [category]: (Number(currentFat[category] || 0) + val) };
                const currentLC = res.clientMatch.category_last_contact || {};
                const updatedLC = { ...currentLC, [category]: new Date().toISOString() };

                await supabase.from("clients").update({
                    faturamento: updatedFat,
                    category_last_contact: updatedLC,
                    last_contact: new Date().toISOString()
                }).eq("id", res.clientMatch.id);
            }
        }
    }

    setIsSaving(false);
    setIsBatchModalOpen(false);
    setBatchResults([]);
    setBatchFiles([]);
    loadData();
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || o.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
            <ShoppingCart className="w-6 h-6 text-indigo-600" />
            Histórico de Pedidos
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">Gerencie e processe seus pedidos de venda.</p>
        </div>
        
        <div className="flex items-center gap-2">
            <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 dark:bg-zinc-800 dark:text-indigo-400 rounded-2xl text-xs font-black transition-all hover:bg-indigo-100 border border-indigo-100">
                <Upload className="w-4 h-4" /> Enviar por Lote (IA)
                <input type="file" multiple className="hidden" accept=".pdf" onChange={(e) => handleBatchUpload(e.target.files)} />
            </label>
            <button 
                onClick={() => setIsManualModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-indigo-100 dark:shadow-none uppercase tracking-wider"
            >
                <Plus className="w-4 h-4" /> Novo Pedido
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou empresa..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none"
          >
            <option value="">Todas Empresas</option>
            {settings.categories?.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Empresa</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhum pedido encontrado.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-zinc-400">
                      {new Date(order.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">{order.client?.name}</span>
                        <span className="text-[10px] text-slate-500">{order.client?.cnpj}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-bold">
                        {order.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-zinc-100 text-right">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.value)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {order.file_path && (
                        <button 
                            onClick={async () => {
                                const { data } = await supabase.storage.from("client_vault").download(order.file_path);
                                if (data) {
                                    const url = URL.createObjectURL(data);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = order.file_path.split("___").pop() || "pedido.pdf";
                                    a.click();
                                }
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
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
               className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Novo Pedido Manual</h2>
                <button onClick={() => setIsManualModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5"/></button>
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
                    {settings.categories?.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor do Pedido (R$)</label>
                  <input 
                    type="number" step="0.01" 
                    value={orderValue} 
                    onChange={(e) => setOrderValue(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Arquivo do Pedido (Opcional)</label>
                  <input 
                    type="file" 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700"
                    accept=".pdf,.jpg,.png"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsManualModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 font-bold text-sm">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
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
                    <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 italic">Processamento em Lote (IA)</h2>
                    <p className="text-xs text-slate-500">A IA vai extrair dados de {batchFiles.length} arquivos.</p>
                </div>
                {!isProcessingBatch && (
                    <button onClick={() => { setIsBatchModalOpen(false); setBatchResults([]); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5"/></button>
                )}
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {batchResults.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                        <FileText className="w-12 h-12 text-slate-300" />
                        <p className="text-sm text-slate-500">Pronto para iniciar leitura dos arquivos.</p>
                        <button onClick={processBatch} disabled={isProcessingBatch} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Iniciar Leitura com Gemini</button>
                    </div>
                ) : (
                    batchResults.map((res, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${res.status === "success" ? "bg-emerald-50 text-emerald-600" : res.status === "warning" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate max-w-[200px]">{res.file.name}</span>
                                    {res.data && <span className="text-[10px] text-indigo-600 font-bold">{res.data.empresa} | {res.data.cliente} | R$ {res.data.valor}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${res.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                    {res.message}
                                </span>
                            </div>
                        </div>
                    ))
                )}
              </div>

              {isProcessingBatch && (
                <div className="mt-6 flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-600 animate-pulse">A Inteligência Artificial está lendo os arquivos...</p>
                </div>
              )}

              {batchResults.length > 0 && !isProcessingBatch && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 font-medium">* Pedidos com cliente não encontrado não serão salvos automaticamente.</p>
                    <button onClick={saveBatch} disabled={isSaving || !batchResults.some(r => r.status === "success")} className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
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
