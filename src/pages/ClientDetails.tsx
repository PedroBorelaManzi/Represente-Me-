import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  Clock, 
  Download, 
  Trash2, 
  Plus, 
  History, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Target, 
  ChevronRight,
  User,
  ExternalLink,
  ChevronLeft,
  Loader2,
  Filter,
  ArrowRight,
  Upload,
  X,
  CreditCard,
  Briefcase
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useUpload } from "../contexts/UploadContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { processOrderFile } from "../lib/orderProcessor";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentFile, setDraft, clearDraft, isProcessing } = useUpload();
  const [client, setClient] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadValue, setUploadValue] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const loadData = async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const { data: clientData } = await supabase.from("clients").select("*").eq("id", id).single();
      if (clientData) setClient(clientData);

      const { data: ordersData } = await supabase.from("orders").select("*").eq("client_id", id).order("created_at", { ascending: false });
      if (ordersData) setOrders(ordersData || []);

      const { data: filesData } = await supabase.from("orders").select("*").eq("client_id", id).not("file_name", "is", null).order("created_at", { ascending: false });
      if (filesData) setFiles(filesData || []);

      const { data: apptData } = await supabase.from('appointments').select('*').eq('client_id', id).order('date', { ascending: false });
      if (apptData) setAppointments(apptData || []);

      const { data: settingsData } = await supabase.from('user_settings').select('categories').eq('user_id', user.id).maybeSingle();
      if (settingsData) setUserCategories(settingsData.categories || []);

    } catch (err) {
      console.error("Error loading client data:", err);
      toast.error("Erro ao carregar dados do cliente");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, user]);

  const allAvailableCategories = useMemo(() => {
    const categoryMap = new Map();
    userCategories.forEach(cat => {
      if (cat) categoryMap.set(cat.toLowerCase().trim(), cat);
    });
    orders.forEach(order => {
      if (order.category) {
        const normalized = order.category.toLowerCase().trim();
        if (!categoryMap.has(normalized)) {
          categoryMap.set(normalized, order.category);
        }
      }
    });
    return Array.from(categoryMap.values()).sort();
  }, [userCategories, orders]);

  useEffect(() => {
    const handleFileProcess = async () => {
      if (currentFile && !isProcessing) {
        try {
          const result = await processOrderFile(currentFile);
          if (result.value) {
            setUploadValue(result.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
          }
          if (result.category) {
            setUploadCategory(result.category);
          }
        } catch (err) {
          console.error("Error processing file:", err);
        }
      }
    };
    handleFileProcess();
  }, [currentFile, isProcessing]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !user) return;
    setIsSavingCategory(true);
    try {
      const updatedCategories = [...userCategories, newCategoryName.trim()];
      const { error } = await supabase.from('user_settings').upsert({ user_id: user.id, categories: updatedCategories });
      if (error) throw error;
      setUserCategories(updatedCategories);
      setUploadCategory(newCategoryName.trim());
      setIsCreatingCategory(false);
      setNewCategoryName("");
      toast.success("Categoria criada com sucesso!");
    } catch (err) {
      console.error("Error saving category:", err);
      toast.error("Erro ao criar categoria");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFile || !id || !user) {
      toast.error("Selecione um arquivo primeiro");
      return;
    }

    setIsUploading(true);
    try {
      const cleanValue = uploadValue.replace(/\./g, '').replace(',', '.');
      const numericValue = parseFloat(cleanValue);

      if (isNaN(numericValue)) {
        toast.error("Valor inválido");
        return;
      }

      const fileExt = currentFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('orders').upload(filePath, currentFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('orders').insert([{
        client_id: id,
        user_id: user.id,
        value: numericValue,
        category: uploadCategory,
        file_path: filePath,
        file_name: currentFile.name
      }]);

      if (dbError) throw dbError;

      toast.success("Pedido enviado com sucesso!");
      clearDraft();
      setShowUploadModal(false);
      setUploadValue("");
      setUploadCategory("");
      loadData();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Erro ao enviar arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-900 uppercase">Cliente não encontrado</h2>
        <button onClick={() => navigate(-1)} className="mt-6 text-emerald-600 font-bold uppercase text-xs">Voltar</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Painel de Clientes</span>
          </button>
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-[0.8] mb-4">
              {client.name}
            </h1>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                Cliente Ativo
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{client.category || 'Sem Categoria'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => {
              clearDraft();
              setUploadValue("");
              setUploadCategory("");
              setShowUploadModal(true);
            }} 
            className="flex items-center gap-3 px-8 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all active:scale-95 group"
          >
            <Plus className="w-4 h-4" />
            Anexar Novo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-zinc-900 rounded-[48px] border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-zinc-800 flex items-center justify-between bg-slate-50/30 dark:bg-zinc-800/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800">
                  <Briefcase className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Histórico de Pedidos</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestão de faturamento e documentos</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              {orders.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-zinc-800/50 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-zinc-800">
                  <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <History className="w-10 h-10 text-slate-200" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-zinc-100 uppercase mb-2">Sem pedidos registrados</h4>
                  <p className="text-slate-400 text-xs font-medium max-w-[240px] mx-auto">Comece anexando o primeiro pedido deste cliente para gerar indicadores.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <motion.div 
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex items-center justify-between p-6 bg-slate-50/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 rounded-[32px] border border-transparent hover:border-slate-100 dark:hover:border-zinc-700 transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-zinc-800 group-hover:scale-110 transition-transform">
                          <FileText className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-black text-slate-900 dark:text-zinc-100 uppercase text-xs">Pedido #{order.id.slice(0, 6)}</h4>
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                              {order.category || 'Venda'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(new Date(order.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
                            {order.file_name && <span className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> {order.file_name}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Total</p>
                          <p className="text-xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter">
                            {order.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                        {order.file_path && (
                          <a 
                            href={supabase.storage.from('orders').getPublicUrl(order.file_path).data.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 text-slate-400 hover:text-emerald-600 hover:border-emerald-600 transition-all shadow-sm"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[48px] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/30 transition-colors" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xl">
                  <User className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Contato</h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">E-mail Principal</p>
                  <p className="text-sm font-bold truncate">{client.email || 'Não informado'}</p>
                </div>
                <div className="p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Telefone Comercial</p>
                  <p className="text-sm font-bold">{client.phone || 'Não informado'}</p>
                </div>
                <div className="p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Endereço de Faturamento</p>
                  <p className="text-sm font-bold leading-relaxed">{client.address || 'Não informado'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-[48px] p-8 border border-slate-100 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Status</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequência de Compra</span>
                  <span className="text-xs font-black text-emerald-600 uppercase">Saudável</span>
                </div>
                <div className="h-3 bg-slate-50 dark:bg-zinc-800 rounded-full overflow-hidden p-1">
                  <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
                </div>
              </div>
              <div className="pt-6 border-t border-slate-50 dark:border-zinc-800 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Médio</p>
                  <p className="text-lg font-black text-slate-900 dark:text-zinc-100 leading-none tracking-tighter">
                    {orders.length > 0 
                      ? (orders.reduce((acc, curr) => acc + curr.value, 0) / orders.length).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : 'R$ 0,00'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Faturado</p>
                  <p className="text-lg font-black text-emerald-600 leading-none tracking-tighter">
                    {orders.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[48px] p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-24 -mt-24" />
              
              <button 
                onClick={() => setShowUploadModal(false)}
                className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-50 dark:bg-zinc-800 rounded-2xl"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-10">
                <div className="w-16 h-16 rounded-[24px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-6">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-none mb-2">Anexar Pedido</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Envie o documento e registre os detalhes da venda</p>
              </div>

              <form onSubmit={submitUpload} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Documento do Pedido (PDF/Imagem)</label>
                    <div className={cn(
                      "p-10 border-2 border-dashed rounded-[32px] transition-all flex flex-col items-center justify-center text-center group",
                      currentFile ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-500/30" : "bg-slate-50 dark:bg-zinc-800/50 border-slate-100 dark:border-zinc-700 hover:border-emerald-500/50"
                    )}>
                      {currentFile ? (
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-emerald-100 dark:border-emerald-500/20">
                            <FileText className="w-8 h-8 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-zinc-100 uppercase mb-1">{currentFile.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{(currentFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); clearDraft(); }}
                            className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest"
                          >
                            Remover Arquivo
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                          </div>
                          <p className="text-xs font-black text-slate-900 dark:text-zinc-100 uppercase mb-2">Selecione ou arraste o arquivo</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tamanho máximo: 10MB</p>
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setDraft(file);
                            }}
                            accept="image/*,.pdf"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Valor da Venda</label>
                      <div className="relative group">
                        <CreditCard className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                        <input
                          required
                          type="text"
                          value={uploadValue}
                          onChange={(e) => setUploadValue(e.target.value)}
                          placeholder="0,00"
                          className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700 rounded-3xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 text-sm font-bold transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Empresa do Pedido</label>
                      <div className="relative">
                        <Filter className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <select
                          value={uploadCategory}
                          onChange={(e) => {
                            if (e.target.value === 'NEW') {
                              setIsCreatingCategory(true);
                            } else {
                              setUploadCategory(e.target.value);
                            }
                          }}
                          className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700 rounded-3xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 text-sm font-bold transition-all outline-none appearance-none"
                        >
                          <option value="">Selecione...</option>
                          {allAvailableCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="NEW" className="text-emerald-600 font-bold">+ Nova Empresa</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    disabled={isUploading || !currentFile}
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[32px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-emerald-500/30 transition-all active:scale-98 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Confirmar e Enviar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreatingCategory && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] p-10 shadow-2xl relative"
            >
              <div className="mb-8">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <Plus className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">Nova Empresa</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Adicione uma nova empresa à sua lista</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nome da Empresa</label>
                  <input
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-8 py-5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700 rounded-[24px] focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold"
                    placeholder="Nome da empresa..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsCreatingCategory(false)}
                    className="flex-1 py-4 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-2xl font-black uppercase text-[10px] tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={isSavingCategory || !newCategoryName.trim()}
                    onClick={handleCreateCategory}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isSavingCategory ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar"}
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
