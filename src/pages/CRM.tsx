import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { Search, MapPin, Building2, Phone, Mail, FileText, ChevronRight, Filter, Plus, Trash2, Clock, CheckCircle2, TrendingUp, AlertCircle, X, Download, UserPlus, MoreHorizontal, Settings, LayoutGrid, Info, Loader2, Upload, FileUp, Activity, ChevronDown } from 'lucide-react';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { parseFileForCnpjs } from '../lib/clientImport';
import { getHighPrecisionCoordinates } from '../lib/geminiGeocoding';

export default function CRMPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
      const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'Todos' | 'Alerta' | 'Crítico' | 'Perda'>('Todos');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "Alerta") setActiveTab("Alerta");
    else if (tab === "Critico" || tab === "Crítico") setActiveTab("Crítico");
    else if (tab === "Perda") setActiveTab("Perda");
  }, [location.search]);
  
  
  
  

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tab State for Alerts
  
  
  // Import Modal/State
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState({ current: 0, total: 0 });

  // Pagination for performance on mobile
  const [displayLimit, setDisplayLimit] = useState(40);

  const loadClients = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // Phase 1: Fetch Basic Client Data (Fast)
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('id, name, cnpj, city, address, status, last_contact, created_at')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Initialize with empty alerts
      const initialClients = (clientsData || []).map(c => ({ ...c, alerts: [] }));
      setClients(initialClients);
      setLoading(false); // List is now visible to user

      // Phase 2: Fetch Files & Calculate Alerts in background
      setLoadingAlerts(true);
      
      let files: any[] = [];
      try {
        const { data: filesData } = await supabase.rpc("list_user_files", { u_id: user.id });
        files = filesData || [];
      } catch (err) {
        console.error("RPC Error:", err);
      }
      
      if (files.length > 0) {
        const filesByClient: any = {};
        files.forEach((f: any) => {
          const cId = f.client_id;
          if (!filesByClient[cId]) filesByClient[cId] = [];
          filesByClient[cId].push({ file_name: f.file_name, created_at: f.created_at });
        });

        const categoryLookup = new Map();
        settings?.categories?.forEach((c: string) => categoryLookup.set(c.toLowerCase(), c));

        setClients(prevClients => prevClients.map((client: any) => {
          const clientFiles = filesByClient[client.id] || [];
          const lastDates: any = {};
          
          clientFiles.forEach((f: any) => {
            const parts = f.file_name.split("___");
            if (parts.length > 1) {
              const rawCatLower = parts[0].toLowerCase();
              const cat = categoryLookup.get(rawCatLower) || parts[0];
              const date = new Date(f.created_at).getTime();
              if (!lastDates[cat] || date > lastDates[cat]) lastDates[cat] = date;
            }
          });

          const alerts: any[] = [];
          const today = new Date().getTime();
          for (const [cat, date] of Object.entries(lastDates)) {
            const days = Math.floor((today - (date as number)) / (1000 * 60 * 60 * 24));
            if (days >= (settings?.perda_days || 365)) alerts.push({ company: cat, type: "Perda", days });
            else if (days >= (settings?.critico_days || 90)) alerts.push({ company: cat, type: "Crítico", days });
            else if (days >= (settings?.alerta_days || 45)) alerts.push({ company: cat, type: "Alerta", days });
          }
          return { ...client, alerts: alerts.sort((a, b) => b.days - a.days) };
        }));
      }
    } catch (err) {
      console.error('Load Clients Error:', err);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    logAudit('ACCESS_CLIENT_LIST');
    if (user && settings) {
      loadClients();
    }
  }, [user, settings?.categories]);

  // Reset display limit when searching or changing tabs
  useEffect(() => {
    setDisplayLimit(40);
  }, [searchTerm, activeTab]);

  const filteredClients = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const result = (clients || []).filter(c => {
      const searchMatch = !searchTerm || 
        (c.name || "").toLowerCase().includes(lowerSearch) || 
        (c.cnpj || "").includes(searchTerm) || 
        (c.city || "").toLowerCase().includes(lowerSearch);
      
      if (!searchMatch) return false;
      
      if (activeTab === 'Todos') return true;
      return c.alerts?.some((a: any) => a.type === activeTab);
    });

    return result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [clients, searchTerm, activeTab]);

  const displayClients = useMemo(() => {
    return filteredClients.slice(0, displayLimit);
  }, [filteredClients, displayLimit]);

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este cliente? Todos os pedidos associados serão mantidos, mas o vínculo será perdido.')) return;
    
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', user?.id);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      toast.success('Cliente removido com sucesso.');
    } catch (err) {
      console.error('Delete Error:', err);
      toast.error('Erro ao remover cliente.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    const toastId = toast.loading('Processando arquivo via IA...');

    try {
      const cnpjs = await parseFileForCnpjs(file);
      
      const importPath = `${user.id}/imports/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      await supabase.storage.from('client_vault').upload(importPath, file);
      if (cnpjs.length === 0) {
        toast.error('Nenhum CNPJ detectado no arquivo.');
        setIsImporting(false);
        toast.dismiss(toastId);
        return;
      }

      setImportStats({ current: 0, total: cnpjs.length });
      toast.loading(`Importando ${cnpjs.length} potenciais clientes...`, { id: toastId });

      let importedCount = 0;
      const processedLocal = new Set();
      
      for (const cnpj of cnpjs) {
        setImportStats(prev => ({ ...prev, current: prev.current + 1 }));
        if (processedLocal.has(cnpj)) continue;
        processedLocal.add(cnpj);

        try {
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
          let clientData: any = {};
          
          if (response.ok) {
            const data = await response.json();
            clientData = {
              name: data.razao_social || data.nome_fantasia || 'Cliente Importado',
              city: data.municipio || "",
              address: `${data.logradouro || ""}, ${data.numero || "S/N"} - ${data.bairro || ""}, ${data.municipio || ""} - ${data.uf || ""}`.trim(),
            };
          } else {
             // Fallback logic kept from original
             clientData = { name: `Cliente ${cnpj.substring(0, 4)}`, city: "", address: "" };
          }

          const coords = await getHighPrecisionCoordinates(clientData.address, clientData.name, cnpj);

          let clientId = null;
          const existing = clients.find(c => c.cnpj === cnpj);
          
          if (existing) {
            clientId = existing.id;
          } else {
            const { data, error: insertError } = await supabase.from('clients').insert([{
              user_id: user.id,
              name: clientData.name,
              cnpj: cnpj,
              city: clientData.city,
              address: clientData.address,
              lat: coords?.lat || null,
              lng: coords?.lng || null,
              status: 'Ativo',
              last_contact: new Date().toISOString().split('T')[0]
            }]).select('id').single();
            
            if (!insertError && data) {
              clientId = data.id;
              importedCount++;
            }
          }

          if (clientId) {
            await supabase.from('orders').insert([{
              user_id: user.id,
              client_id: clientId,
              category: "Lista Importada",
              value: 0,
              file_path: importPath,
              file_name: file.name
            }]);
          }
        } catch (err) {
          console.error('Import Step Error:', err);
        }
      }

      toast.success(`Importação concluída! ${importedCount} novos clientes adicionados.`, { id: toastId });
      loadClients();
    } catch (err: any) {
      toast.error('Erro na Importação: ' + err.message, { id: toastId });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className='h-[calc(100dvh-2rem)] flex flex-col gap-6'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-3 uppercase'>
             Gestão de Clientes
          </h1>
        </div>
        
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3'>
           <div className='relative flex-1 sm:flex-none'>
             <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
             <input 
               type='text'
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder='Buscar por nome, CNPJ ou cidade...'
               className='pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs w-full md:w-80 outline-none focus:ring-2 focus:ring-emerald-500 font-bold'
             />
           </div>

           <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".pdf,.xlsx,.xls,.txt,image/*" />
           
           <button 
             onClick={() => fileInputRef.current?.click()}
             disabled={isImporting}
             className='px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2'
           >
             {isImporting ? <Loader2 className='w-4 h-4 animate-spin' /> : <FileUp className='w-4 h-4' />}
             {isImporting ? `Importando` : 'Importar Lista'}
           </button>
        </div>
      </div>

      {/* Main Content: Client List (Full Width) */}
      <div className='flex-1 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 flex flex-col min-h-0 shadow-sm overflow-hidden relative'>
        
        {/* Tabs next to search matches filter */}
        <div className='px-4 pt-4 border-b dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/20 flex items-center gap-4 overflow-x-auto no-scrollbar'>
          {(['Todos', 'Alerta', 'Crítico', 'Perda'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === tab ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
            >
              {tab} <span className="ml-1 opacity-50">({clients.filter(c => tab === 'Todos' ? true : c.alerts?.some((a: any) => a.type === tab)).length})</span>
            </button>
          ))}
          {loadingAlerts && (
             <div className="flex items-center gap-2 ml-auto pr-4">
                <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                <span className="text-[9px] font-black uppercase text-emerald-600/60 tracking-widest">Sincronizando Alertas...</span>
             </div>
          )}
        </div>
        
        <div className='flex-1 overflow-y-auto custom-scrollbar'>
           {loading ? (
              <div className='flex items-center justify-center h-40'><Loader2 className='w-6 h-6 text-emerald-600 animate-spin' /></div>
           ) : (
              <div className='divide-y divide-slate-100 dark:divide-zinc-850'>
                 {displayClients.map((client) => (
                    <div 
                      key={client.id}
                      onClick={() => navigate(`/dashboard/clientes/${client.id}`)}
                      className="p-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-zinc-850/50 flex items-center gap-4 group"
                    >
                       <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase bg-slate-100 dark:bg-zinc-850 text-slate-500 dark:text-zinc-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                          {client.name?.substring(0, 2)}
                       </div>
                       
                       <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2'>
                             <p className='text-sm font-black text-slate-900 dark:text-zinc-100 uppercase truncate pr-1'>{client.name}</p>
                             {client.alerts?.length > 0 && (
                               <span className="flex gap-1 shrink-0">
                                 {client.alerts.filter((a: any) => activeTab === 'Todos' ? true : a.type === activeTab).slice(0, 1).map((a: any, i: number) => (
                                   <span key={i} className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase border flex items-center gap-1", a.type === 'Perda' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:border-red-900/40' : a.type === 'Crítico' ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/30 dark:border-orange-900/40' : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40') }>
                                     <span className="opacity-60">{a.company}</span> <span className="w-1 h-1 rounded-full bg-current opacity-30" /> <span>{a.type}: {a.days}D</span>
                                   </span>
                                 ))}
                               </span>
                             )}
                          </div>
                          <div className='flex items-center gap-2 mt-0.5'>
                             <span className='px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-[8px] font-bold text-slate-500 dark:text-zinc-400 rounded-md uppercase whitespace-nowrap tracking-widest'>
                                {client.cnpj || 'Sem CNPJ'}
                             </span>
                             <p className='text-[10px] text-slate-400 dark:text-zinc-500 truncate uppercase font-bold tracking-tight'>
                                {client.city ? `📍 ${client.city}` : 'Cidade não informada'}
                             </p>
                          </div>
                       </div>

                       <div className='flex items-center gap-2 shrink-0'>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} className='p-2 md:opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-all'>
                             <Trash2 className='w-4 h-4' />
                          </button>
                          <ChevronRight className='w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors' />
                       </div>
                    </div>
                 ))}
                 
                 {filteredClients.length > displayLimit && (
                    <button 
                      onClick={() => setDisplayLimit(prev => prev + 40)}
                      className="w-full py-8 text-[11px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-3 border-t border-slate-100 dark:border-zinc-850"
                    >
                       <ChevronDown className="w-4 h-4" />
                       Carregar mais clientes ({filteredClients.length - displayLimit} restantes)
                    </button>
                 )}

                 {filteredClients.length === 0 && (
                   <div className="p-12 text-center opacity-40">
                     <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                     <p className="text-sm font-black uppercase tracking-widest">Nenhum cliente encontrado</p>
                   </div>
                 )}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
