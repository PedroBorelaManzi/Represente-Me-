import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, MapPin, Building2, Phone, Mail, FileText, ChevronRight, Filter, Plus, Trash2, Clock, CheckCircle2, TrendingUp, AlertCircle, X, Download, UserPlus, MoreHorizontal, Settings, LayoutGrid, Info, Loader2, Upload, FileUp, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { parseFileForCnpjs } from '../lib/clientImport';

export default function CRMPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tab State for Alerts
  const [activeTab, setActiveTab] = useState<'Todos' | 'Alerta' | 'Critico' | 'Perda'>('Todos');
  
  // Import Modal/State
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState({ current: 0, total: 0 });

  const loadClients = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch Clients
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      // Fetch Files to calculate alerts (based on CRM.tsx.old logic)
      const { data: files } = await supabase.rpc("list_user_files", { u_id: user.id });
      const filesByClient: any = {};
      if (files) {
        files.forEach((f: any) => {
          const cId = f.client_id;
          if (!filesByClient[cId]) filesByClient[cId] = [];
          filesByClient[cId].push({ file_name: f.file_name, created_at: f.created_at });
        });
      }

      const clientsWithAlerts = (clientsData || []).map((client: any) => {
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

      setClients(clientsWithAlerts);
    } catch (err) {
      console.error('Load Clients Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user, settings.categories]);

  // REFINED FILTER: Name, CNPJ, City (Ignore Address)
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const lowerSearch = searchTerm.toLowerCase();
      const nameMatch = c.name?.toLowerCase().includes(lowerSearch);
      const cnpjMatch = c.cnpj?.includes(searchTerm);
      const cityMatch = c.city?.toLowerCase().includes(lowerSearch);
      
      const searchMatch = nameMatch || cnpjMatch || cityMatch;
      
      if (!searchMatch) return false;
      
      // Alert Tab Filter
      if (activeTab === 'Todos') return true;
      return c.alerts?.some((a: any) => a.type === activeTab);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, searchTerm, activeTab]);

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este cliente? Todos os pedidos associados serão mantidos, mas o vínculo será perdido.')) return;
    
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', user?.id);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedClient?.id === id) setSelectedClient(null);
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
      if (cnpjs.length === 0) {
        toast.error('Nenhum CNPJ detectado no arquivo.');
        setIsImporting(false);
        toast.dismiss(toastId);
        return;
      }

      setImportStats({ current: 0, total: cnpjs.length });
      toast.loading(`Importando ${cnpjs.length} potenciais clientes...`, { id: toastId });

      let importedCount = 0;

      for (const cnpj of cnpjs) {
        setImportStats(prev => ({ ...prev, current: prev.current + 1 }));
        
        const isDuplicate = clients.some(c => c.cnpj === cnpj);
        if (isDuplicate) continue;

        try {
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
          if (response.ok) {
            const data = await response.json();
            
            const { error } = await supabase.from('clients').insert([{
              user_id: user.id,
              name: data.razao_social || data.nome_fantasia || 'Cliente Importado',
              cnpj: cnpj,
              city: data.municipio || "",
              address: `${data.logradouro || ""}, ${data.numero || "S/N"} - ${data.bairro || ""}, ${data.municipio || ""} - ${data.uf || ""}`.trim(),
              status: 'Ativo',
              last_contact: new Date().toISOString().split('T')[0]
            }]);

            if (!error) importedCount++;
          } else {
             const { error } = await supabase.from('clients').insert([{
               user_id: user.id,
               name: `Cliente ${cnpj.substring(0, 4)}`,
               cnpj: cnpj,
               status: 'Ativo',
               last_contact: new Date().toISOString().split('T')[0]
             }]);
             if (!error) importedCount++;
          }
        } catch (err) {
          console.error('Import Step Error:', err);
        }
      }

      toast.success(`Importação concluída! ${importedCount} novos clientes adicionados.`, { id: toastId });
      loadClients();
    } catch (err: any) {
      toast.error('Erro na importação: ' + err.message, { id: toastId });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getClientFaturamentoTotal = (client: any) => {
    const fat = client.faturamento || {};
    return Object.values(fat).reduce((sum: number, val: any) => sum + Number(val), 0) as number;
  };

  return (
    <div className='h-[calc(100vh-2rem)] flex flex-col gap-6'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-3 uppercase'>
             Gestão de Clientes
          </h1>
        </div>
        
        <div className='flex items-center gap-3'>
           <div className='relative'>
             <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
             <input 
               type='text'
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder='Buscar por nome, CNPJ ou cidade...'
               className='pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs w-full md:w-80 outline-none focus:ring-2 focus:ring-indigo-500 font-bold'
             />
           </div>

           <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".pdf,.xlsx,.xls,.txt,image/*" />
           
           <button 
             onClick={() => fileInputRef.current?.click()}
             disabled={isImporting}
             className='px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2'
           >
             {isImporting ? <Loader2 className='w-4 h-4 animate-spin' /> : <FileUp className='w-4 h-4' />}
             {isImporting ? `Importando` : 'Importar Lista'}
           </button>
        </div>
      </div>

      {/* Main Content: Client List (Full Width) */}
      <div className='flex-1 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 flex flex-col min-h-0 shadow-sm overflow-hidden relative'>
        
        {/* Tabs next to search matches filter */}
        <div className='px-4 pt-4 border-b dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/20 flex items-center gap-4'>
          {(['Todos', 'Alerta', 'Critico', 'Perda'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
            >
              {tab} <span className="ml-1 opacity-50">({clients.filter(c => tab === 'Todos' ? true : c.alerts?.some((a: any) => a.type === tab)).length})</span>
            </button>
          ))}
        </div>
        
        <div className='flex-1 overflow-y-auto'>
           {loading ? (
              <div className='flex items-center justify-center h-40'><Loader2 className='w-6 h-6 text-indigo-600 animate-spin' /></div>
           ) : (
              <div className='divide-y divide-slate-100 dark:divide-zinc-850'>
                 {filteredClients.map((client) => (
                    <div 
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-zinc-850/50 flex items-center gap-4 group ${selectedClient?.id === client.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}
                    >
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase ${selectedClient?.id === client.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-zinc-850 text-slate-500 dark:text-zinc-400'}`}>
                          {client.name?.substring(0, 2)}
                       </div>
                       
                       <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2'>
                             <p className='text-sm font-black text-slate-900 dark:text-zinc-100 uppercase truncate text-ellipsis overflow-hidden'>{client.name}</p>
                             {client.alerts?.length > 0 && (
                               <span className="flex gap-1">
                                 {client.alerts.slice(0, 1).map((a: any, i: number) => (
                                   <span key={i} className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${a.type === 'Perda' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                     {a.type}: {a.days}D
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
                                {client.city ? `🏙️ ${client.city}` : 'Cidade não informada'}
                             </p>
                          </div>
                       </div>

                       <div className='text-right mr-4 hidden md:block'>
                          <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5'>Faturamento</p>
                          <p className='text-sm font-black text-indigo-600 dark:text-indigo-400'>
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getClientFaturamentoTotal(client))}
                          </p>
                       </div>

                       <div className='flex items-center gap-2'>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} className='p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-all'>
                             <Trash2 className='w-4 h-4' />
                          </button>
                          <ChevronRight className='w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors' />
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>
      </div>

      {/* Floating Client Detail Overlay (When selected) */}
      <AnimatePresence>
        {selectedClient && (
           <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md'>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className='w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-2xl p-8'
              >
                 <div className='flex justify-between items-start mb-8'>
                    <div className='flex items-center gap-6'>
                       <div className='w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-xl font-black uppercase'>
                          {selectedClient.name?.substring(0, 2)}
                       </div>
                       <div>
                          <h3 className='text-2xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-none'>{selectedClient.name}</h3>
                          <div className='flex items-center gap-2 mt-2'>
                             <span className='px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 text-[10px] font-black uppercase rounded-lg'>{selectedClient.status || 'ATIVO'}</span>
                             <span className='text-[10px] font-bold text-slate-400 uppercase'>CNPJ: {selectedClient.cnpj}</span>
                          </div>
                       </div>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className='p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl text-slate-400'><X className='w-6 h-6'/></button>
                 </div>

                 <div className='grid grid-cols-2 gap-6 mb-8'>
                    <div className='p-6 bg-slate-50 dark:bg-zinc-950/40 rounded-[32px] border border-slate-100 dark:border-zinc-850'>
                       <span className='text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2'>Faturamento Acumulado</span>
                       <p className='text-3xl font-black text-indigo-600 dark:text-indigo-400 italic'>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getClientFaturamentoTotal(selectedClient))}
                       </p>
                    </div>
                    <div className='p-6 bg-slate-50 dark:bg-zinc-950/40 rounded-[32px] border border-slate-100 dark:border-zinc-850'>
                       <span className='text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2'>Localização</span>
                       <p className='text-xs font-bold text-slate-600 dark:text-zinc-300 line-clamp-2 uppercase'>{selectedClient.address}</p>
                       <p className='text-[10px] font-black text-indigo-500 mt-2 uppercase underline'>{selectedClient.city}</p>
                    </div>
                 </div>

                 <div className='flex gap-4'>
                    <button className='flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all'>Visualizar no Mapa</button>
                    <button className='flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all'>Ver Histórico Geral</button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
