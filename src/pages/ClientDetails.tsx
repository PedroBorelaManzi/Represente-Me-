import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Building2, 
  Calendar, 
  Clock, 
  TrendingUp, 
  ArrowLeft,
  ChevronRight,
  FileText,
  Download,
  Trash2,
  Plus,
  X,
  Loader2,
  HardDrive,
  Upload,
  AlertCircle,
  Briefcase
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function ClientDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  
  const [client, setClient] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [orderValue, setOrderValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [clientAppointments, setClientAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (user && id) {
      loadClientData();
    }
  }, [user, id]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      // Load Client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (clientError) throw clientError;
      setClient(clientData);
      setNotes(clientData.notes || "");
      setSelectedCategory(settings.categories?.[0] || "");

      // Load Files
      const { data: filesData } = await supabase.rpc("list_user_files", { u_id: user?.id });
      if (filesData) {
        const clientFiles = filesData.filter((f: any) => f.client_id === id);
        setFiles(clientFiles);
      }

      // Load Appointments
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', id)
        .order('date', { ascending: false });
      setClientAppointments(apptData || []);

      // Log access
      import('../lib/supabase').then(({ logAudit }) => logAudit('ACCESS_CLIENT_DETAILS', { client_id: id, client_name: clientData.name }));

    } catch (err) {
      console.error("Error loading client details:", err);
      toast.error("Erro ao carregar dados do cliente.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileDelete = async (fileName: string, filePath: string, fileId: string) => {
    if (!window.confirm("Deseja realmente excluir este arquivo?")) return;
    
    try {
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .remove([filePath]);
      
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('client_files')
        .delete()
        .eq('id', fileId);
      
      if (dbError) throw dbError;

      toast.success("Arquivo removido com sucesso!");
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      toast.error("Erro ao remover arquivo.");
    }
  };

  const handleDownload = async (fileName: string, filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(filePath);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    } catch (err) {
      toast.error("Erro ao baixar arquivo.");
    }
  };

  const submitUpload = async () => {
    if (!selectedFile || !user || !id) return;

    try {
      setIsUploading(true);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedCategory}___${Date.now()}___${selectedFile.name}`;
      const filePath = `${user.id}/${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('client_files')
        .insert([{
          user_id: user.id,
          client_id: id,
          file_name: fileName,
          file_path: filePath,
          category: selectedCategory,
          value: parseFloat(orderValue) || null
        }]);

      if (dbError) throw dbError;

      // If it has a value, register as an order too
      if (parseFloat(orderValue) > 0) {
        await supabase.from('orders').insert([{
          user_id: user.id,
          client_id: id,
          value: parseFloat(orderValue),
          category: selectedCategory,
          description: `Pedido via Upload: ${selectedFile.name}`
        }]);
      }

      toast.success("Arquivo anexado com sucesso!");
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setOrderValue("");
      loadClientData();
    } catch (err) {
      toast.error("Erro no upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const saveNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    const current = settings.categories || [];
    if (current.includes(newCategoryName.trim())) {
      setSelectedCategory(newCategoryName.trim());
      setIsCreatingCategory(false);
      return;
    }
    
    await updateSettings({ categories: [...current, newCategoryName.trim()] });
    setSelectedCategory(newCategoryName.trim());
    setIsCreatingCategory(false);
    setNewCategoryName("");
  };

  const handleSaveNotes = async () => {
    try {
      setIsSavingNotes(true);
      const { error } = await supabase
        .from('clients')
        .update({ notes })
        .eq('id', id);
      
      if (error) throw error;
      toast.success("Observações salvas!");
    } catch (err) {
      toast.error("Erro ao salvar.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const allAvailableCategories = useMemo(() => {
    const set = new Set(settings.categories || []);
    files.forEach(f => { if(f.category) set.add(f.category); });
    return Array.from(set);
  }, [settings.categories, files]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 opacity-20" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6">
        <AlertCircle className="w-16 h-16 text-red-500 opacity-20" />
        <h2 className="text-xl font-black uppercase text-slate-400 tracking-widest">Cliente não encontrado</h2>
        <Link to="/dashboard/clientes" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Voltar para Carteira</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Voltar
          </button>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-emerald-600 rounded-[32px] flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
              <User className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-none">{client.name}</h1>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-[10px] font-black uppercase rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo no Radar
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CNPJ: {client.cnpj}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="px-8 py-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-600 dark:text-zinc-400 hover:border-emerald-500 transition-all active:scale-95">Editar Cadastro</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: INFO & NOTES */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-8 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-zinc-800 pb-4">Informações de Contato</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-50 dark:bg-zinc-800 rounded-lg text-slate-400"><MapPin className="w-4 h-4" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Localização</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 leading-relaxed">{client.address || "Não informado"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-50 dark:bg-zinc-800 rounded-lg text-slate-400"><Phone className="w-4 h-4" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Telefone</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">{client.phone || "(---) ---- ----"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-50 dark:bg-zinc-800 rounded-lg text-slate-400"><Mail className="w-4 h-4" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">E-mail Comercial</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">{client.email || "não configurado"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Observações Estratégicas</h3>
              {isSavingNotes && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
            </div>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Histórico, preferências e notas de negociação..."
              className="w-full h-40 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-medium outline-none focus:ring-4 focus:ring-emerald-500/5 resize-none transition-all dark:text-zinc-200"
            />
            <button 
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="w-full py-4 bg-slate-900 dark:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              Atualizar Dossiê
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: FILES & TIMELINE */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-sm p-8 flex flex-col h-full min-h-[600px]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-50 dark:border-zinc-850">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-3 uppercase tracking-tight">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl"><HardDrive className="w-6 h-6 text-emerald-600" /></div>
                    Nuvem de Documentos
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Repositório Privado de Pedidos e Contratos</p>
                </div>

                <button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <Upload className="w-4 h-4" /> Anexar Novo
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {files.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                    <FileText className="w-20 h-20 mb-6 stroke-[1]" />
                    <p className="font-black uppercase text-xs tracking-[0.2em]">Cofre Digital Vazio</p>
                  </div>
                ) : (
                  files.map((file) => {
                    const parts = file.file_name?.split("___") || [];
                    const actualName = parts.length > 2 ? parts.slice(2).join("___") : (parts.length > 1 ? parts.slice(1).join("___") : file.file_name);
                    const orderValue = file.value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(file.value) : null;

                    return (
                      <div key={file.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-3xl hover:border-emerald-200 transition-all group">
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-zinc-800 group-hover:scale-110 transition-transform">
                              <FileText className="w-7 h-7 text-emerald-600" />
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-3 py-1 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">{file.category || "Geral"}</span>
                                {orderValue && <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-full">{orderValue}</span>}
                              </div>
                              <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100 truncate max-w-xs uppercase tracking-tight">{actualName}</h4>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> {new Date(file.created_at).toLocaleDateString('pt-BR')}
                              </p>
                           </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => handleDownload(file.file_name, file.file_path)} className="p-3 bg-white dark:bg-zinc-800 text-slate-400 hover:text-emerald-600 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800"><Download className="w-4 h-4" /></button>
                           <button onClick={() => handleFileDelete(file.file_name, file.file_path, file.id)} className="p-3 bg-white dark:bg-zinc-800 text-slate-400 hover:text-red-500 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
           </div>
        </div>
      </div>

      {/* Upload Modal - High Fidelity */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUploadModalOpen(false)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[48px] border border-white/20 shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="p-10 border-b border-slate-50 dark:border-zinc-850 flex items-center justify-between">
                <div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-none">Anexar Documento</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Upload Seguro para Nuvem</p>
                </div>
                <button onClick={() => setIsUploadModalOpen(false)} className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-400 hover:text-red-500 transition-all"><X className="w-5 h-5"/></button>
              </div>

              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-2">Empresa do Pedido</label>
                  {!isCreatingCategory ? (
                    <div className="flex gap-2 p-2 bg-slate-50 dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800">
                      <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="flex-1 bg-transparent px-4 py-2 text-xs font-black uppercase outline-none text-slate-900 dark:text-zinc-100"
                      >
                        {allAvailableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <button onClick={() => setIsCreatingCategory(true)} className="p-3 bg-emerald-600 text-white rounded-2xl"><Plus className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome da empresa..."
                        className="flex-1 px-6 py-4 bg-slate-50 dark:bg-zinc-950 border border-emerald-500 rounded-3xl text-xs font-black uppercase outline-none"
                        autoFocus
                      />
                      <button onClick={saveNewCategory} className="px-6 bg-emerald-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest">OK</button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-2">Arquivo Local</label>
                  <input 
                    type="file" 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-[10px] font-bold text-slate-500 file:mr-4 file:py-4 file:px-8 file:rounded-3xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-slate-900 file:text-white hover:file:bg-emerald-600 transition-all cursor-pointer"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-2">Valor Total do Pedido (OPCIONAL)</label>
                  <input 
                    type="text" 
                    value={orderValue}
                    onChange={(e) => setOrderValue(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="R$ 0,00"
                    className="w-full px-8 py-5 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-3xl text-sm font-black text-slate-900 dark:text-zinc-100 outline-none focus:ring-8 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="p-10 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-850">
                <button 
                  onClick={submitUpload}
                  disabled={!selectedFile || isUploading || !selectedCategory}
                  className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  <span>Efetivar Upload</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
