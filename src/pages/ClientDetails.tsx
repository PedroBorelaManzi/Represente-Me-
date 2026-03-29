import { useState, useEffect } from "react";
import { GoogleGenAI } from "@google/generative-ai";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, Building2, Calendar, FileText, Upload, Trash2, Download, HardDrive, Plus, X, Loader2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";

export default function ClientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const getInactivityDays = (lastContactStr: string) => {
    if (!lastContactStr) return 0;
    const lastContact = new Date(lastContactStr).getTime();
    const today = new Date().getTime();
    return Math.floor((today - lastContact) / (1000 * 60 * 60 * 24));
  };


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

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories]);

    const [orderValue, setOrderValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzePDF = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const genAI = new GoogleGenAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(selectedFile);
      });
      const base64 = await base64Promise;

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: selectedFile.type,
            data: base64 as string
          }
        },
        "Extraia o valor total final deste pedido ou orçamento. Retorne APENAS o número sem R$ ou texto. Se houver decimais use ponto. Exemplo: 1547.50"
      ]);

      const text = result.response.text().trim();
      if (text) {
          let value = text.replace(/[R$\s]/g, '');
          if (value.includes(',') && value.includes('.')) {
              value = value.replace(/\./g, '').replace(',', '.');
          } else if (value.includes(',')) {
              value = value.replace(',', '.');
          }
          value = value.replace(/[^0-9.]/g, '');
          setOrderValue(value);
      }
    } catch (err) {
        alert("Erro na IA: " + (err instanceof Error ? err.message : String(err)) + "\n\nVerifique as configurações da API do Gemini.");
    }
    setIsAnalyzing(false);
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
      setNotes(data.notes || "");
    }
    setLoading(false);
  };

  const loadFiles = async () => {
    if (!user) return;
    const { data, error } = await supabase.storage
      .from("client_vault")
      .list(`${user.id}/${id}`);

    if (!error && data) {
      // Sort files by newest first
      const sorted = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setFiles(sorted);
    }
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

  const loadCategories = async () => {
    if (!user) return;
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, faturamento");

    if (!error && clients) {
      const uniqueCats = new Set<string>();
      
      // 1. Tentar ler do banco de dados agregados
      clients.forEach((c: any) => {
         if (c.faturamento) {
             Object.keys(c.faturamento).forEach(cat => uniqueCats.add(cat));
         }
      });

      // 2. BACKUP: Ler direto das pastas de Arquivos de Todos os Clientes para falhas
      const filesPromises = clients.map(async (client: any) => {
         const { data: files } = await supabase.storage
           .from("client_vault")
           .list(`${user.id}/${client.id}`);
         if (files) {
             files.forEach((file: any) => {
                 const parts = file.name.split("___");
                 if (parts.length > 1) {
                      uniqueCats.add(parts[0]);
                 }
             });
         }
      });
      
      await Promise.all(filesPromises);
      
      // Normalizar usando o settings.categories do contexto global
      const normalizedCats = [...uniqueCats].map(cat => {
          const matched = settings.categories?.find(c => c.toLowerCase() === cat.toLowerCase());
          return matched || cat;
      });
      
      setCategories([...new Set(normalizedCats)]);
    }
  };


  useEffect(() => {
    loadClient();
    loadFiles();
    loadCategories();
    loadAppointments();
  }, [id, user, settings.categories]); // Adicionado settings.categories como dependência

  useEffect(() => {
    if (selectedFile) {
      handleAnalyzePDF();
    }
  }, [selectedFile]);


  const handleDeleteCategory = (categoryToDelete: string) => {
    if (!window.confirm(`Deseja realmente excluir a categoria "${categoryToDelete}"?`)) return;
    const updated = categories.filter(cat => cat.toLowerCase() !== categoryToDelete.toLowerCase());
    setCategories(updated);
    setSelectedCategory(updated.length > 0 ? updated[0] : "");
  };

  const saveNewCategory = async () => {
    if (newCategoryName.trim()) {
      const catName = newCategoryName.trim();
      
      // Verificar se já existe (ignorando case)
      const exists = settings.categories?.some(c => c.toLowerCase() === catName.toLowerCase()) || 
                     categories.some(c => c.toLowerCase() === catName.toLowerCase());
      
      if (!exists) {
        const updated = [...categories, catName];
        setCategories(updated);
        setSelectedCategory(catName);
        
        // Persistir globalmente para aparecer em "Empresas"
        const currentGlobal = (settings.categories || []);
        await updateSettings({ categories: [...currentGlobal, catName] });
        
        setNewCategoryName("");
        setIsCreatingCategory(false);
      } else {
          // Se existe, apenas seleciona a existente
          const existing = settings.categories?.find(c => c.toLowerCase() === catName.toLowerCase()) || 
                           categories.find(c => c.toLowerCase() === catName.toLowerCase());
          if (existing) setSelectedCategory(existing);
          setNewCategoryName("");
          setIsCreatingCategory(false);
      }
    }
  };

  const submitUpload = async () => {
    if (!selectedFile || !user) return;
    setIsUploading(true);
    
    // Naming pattern: Categoria___NomeOriginal
    const cleanName = selectedFile.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '_');
      const cleanValue = orderValue ? `VALOR_${parseFloat(orderValue).toFixed(2)}` : "VALOR_0";
      const formattedName = `${selectedCategory}___${cleanValue}___${cleanName}`;
    const path = `${user.id}/${id}/${formattedName}`;
    
    const { error } = await supabase.storage
      .from("client_vault")
      .upload(path, selectedFile, { upsert: true });

    if (!error) {
      // Garantir que a categoria esteja no global settings (ignora case)
      const alreadyInGlobal = settings.categories?.some(c => c.toLowerCase() === selectedCategory.toLowerCase());
      if (!alreadyInGlobal) {
        const currentGlobal = settings.categories || [];
        await updateSettings({ categories: [...currentGlobal, selectedCategory] });
      }

      // Safely update category_last_contact in db
      const currentCats = client?.category_last_contact || {};
      // Atualizar no DB respeitando o case da categoria atual
      const updatedCats = { 
        ...currentCats, 
        [selectedCategory]: new Date().toISOString() 
      };

      // Somar Faturamento
      const currentFat = client?.faturamento || {};
      const enteredValue = parseFloat(orderValue) || 0;
      const updatedFat = { ...currentFat, [selectedCategory]: (Number(currentFat[selectedCategory] || 0) + enteredValue) };

      await supabase
        .from('clients')
        .update({ 
           category_last_contact: updatedCats, 
           faturamento: updatedFat, 
           last_contact: new Date().toISOString() 
        })
        .eq('id', id);
        
      setClient({ ...client, category_last_contact: updatedCats, faturamento: updatedFat, last_contact: new Date().toISOString() });
      setOrderValue(""); // Reset
      
      loadFiles();
      setIsUploadModalOpen(false);
      setSelectedFile(null);
    } else {
      alert("Erro ao enviar arquivo: " + error.message);
    }
    setIsUploading(false);
  };

  const handleFileDelete = async (name: string) => {
    if (window.confirm("Deseja realmente excluir este arquivo?") && user) {
      const path = `${user.id}/${id}/${name}`;
      const { error } = await supabase.storage.from("client_vault").remove([path]);
      if (!error) loadFiles();
    }
  };

  const handleDownload = async (name: string) => {
    if (!user) return;
    const path = `${user.id}/${id}/${name}`;
    
    // Parse actual filename
    const parts = name.split("___");
    const actualName = parts.length > 1 ? parts.slice(1).join("___") : name;

    const { data, error } = await supabase.storage.from("client_vault").download(path);
    if (!error && data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = actualName;
      a.click();
    } else {
        alert("Erro no download.");
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  if (!client) return null;

  // Lista definitiva de categorias (Settings + Descobertas locais) normalizada
  const allAvailableCategories = [...new Set([...(settings.categories || []), ...categories])];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/dashboard/clientes" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-zinc-900">
              <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">
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

          {/* Nova Seção: Compromissos e Observações */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm dark:shadow-none space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-indigo-500" /> Observações Gerais
              </h3>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Digite aqui observações sobre este cliente, pontos a melhorar, etc..."
                className="w-full h-32 px-3 py-2 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
              />
              <button 
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {isSavingNotes ? "Salvando..." : "Salvar Observações"}
              </button>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-indigo-500" /> Compromissos na Agenda
              </h3>
              <div className="space-y-3">
                {clientAppointments.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 italic">Nenhum compromisso vinculado.</p>
                ) : (
                  clientAppointments.map(app => (
                    <div key={app.id} className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-900 rounded-xl flex flex-col gap-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">{app.title}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        {new Date(app.date).toLocaleDateString('pt-BR')} | {app.time}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm dark:shadow-none p-6 flex flex-col h-[calc(100vh-14rem)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5"><HardDrive className="w-5 h-5 text-indigo-500" /> Nuvem de Arquivos</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Faça upload de documentos vinculados a este cliente (Armazenamento Privado).</p>
            </div>
            
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              disabled={isUploading}
              className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm dark:shadow-none hover:bg-indigo-700 font-medium text-sm transition-colors whitespace-nowrap"
            >
              <Upload className="w-4 h-4 mr-1.5" /> {isUploading ? "Enviando..." : "Subir Arquivo"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            <AnimatePresence>
              {files.map((file) => {
                const parts = file.name.split("___");
                const hasCategory = parts.length > 1;
                const rawCategory = hasCategory ? parts[0] : "Documento";
                const matchedCat = settings.categories?.find(c => c.toLowerCase() === rawCategory.toLowerCase());
                const categoryName = matchedCat || rawCategory;

                const actualName = hasCategory ? parts.slice(1).join("___") : file.name;
                const uploadDate = new Date(file.created_at).toLocaleDateString('pt-BR');
                const uploadTime = new Date(file.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <motion.div
                    key={file.id || file.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-4 border border-slate-100 dark:border-zinc-900 rounded-xl hover:bg-slate-50 dark:bg-zinc-950 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 rounded-xl">
                        <FileText className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-md">
                            {categoryName}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate max-w-xs">{actualName}</h4>
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-xs text-slate-500 dark:text-zinc-400 border-r border-slate-200 dark:border-zinc-800 pr-3">{formatSize(file.metadata?.size)}</p>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400 dark:text-zinc-500"/> {uploadDate} às {uploadTime}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDownload(file.name)} className="p-2 text-slate-400 dark:text-zinc-500 hover:text-indigo-600 rounded-xl hover:bg-white dark:bg-zinc-900 border border-transparent hover:border-slate-200 dark:border-zinc-800 transition-all"><Download className="w-4 h-4" /></button>
                      <button onClick={() => handleFileDelete(file.name)} className="p-2 text-slate-400 dark:text-zinc-500 hover:text-red-600 rounded-xl hover:bg-white dark:bg-zinc-900 border border-transparent hover:border-slate-200 dark:border-zinc-800 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {files.length === 0 && !isUploading && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500 py-12">
                <FileText className="w-12 h-12 stroke-[1.5] mb-3 text-slate-300" />
                <p className="text-sm font-medium">Nenhum arquivo anexado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl p-6 w-full max-w-md space-y-5"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Subir Arquivo</h2>
                <button onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); }} className="p-2 text-slate-400 dark:text-zinc-500 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5"/></button>
              </div>

              <div className="space-y-5">
                {/* Category picker */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Selecionar Empresa</label>
                  
                  {!isCreatingCategory ? (
                    <div className="flex gap-2">
                       <select 
                         value={selectedCategory}
                         onChange={(e) => setSelectedCategory(e.target.value)}
                         className="flex-1 px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-100"
                         required
                       >
                         {allAvailableCategories.length === 0 && (
                           <option value="" disabled>Escolha ou digite...</option>
                         )}
                         {allAvailableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                       </select>
                       
                       {selectedCategory && (
                         <button 
                           onClick={() => handleDeleteCategory(selectedCategory)}
                           className="px-3 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-medium text-sm flex items-center transition-colors border border-red-100"
                           title="Excluir Empresa"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}

                       <button 
                         onClick={() => setIsCreatingCategory(true)}
                         className="px-3 py-2 bg-slate-100 text-slate-700 dark:text-zinc-300 rounded-xl hover:bg-slate-200 font-medium text-sm flex items-center transition-colors border border-slate-200 dark:border-zinc-800"
                         title="Adicionar Nova Categoria"
                       >
                         <Plus className="w-4 h-4" />
                       </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome da categoria..."
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                        autoFocus
                      />
                      <button 
                        onClick={saveNewCategory}
                        disabled={!newCategoryName.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm disabled:opacity-50 transition-colors"
                      >
                        Salvar
                      </button>
                      <button 
                         onClick={() => { setIsCreatingCategory(false); setNewCategoryName(""); }}
                         className="px-3 py-2 bg-slate-100 text-slate-600 dark:text-zinc-400 rounded-xl hover:bg-slate-200 font-medium text-sm transition-colors border border-slate-200 dark:border-zinc-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* File picker */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Arquivo</label>
                  <input 
                    type="file" 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-500 dark:text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>

                
                {/* Valor do Pedido Input */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Valor do Pedido (R$)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={orderValue}
                      onChange={(e) => setOrderValue(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                    />
                    {isAnalyzing && (
                      <div className="flex items-center gap-1.5 text-purple-600 text-xs font-semibold whitespace-nowrap animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" /> Lendo PDF...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-zinc-900 flex justify-end gap-3">
                <button 
                  onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); setIsCreatingCategory(false); }}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={submitUpload}
                  disabled={!selectedFile || isUploading || !selectedCategory}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow-sm dark:shadow-none hover:bg-indigo-700 font-medium text-sm disabled:opacity-50 flex items-center transition-colors"
                >
                  {isUploading ? "Enviando..." : "Anexar Arquivo"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
