import { useState, useEffect, useMemo } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, Building2, Calendar, FileText, Upload, Trash2, Download, HardDrive, Plus, X, Loader2, Clock, Shield, Lock, Eye, EyeOff, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";

export default function ClientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  
  const [client, setClient] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [clientAppointments, setClientAppointments] = useState<any[]>([]);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  
  const [categories, setCategories] = useState<string[]>([]);
  const [orderValue, setOrderValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getInactivityDays = (lastContactStr: string) => {
    if (!lastContactStr) return 0;
    const lastContact = new Date(lastContactStr).getTime();
    const today = new Date().getTime();
    return Math.floor((today - lastContact) / (1000 * 60 * 60 * 24));
  };

  const loadClient = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      navigate("/dashboard/clientes");
    } else {
      setClient(data);
      import('../lib/supabase').then(({ logAudit }) => logAudit('ACCESS_CLIENT_DETAILS', { client_id: id, client_name: data.name }));
      setNotes(data.notes || "");
    }
    setLoading(false);
  };

  const loadFiles = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFiles(data);
    }
  };

  const loadBankDetails = async () => {
    if (!user) return;
    const { data } = await supabase.from("client_bank_details").select("*").eq("client_id", id).single();
    setBankDetails(data);
  };

  const loadAppointments = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("client_id", id)
      .order("date", { ascending: true });
    
    if (!error && data) {
      setClientAppointments(data);
    }
  };

    const loadCategories = async () => {
    if (!user) return;
    const { data: catData, error } = await supabase
      .from("orders")
      .select("category")
      .eq("user_id", user.id);
    
    if (!error && catData) {
      const uniqueCats = new Set<string>();
      catData.forEach(o => {
        if (o.category) uniqueCats.add(o.category);
      });
      setCategories([...uniqueCats]);
    }
  };;

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    const { error } = await supabase
      .from("clients")
      .update({ notes })
      .eq("id", id);
    
    if (error) {
      alert("Erro ao salvar notas: " + error.message);
    }
    setIsSavingNotes(false);
  };

  const handleDeleteClient = async () => {
    if (!window.confirm("Deseja realmente excluir este cliente?\n\nATENÇáO: Todos os pedidos, arquivos e compromissos vinculados a este cliente seráo perdidos permanentemente.")) return;
    
    setIsDeleting(true);
    try {
      if (user && id) {
        // 1. Limpar arquivos do Storage
        const { data: storageFiles } = await supabase.storage
          .from("client_vault")
          .list(`${user.id}/${id}`);
        
        if (storageFiles && storageFiles.length > 0) {
          const filePaths = storageFiles.map(f => `${user.id}/${id}/${f.name}`);
          await supabase.storage.from("client_vault").remove(filePaths);
        }

        // 2. Deletar do Banco (Cascading cuida de Compromissos e Pedidos)
        const { error: dbError } = await supabase
          .from("clients")
          .delete()
          .eq("id", id);
        
        if (dbError) throw dbError;

        navigate("/dashboard/clientes");
      }
    } catch (err) {
      alert("Erro ao excluir cliente: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnalyzePDF = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("VITE_GEMINI_API_KEY náo configurada.");
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });
      
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(selectedFile);
      });
      const base64 = await base64Promise;

            const prompt = "Extraia o valor total do pedido. Retorne apenas o número sem R$ ou texto. Se houver decimais use ponto. Exemplo: 1547.50";
      
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64 as string, mimeType: selectedFile.type } }
      ]);

      const text = result.response.text().trim();
      if (text) {
        let value = text.replace(/[R$s]/g, '');
        if (value.includes(',') && value.includes('.')) {
          value = value.replace(/\./g, '').replace(',', '.');
        } else if (value.includes(',')) {
          value = value.replace(',', '.');
        }
        value = value.replace(/[^0-9.]/g, '');
        setOrderValue(value);
      }
    } catch (err) {
      console.error("Gemini Analysis Error:", err);
    }
    setIsAnalyzing(false);
  };

  const handleDownload = async (name: string, p: string) => {
    if (!user) return;
    
    const parts = name.split("___");
    const actualName = parts.length > 2 ? parts.slice(2).join("___") : (parts.length > 1 ? parts.slice(1).join("___") : name);

    const { data, error } = await supabase.storage.from("client_vault").download(p);
    if (!error && data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = actualName;
      a.click();
    }
  };

  const handleFileDelete = async (name: string, p: string, orderId: string) => {
    if (window.confirm("Deseja realmente excluir este arquivo?") && user) {
      const { error: storageError } = await supabase.storage.from("client_vault").remove([p]);
      const { error: dbError } = await supabase.from("orders").delete().eq("id", orderId);
      if (!storageError && !dbError) loadFiles();
    }
  };

  const saveNewCategory = async () => {
    const catName = newCategoryName.trim();
    if (catName) {
      const exists = settings.categories?.some(c => c.toLowerCase() === catName.toLowerCase());
      if (!exists) {
        const currentGlobal = (settings.categories || []);
        await updateSettings({ categories: [...currentGlobal, catName] });
      }
      setSelectedCategory(catName);
      setNewCategoryName("");
      setIsCreatingCategory(false);
    }
  };

  const submitUpload = async () => {
    if (!selectedFile || !user) return;
    setIsUploading(true);
    
    // Naming pattern: Categoria___VALOR_XXX___NomeOriginal
    const cleanName = selectedFile.name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_');
    const cleanValue = orderValue ? `VALOR_${parseFloat(orderValue).toFixed(2)}` : "VALOR_0";
    const formattedName = `${selectedCategory}___${cleanValue}___${cleanName}`;
    const path = `${user.id}/${id}/${formattedName}`;
    
    const { error } = await supabase.storage.from("client_vault").upload(path, selectedFile, { upsert: true });

    if (!error) {
      const enteredValue = parseFloat(orderValue) || 0;
      
      const currentFat = client?.faturamento || {};
      const updatedFat = { ...currentFat, [selectedCategory]: (Number(currentFat[selectedCategory] || 0) + enteredValue) };
      
      const currentLastC = client?.category_last_contact || {};
      const updatedLastC = { ...currentLastC, [selectedCategory]: new Date().toISOString() };

      await supabase.from('clients').update({ 
        faturamento: updatedFat, 
        category_last_contact: updatedLastC, 
        last_contact: new Date().toISOString() 
      }).eq('id', id);

      // RECORD IN ORDERS TABLE
      await supabase.from('orders').insert([{
        user_id: user.id,
        client_id: id,
        category: selectedCategory,
        value: enteredValue,
        file_path: path,
        file_name: formattedName
      }]);

      loadFiles();
      loadCategories();
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setOrderValue("");
    } else {
      alert("Erro no upload: " + error.message);
    }
    setIsUploading(false);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    loadClient();
    loadFiles();
    loadCategories();
    loadAppointments();
  }, [id, user, settings.categories]);

  useEffect(() => {
    if (selectedFile) handleAnalyzePDF();
  }, [selectedFile]);

  
  
  const allAvailableCategories = useMemo(() => {
    const s = settings.categories || [];
    const h = categories || [];
    const combined = Array.from(new Set([...s, ...h].map(c => c?.trim()).filter(Boolean)));
    
    const unique = [];
    const seen = new Set();
    
    for (const cat of combined) {
      const lower = cat.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(cat);
      }
    }
    
    return unique.sort((a, b) => a.localeCompare(b));
  }, [settings.categories, categories]);



  useEffect(() => {
    if (allAvailableCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(allAvailableCategories[0]);
    }
  }, [allAvailableCategories]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  if (!client) return null;

  return (
    <div className="space-y-8">
      {/* HEADER SECTION WITH NAVIGATION AND DELETE BUTTON */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200 dark:border-zinc-900">
        <Link to="/dashboard/clientes" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-zinc-400 hover:text-emerald-600 transition-colors">
          <ArrowLeft className="w-5 h-5 text-emerald-500" /> Voltar para Clientes
        </Link>
        
        <button 
          onClick={handleDeleteClient}
          disabled={isDeleting}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-black text-sm uppercase tracking-wider rounded-xl hover:bg-red-600 hover:text-white transition-all border-2 border-red-200 dark:border-red-900/30 shadow-sm disabled:opacity-50"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          EXCLUIR CLIENTE
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: CONTACT INFO & NOTES */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-zinc-900">
              <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl uppercase">
                {client.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">{client.name}</h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{client.cnpj || "N/A"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-zinc-400">
                <Phone className="w-4 h-4 text-slate-400 dark:text-zinc-500" /> <span>{client.phone || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-zinc-400">
                <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500" /> <span>{client.email || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-zinc-400">
                <MapPin className="w-4 h-4 text-slate-400 dark:text-zinc-500" /> <span>{client.city || "N/A"} {client.state ? `- ${client.state}` : ""}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-900">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${getInactivityDays(client.last_contact) < 365 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-slate-100 dark:border-zinc-900"}`}>
                {getInactivityDays(client.last_contact) < 365 ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm dark:shadow-none space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-emerald-500" /> Observações Gerais
              </h3>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Digite aqui observações sobre este cliente..."
                className="w-full h-32 px-3 py-2 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
              />
              <button 
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                {isSavingNotes ? "Salvando..." : "Salvar Observações"}
              </button>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-emerald-500" /> Compromissos na Agenda
              </h3>
              <div className="space-y-3">
                {clientAppointments.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 italic">Nenhum compromisso vinculado.</p>
                ) : (
                  clientAppointments.map(app => (
                    <div key={app.id} className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-900 rounded-xl flex flex-col gap-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">{app.title}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <Clock className="w-3 h-3 text-emerald-500" />
                        {new Date(app.date).toLocaleDateString('pt-BR')} | {app.time}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FILE CLOUD */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm dark:shadow-none p-6 flex flex-col h-[calc(100vh-14rem)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5"><HardDrive className="w-5 h-5 text-emerald-500" /> Nuvem de Arquivos</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Armazenamento privado de documentos e pedidos.</p>
            </div>
            
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-700 font-bold text-sm transition-all whitespace-nowrap"
            >
              <Upload className="w-4 h-4 mr-1.5" /> Subir Arquivo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            <AnimatePresence>
              {files.map((file) => {
                const parts = file.file_name?.split("___") || [];
                const categoryName = file.category || "Pedido";
                const actualName = parts.length > 2 ? parts.slice(2).join("___") : (parts.length > 1 ? parts.slice(1).join("___") : file.file_name);
                const uploadDate = new Date(file.created_at).toLocaleDateString('pt-BR');
                const orderValue = file.value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(file.value) : null;

                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-4 border border-slate-50 dark:border-zinc-950 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 dark:bg-zinc-900 rounded-xl">
                        <FileText className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-md">
                            {categoryName}
                          </span>
                          {orderValue && (
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md">
                              {orderValue}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-1 truncate max-w-xs">{actualName}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3"/> {uploadDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDownload(file.file_name, file.file_path)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"><Download className="w-4 h-4" /></button>
                      <button onClick={() => handleFileDelete(file.file_name, file.file_path, file.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                )
              })}

              {/* REMOVED OLD MAP */}
              {false && files.map((file) => {
                const parts = file.name.split("___");
                const hasCategory = parts.length > 2;
                const rawCategory = hasCategory ? parts[0] : "Pedido";
                const matchedCat = settings.categories?.find(c => c.toLowerCase() === rawCategory.toLowerCase());
                const categoryName = matchedCat || rawCategory;

                const actualName = hasCategory ? parts.slice(2).join("___") : (parts.length > 1 ? parts.slice(1).join("___") : file.name);
                const uploadDate = new Date(file.created_at).toLocaleDateString('pt-BR');

                return (
                  <motion.div
                    key={file.id || file.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-4 border border-slate-50 dark:border-zinc-950 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 dark:bg-zinc-900 rounded-xl">
                        <FileText className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-md">
                          {categoryName}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-1 truncate max-w-xs">{actualName}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3"/> {uploadDate} · {formatSize(file.metadata?.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDownload(file.name)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"><Download className="w-4 h-4" /></button>
                      <button onClick={() => handleFileDelete(file.name)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {files.length === 0 && !isUploading && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <FileText className="w-12 h-12 stroke-[1] mb-3 text-slate-200" />
                <p className="text-sm">Nenhum arquivo anexado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl p-6 w-full max-w-md space-y-5"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Subir Arquivo</h2>
                <button onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecionar Empresa</label>
                                    {!isCreatingCategory ? (
                    <div className="flex gap-2">
                      <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-100"
                        required
                      >
                        {allAvailableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <button type="button" onClick={() => setIsCreatingCategory(true)} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome da empresa..."
                        className="flex-1 px-3 py-2 border border-emerald-500 dark:border-emerald-600 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-100"
                        autoFocus
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); saveNewCategory(); } }}
                      />
                      <button type="button" onClick={saveNewCategory} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-sm">Salvar</button>
                      <button type="button" onClick={() => { setIsCreatingCategory(false); setNewCategoryName(""); }} className="px-3 py-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Arquivo</label>
                  <input 
                    type="file" 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valor do Pedido (R$)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={orderValue}
                      onChange={(e) => setOrderValue(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm bg-white dark:bg-zinc-900"
                    />
                    {isAnalyzing && <div className="flex items-center gap-1.5 text-purple-600 text-xs font-bold animate-pulse"><Loader2 className="w-4 h-4 animate-spin" /> IA LENDO...</div>}
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-3">
                <button onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                <button 
                  onClick={submitUpload}
                  disabled={!selectedFile || isUploading || !selectedCategory}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center transition-all"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
                  ANEXAR ARQUIVO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}







