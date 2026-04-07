import { useState, useEffect } from "react";
import React from "react";
import { Users, Search, Plus, Phone, Mail, AlertCircle, Trash2, ExternalLink, Loader2, Building2, Info, X, Edit, Filter, Upload, FileCheck, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { parseFileForCnpjs } from "../lib/clientImport";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSettings } from "../contexts/SettingsContext";
import { useAuth } from "../contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getHighPrecisionCoordinates } from "../lib/geminiGeocoding";

export interface Client {
  id: string;
  name: string;
  cnpj?: string;
  status: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  address?: string;
  lat?: number;
  lng?: number;
  last_contact: string;
  created_at?: string;
  alerts?: any[];
}

export default function CRMPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const queryClient = useQueryClient();

  // Basic State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"Todos" | "Alerta" | "Critico" | "Perda">("Todos");
  const [mobileItemsLimit, setMobileItemsLimit] = useState(15);
  const scrollSentinelRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filter State
  const [filterName, setFilterName] = useState("");
  const [filterCnpj, setFilterCnpj] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterCity, setFilterCity] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Interaction State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);

  // Import State
  const [importing, setImporting] = useState(false);
  const [showDropzoneModal, setShowDropzoneModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  // Form State
  const [newClient, setNewClient] = useState<Omit<Client, 'id' | 'created_at'>>({
    name: "", cnpj: "", address: "", phone: "", email: "", city: "", state: "",
    last_contact: new Date().toISOString().split('T')[0]
  });
  const [editFormData, setEditFormData] = useState<any>({
    name: "", cnpj: "", address: "", phone: "", email: "", city: "", state: "", last_contact: ""
  });

  // 1. Data Fetching Definition
  const fetchClients = async () => {
    if (!user) return [];
    const { data: clientsData, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !clientsData) return [];

    const { data: files } = await supabase.rpc("list_user_files", { u_id: user.id });
    const filesByClient: any = {};
    if (files) {
        files.forEach((f: any) => {
            const cId = f.client_id;
            if (!filesByClient[cId]) filesByClient[cId] = [];
            filesByClient[cId].push({ file_name: f.file_name, created_at: f.created_at });
        });
    }

    return clientsData.map((client: any) => {
       const clientFiles = filesByClient[client.id] || [];
       const lastDates: any = {};
       clientFiles.forEach((f: any) => {
           const parts = f.file_name.split("___");
           if (parts.length > 1) {
               const rawCat = parts[0];
               const matchedCat = settings.categories?.find(c => c.toLowerCase() === rawCat.toLowerCase());
               const cat = matchedCat || rawCat;
               const date = new Date(f.created_at).getTime();
               if (!lastDates[cat] || date > lastDates[cat]) lastDates[cat] = date;
           }
       });
       
       const alerts: any[] = [];
       const today = new Date().getTime();
       for (const [cat, date] of Object.entries(lastDates)) {
           const days = Math.floor((today - (date as number)) / (1000 * 60 * 60 * 24));
           if (days >= (settings.perda_days || 365)) alerts.push({ company: cat, type: "Perda", days });
           else if (days >= (settings.critico_days || 90)) alerts.push({ company: cat, type: "Critico", days });
           else if (days >= (settings.alerta_days || 45)) alerts.push({ company: cat, type: "Alerta", days });
       }
       return { ...client, alerts: alerts.sort((a, b) => b.days - a.days) };
    });
  };

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ["clients", user?.id, settings.categories],
    queryFn: fetchClients,
    enabled: !!user,
  });

  // 2. Derived State Definition
  const filteredClients = React.useMemo(() => {
    return (clients || []).filter(c => {
        const nameMatch = !filterName || c.name.toLowerCase().includes(filterName.toLowerCase());
        const cnpjMatch = !filterCnpj || (c.cnpj && c.cnpj.includes(filterCnpj));
        const cityMatch = !filterCity || (c.city && c.city.toLowerCase().includes(filterCity.toLowerCase()));
        
        const getDays = (dateStr) => {
            if (!dateStr) return 0;
            return Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
        };
        
        const days = getDays(c.last_contact);
        const statusMatch = filterStatus === "Todos" || (days >= 365 ? "Inativo" : "Ativo") === filterStatus;
        const searchMatch = !searchQuery.trim() || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.cnpj && c.cnpj.includes(searchQuery));
        
        if (!(nameMatch && cnpjMatch && cityMatch && statusMatch && searchMatch)) return false;
        
        const alertTypes = (c.alerts || []).map(a => a.type);
        return activeTab === "Todos" || alertTypes.includes(activeTab);
    });
  }, [clients, filterName, filterCnpj, filterCity, filterStatus, searchQuery, activeTab]);

  // 3. Logic & Handlers Definition
  const runAudit = async () => {
    setIsAuditing(true);
    setAuditProgress(0);
    const results = [];
    for (let i = 0; i < filteredClients.length; i++) {
       const client = filteredClients[i];
       setAuditProgress(i + 1);
       const coords = await getHighPrecisionCoordinates(client.address || "", client.name, client.cnpj);
       results.push({ id: client.id, name: client.name, ...coords });
       await new Promise(r => setTimeout(r, 2000));
    }
    console.log(JSON.stringify(results, null, 2));
    setIsAuditing(false);
  };

  useEffect(() => {
    if (!scrollSentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && filteredClients.length > mobileItemsLimit) {
        setMobileItemsLimit(prev => prev + 15);
      }
    }, { threshold: 0.1 });
    obs.observe(scrollSentinelRef.current);
    return () => obs.disconnect();
  }, [filteredClients.length, mobileItemsLimit]);

  const handleCnpjLookup = async () => {
    const cleanedCnpj = newClient.cnpj?.replace(/\D/g, "");
    if (!cleanedCnpj || cleanedCnpj.length !== 14) return alert("CNPJ invÃ¡lido.");
    setIsSearchingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanedCnpj}`);
      const data = await res.json();
      setNewClient(prev => ({
        ...prev,
        name: data.razao_social || data.nome_fantasia || prev.name,
        address: `${data.logradouro || ""}, ${data.nÃºmero || "S/N"} - ${data.bairro || ""}`.trim(),
        city: data.municipio || prev.city,
        state: data.uf || prev.state
      }));
    } catch (err) { alert("Erro ao buscar CNPJ."); } finally { setIsSearchingCnpj(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
       // VerificaÃƒÂ§ÃƒÂ£o de Duplicidade por CNPJ
       if (newClient.cnpj) {
         const cleanedCnpj = newClient.cnpj.replace(/\D/g, "");
         
         // Consulta no banco de dados (jÃƒÂ¡ limpo via script)
         const { data: existingClient, error: checkError } = await supabase
           .from("clients")
           .select("id, name")
           .eq("cnpj", cleanedCnpj) // ComparaÃƒÂ§ÃƒÂ£o numÃƒÂ©rica
           .eq("user_id", user.id)
           .maybeSingle();

         if (checkError) console.error("Error checking duplication:", checkError);
         
         if (existingClient) {
           toast.error(`Cadastro Bloqueado: ${existingClient.name}`, {
             description: "JÃƒÂ¡ existe um cliente com este CNPJ. Verifique sua lista.",
             icon: <AlertCircle className="w-5 h-5 text-red-500" />
           });
           setSubmitting(false);
           return;
         }
       }

       const coords = await getHighPrecisionCoordinates(`${newClient.address}, ${newClient.city}`, newClient.name, newClient.cnpj);
       const { error: insertError } = await supabase.from("clients").insert([{ 
         ...newClient, 
         cnpj: newClient.cnpj?.replace(/\D/g, ""),
         lat: coords?.lat, 
         lng: coords?.lng, 
         status: "Ativo", 
         user_id: user.id 
       }]);

       if (insertError) throw insertError;

       toast.success("Cliente cadastrado com sucesso!");
       refetch();
       setIsModalOpen(false);
       setNewClient({
         name: "", cnpj: "", address: "", phone: "", email: "", city: "", state: "",
         last_contact: new Date().toISOString().split('T')[0]
       });
    } catch (err: any) { 
      toast.error("Erro ao cadastrar: " + err.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("clients").update(editFormData).eq("id", editingClient.id);
    if (!error) { refetch(); setIsEditModalOpen(false); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Excluir cliente?")) {
      await supabase.from("clients").delete().eq("id", id);
      refetch();
    }
  };

  const processSelectedFile = async (file: File) => {
    setImporting(true);
    setShowImportModal(true);
    setShowDropzoneModal(false);
    setImportResults({ total: 0, processed: 0, success: 0, failed: 0, skipped: 0, failedList: [] });
    
    try {
      const cnpjs = await parseFileForCnpjs(file);
      const total = cnpjs.length;
      setImportResults(prev => ({ ...prev, total }));

      // Buscar todos os CNPJs existentes do usuÃƒÂ¡rio para checagem rÃƒÂ¡pida em memÃƒÂ³ria
      const { data: existingClients } = await supabase
        .from("clients")
        .select("cnpj")
        .eq("user_id", user.id);
      
      const existingCnpjs = new Set((existingClients || []).map(c => c.cnpj));

      for (const cnpj of cnpjs) {
         const cleanCnpj = cnpj.replace(/\D/g, "");
         
         if (existingCnpjs.has(cleanCnpj)) {
            setImportResults(prev => ({ 
              ...prev, 
              processed: prev.processed + 1, 
              skipped: prev.skipped + 1 
            }));
            continue;
         }

         // Aqui poderÃƒÂ­amos buscar o nome via Gemini ou API, mas para velocidade criaremos o registro basico
         const { error: insertError } = await supabase.from("clients").insert([{
           name: `Novo Cliente (${cleanCnpj.substring(0, 8)})`, // Nome provisÃƒÂ³rio
           cnpj: cleanCnpj,
           status: "Ativo",
           user_id: user.id,
           last_contact: new Date().toISOString().split('T')[0]
         }]);

         if (!insertError) {
           setImportResults(prev => ({ ...prev, processed: prev.processed + 1, success: prev.success + 1 }));
           existingCnpjs.add(cleanCnpj); // Evitar duplicatas no mesmo lote
         } else {
           setImportResults(prev => ({ ...prev, processed: prev.processed + 1, failed: prev.failed + 1 }));
         }
         
         await new Promise(r => setTimeout(r, 50)); // Feedback visual
      }
      
      refetch();
      toast.success("ImportaÃƒÂ§ÃƒÂ£o concluÃƒÂ­da!", { description: `${cnpjs.length} processados.` });
    } catch (err: any) { 
      toast.error("Erro na importaÃƒÂ§ÃƒÂ£o: " + err.message); 
    } finally { 
      setImporting(false); 
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-indigo-600 w-12 h-12" /></div>;

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" /> GestÃƒÂ£o de Clientes
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Monitore sua carteira e alertas de inatividade.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
             <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar cliente..." className="w-full pl-9 pr-3 py-2 border dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm outline-none dark:focus:border-indigo-500 focus:border-indigo-500 transition-all" />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"><Plus className="w-4 h-4" /> Novo</button>
          <button onClick={() => setShowDropzoneModal(true)} className="px-4 py-2 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2"><Upload className="w-4 h-4" /> Importar</button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b dark:border-zinc-800 overflow-x-auto scroller-hidden">
        {(["Todos", "Alerta", "Critico", "Perda"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-2 text-sm font-black border-b-2 transition-colors uppercase tracking-widest text-[10px] ${activeTab === tab ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"}`}>
            {tab} <span className="ml-1 opacity-60">({clients.filter(c => tab === "Todos" ? true : c.alerts?.some(a => a.type === tab)).length})</span>
          </button>
        ))}
      </div>

      <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-[32px] border dark:border-zinc-800 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-zinc-950/50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Contato</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Alertas</th>
              <th className="px-6 py-4 text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">AÃƒÂ§ÃƒÂµes</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-zinc-850">
            {filteredClients.map(client => (
              <tr key={client.id} className="group hover:bg-slate-50 dark:hover:bg-zinc-950/50 transition-colors">
                <td className="px-6 py-4">
                   <Link to={`/dashboard/clientes/${client.id}`} className="flex items-center gap-3">
                     <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-700 font-bold border dark:border-indigo-900/40">{client.name.charAt(0)}</div>
                     <div>
                       <div className="text-sm font-black text-slate-900 dark:text-zinc-100">{client.name}</div>
                       <div className="text-[10px] text-slate-400 font-bold">{client.cnpj}</div>
                     </div>
                   </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-slate-700 dark:text-zinc-400 flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {client.phone || "N/A"}</div>
                  <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2 mt-0.5"><Mail className="w-3.5 h-3.5" /> {client.email || "N/A"}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {client.alerts?.map((a, idx) => (
                      <span key={idx} className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-tighter ${a.type === "Perda" ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 underline"}`}>
                        {a.company} Ã¢â‚¬Â¢ {a.days}D
                      </span>
                    ))}
                    {!client.alerts?.length && <span className="text-emerald-600 text-[10px] font-black uppercase">Em dia</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingClient(client); setEditFormData(client); setIsEditModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(client.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                      <Link to={`/dashboard/clientes/${client.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all"><ChevronRight className="w-4 h-4" /></Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
         {filteredClients.slice(0, mobileItemsLimit).map(client => (
            <div key={client.id} className="bg-white dark:bg-zinc-900 p-5 rounded-[24px] border dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-all">
               <Link to={`/dashboard/clientes/${client.id}`} className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-700 font-bold">{client.name.charAt(0)}</div>
                     <div>
                        <div className="text-sm font-black text-slate-900 dark:text-zinc-100 line-clamp-1">{client.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{client.cnpj}</div>
                     </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
               </Link>
               <div className="flex flex-wrap gap-1">
                  {client.alerts?.map((a, i) => <span key={i} className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-50 dark:bg-zinc-800 rounded-lg">{a.company}</span>)}
               </div>
            </div>
         ))}
         <div ref={scrollSentinelRef} className="h-20 w-full" />
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="bg-white/95 dark:bg-zinc-900/95 w-full max-w-xl rounded-[32px] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/20 dark:border-zinc-800/50 backdrop-blur-xl"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
                       <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-indigo-600"><Plus className="w-5 h-5"/></div>
                       Novo Cliente
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Preencha os dados oficiais da empresa</p>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-zinc-950 rounded-2xl border dark:border-zinc-850">
                    <input 
                      type="text" 
                      placeholder="CNPJ (apenÃºmeros)" 
                      value={newClient.cnpj} 
                      onChange={e => setNewClient(prev => ({ ...prev, cnpj: e.target.value }))} 
                      className="flex-1 px-4 py-2 bg-transparent font-bold tracking-tight text-sm outline-none placeholder:text-slate-300" 
                    />
                    <button 
                      type="button" 
                      onClick={handleCnpjLookup} 
                      disabled={isSearchingCnpj} 
                      className="px-5 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
                    >
                      {isSearchingCnpj ? <Loader2 className="animate-spin w-3 h-3" /> : "BUSCAR"}
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">RazÃƒÂ£o Social</label>
                      <input type="text" placeholder="Ex: REPRESENTAÃƒâ€¡Ãƒâ€¢ES LTDA" value={newClient.name} onChange={e => setNewClient(prev => ({ ...prev, name: e.target.value }))} required className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">EndereÃ§o Completo</label>
                      <inÃºmero, Bairro, Cidade - UF" value={newClient.address} onChange={e => setNewClient(prev => ({ ...prev, address: e.target.value }))} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Telefone</label>
                        <input type="text" placeholder="(00) 0000-0000" value={newClient.phone} onChange={e => setNewClient(prev => ({ ...prev, phone: e.target.value }))} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">E-mail</label>
                        <input type="email" placeholder="contato@empresa.com" value={newClient.email} onChange={e => setNewClient(prev => ({ ...prev, email: e.target.value }))} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : <>CADASTRAR CLIENTE <ChevronRight className="w-4 h-4"/></>}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showDropzoneModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
             <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 20 }} 
               className="bg-white/95 dark:bg-zinc-900/95 w-full max-w-xl rounded-[32px] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/20 dark:border-zinc-800/50 backdrop-blur-xl text-center"
             >
                <div className="flex justify-between items-center mb-8 text-left">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight italic">Importar Carteira</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">SincronizaÃƒÂ§ÃƒÂ£o em massa via OCR</p>
                  </div>
                  <button onClick={() => setShowDropzoneModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                
                <div 
                   onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                   onDragLeave={() => setIsDragging(false)}
                   onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) processSelectedFile(file); }}
                   className={`h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer group relative ${isDragging ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-slate-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-zinc-950/50"}`}
                >
                   <input type="file" onChange={(e) => { const file = e.target.files?.[0]; if (file) processSelectedFile(file); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                   <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl mb-4 shadow-sm group-hover:scale-110 transition-transform border dark:border-zinc-800">
                      <Upload className="w-8 h-8 text-indigo-600" />
                   </div>
                   <p className="font-black text-slate-900 dark:text-zinc-100 uppercase tracking-widest text-[11px]">Arraste sua planilha ou PDF</p>
                   <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tight">ExtraÃƒÂ§ÃƒÂ£o inteligente de CNPJs via IA</p>
                </div>
             </motion.div>
          </div>
        )}

        {showImportModal && importResults && (
           <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="bg-white/95 dark:bg-zinc-900/95 w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-indigo-100/50 dark:border-indigo-900/30 text-center"
              >
                 <div className="mb-6 relative h-24 w-24 mx-auto">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                       <circle className="stroke-slate-100 dark:stroke-zinc-800 fill-none" strokeWidth="3" cx="18" cy="18" r="16" />
                       <circle className="stroke-indigo-600 fill-none transition-all duration-500 ease-out" strokeWidth="3" cx="18" cy="18" r="16" strokeDasharray={`${(importResults.processed / (importResults.total || 1)) * 100}, 100`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums">${Math.round((importResults.processed / (importResults.total || 1)) * 100)}%</div>
                 </div>
                 <h2 className="text-lg font-black uppercase mb-1 italic tracking-tight">PROCESSANDO...</h2>
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-8">${importResults.processed} de ${importResults.total} registros</p>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                       <span className="text-[8px] font-black text-emerald-600 block mb-1 uppercase tracking-widest">Sucesso</span>
                       <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">${importResults.success}</span>
                    </div>
                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                       <span className="text-[8px] font-black text-amber-600 block mb-1 uppercase tracking-widest">AtenÃ§Ã£o</span>
                       <span className="text-2xl font-black text-amber-700 dark:text-amber-400">${importResults.skipped}</span>
                    </div>
                 </div>
                 
                 {importResults.processed === importResults.total && (
                    <button 
                      onClick={() => setShowImportModal(false)} 
                      className="w-full mt-8 py-4 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95"
                    >
                      FINALIZAR
                    </button>
                 )}
              </motion.div>
           </div>
        )}

        {isEditModalOpen && editingClient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="bg-white/95 dark:bg-zinc-900/95 w-full max-w-xl rounded-[32px] p-8 shadow-2xl border border-white/20 dark:border-zinc-800/50 backdrop-blur-xl"
            >
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight italic">Editar Cliente</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Atualize as informaÃƒÂ§ÃƒÂµes cadastrais</p>
                  </div>
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">RazÃƒÂ£o Social</label>
                      <input type="text" placeholder="Nome" value={editFormData.name} onChange={e => setEditFormData(prev => ({ ...prev, name: e.target.value }))} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-bold text-sm outline-none" />
                   </div>
                   
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">EndereÃ§o</label>
                      <input type="text" placeholder="EndereÃ§o" value={editFormData.address} onChange={e => setEditFormData(prev => ({ ...prev, address: e.target.value }))} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-bold text-sm outline-none" />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Telefone</label>
                        <input type="text" placeholder="Telefone" value={editFormData.phone} onChange={e => setEditFormData(prev => ({ ...prev, phone: e.target.value }))} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-bold text-sm outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">E-mail</label>
                        <input type="email" placeholder="E-mail" value={editFormData.email} onChange={e => setEditFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl font-bold text-sm outline-none" />
                      </div>
                   </div>
                </div>

                <button type="submit" disabled={submitting} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                  {submitting ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : "SALVAR ALTERAÃƒâ€¡Ãƒâ€¢ES"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

