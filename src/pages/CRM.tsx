import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Search, Filter, Plus, ChevronRight, 
  Building2, MapPin, Phone, Mail, Globe, 
  Calendar, ShoppingCart, TrendingUp, AlertCircle,
  MoreVertical, FileUp, Loader2, Trash2, CheckCircle2,
  AlertTriangle, Clock, X, BarChart3, Star, Download,
  ExternalLink, Layers, LayoutGrid, List, SlidersHorizontal
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import UpgradeModal from '../components/UpgradeModal';
import { parseFileForCnpjs } from '../lib/clientImport';

export default function CRM() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'Todos' | 'Alerta' | 'Crítico' | 'Perda'>('Todos');
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState({ current: 0, total: 0 });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<'importacao' | 'empresas'>('importacao');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBasicPlan = settings.subscription_plan === 'Acesso Exclusivo';

  const loadClients = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id);

      const { data: filesData } = await supabase
        .from('orders')
        .select('client_id, file_name, created_at')
        .eq('user_id', user.id);

      const filesByClient: any = {};
      if (filesData) {
        filesData.forEach((f: any) => {
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
          else if (days >= (settings.critico_days || 90)) alerts.push({ company: cat, type: "Crítico", days });
          else if (days >= (settings.alerta_days || 45)) alerts.push({ company: cat, type: "Alerta", days });
        }
        return { ...client, alerts: alerts.sort((a, b) => b.days - a.days) };
      });

      setClients(clientsWithAlerts);
    } catch (err) {
      console.error('CRM Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadClients();
  }, [user, settings.categories]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const lowerSearch = searchTerm.toLowerCase();
      const match = c.name?.toLowerCase().includes(lowerSearch) || c.cnpj?.includes(searchTerm) || c.city?.toLowerCase().includes(lowerSearch);
      if (!match) return false;
      if (activeTab === 'Todos') return true;
      return c.alerts?.some((a: any) => a.type === activeTab);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, searchTerm, activeTab]);

  const handleImportClick = () => {
    if (isBasicPlan && clients.length >= 50) {
       setUpgradeFeature('importacao');
       setIsUpgradeModalOpen(true);
       return;
    }
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsImporting(true);
    const toastId = toast.loading('Processando arquivo...');

    try {
      const cnpjs = await parseFileForCnpjs(file);
      if (cnpjs.length === 0) {
        toast.error('Nenhum CNPJ detectado.');
        setIsImporting(false);
        toast.dismiss(toastId);
        return;
      }

      setImportStats({ current: 0, total: cnpjs.length });
      let importedCount = 0;

      for (const cnpj of cnpjs) {
        setImportStats(prev => ({ ...prev, current: prev.current + 1 }));
        if (clients.some(c => c.cnpj === cnpj)) continue;

        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        const data = response.ok ? await response.json() : null;
        
        await supabase.from('clients').insert([{
          user_id: user.id,
          name: data?.razao_social || data?.nome_fantasia || `Cliente ${cnpj.substring(0, 4)}`,
          cnpj,
          city: data?.municipio || "",
          address: data ? `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio} - ${data.uf}` : "",
          status: 'Ativo',
          last_contact: new Date().toISOString().split('T')[0]
        }]);
        importedCount++;
      }

      toast.success(`Importação concluída! ${importedCount} novos clientes.`, { id: toastId });
      loadClients();
    } catch (err: any) {
      toast.error('Erro: ' + err.message, { id: toastId });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className='h-[calc(100vh-2rem)] flex flex-col gap-6 animate-in fade-in duration-500'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
           <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
             <Users className="w-6 h-6" /> CRM
           </div>
           <h1 className='text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight'>Gestão de Clientes</h1>
        </div>
        <div className='flex items-center gap-3'>
           <div className='relative'>
             <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
             <input type='text' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder='Buscar clientes...' className='pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs w-full md:w-80 font-bold outline-none' />
           </div>
           <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".pdf,.xlsx,.xls,.txt,image/*" />
           <button onClick={handleImportClick} disabled={isImporting} className='px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2'>
             {isImporting ? <Loader2 className='w-4 h-4 animate-spin' /> : <FileUp className='w-4 h-4' />}
             {isImporting ? 'Importando' : 'Importar Lista'}
           </button>
        </div>
      </div>

      <div className='flex-1 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden relative shadow-sm'>
        <div className='px-6 pt-6 border-b dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/20 flex items-center gap-4'>
           {(['Todos', 'Alerta', 'Crítico', 'Perda'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("pb-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative overflow-hidden", activeTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600")}>
              {tab} <span className="ml-1 opacity-50">({clients.filter(c => tab === 'Todos' ? true : c.alerts?.some((a: any) => a.type === tab)).length})</span>
            </button>
          ))}
        </div>
        
        <div className='flex-1 overflow-y-auto px-4 custom-scrollbar'>
           {loading ? <div className='flex items-center justify-center py-20'><Loader2 className='w-8 h-8 animate-spin text-indigo-600' /></div> : (
              <div className='divide-y divide-slate-100 dark:divide-zinc-850 py-4'>
                 {filteredClients.map((client) => (
                    <motion.div 
                      key={client.id} 
                      onClick={() => navigate(`/dashboard/clientes/${client.id}`)} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 flex items-center gap-4 group transition-all rounded-3xl"
                    >
                       <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black uppercase bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">{client.name?.substring(0, 2)}</div>
                       <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 flex-wrap'>
                             <p className='text-sm font-black text-slate-900 dark:text-zinc-100 uppercase truncate leading-none'>{client.name}</p>
                             {client.alerts?.length > 0 && (
                                <span className={cn(
                                   "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border",
                                   client.alerts[0].type === 'Perda' ? 'bg-red-50 text-red-600 border-red-100' :
                                   client.alerts[0].type === 'Crítico' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                   'bg-amber-50 text-amber-600 border-amber-100'
                                )}>
                                   {client.alerts[0].type}: {client.alerts[0].days}D
                                </span>
                             )}
                          </div>
                          <p className='text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1.5 flex items-center gap-2'>
                             <span className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{client.cnpj}</span> 
                             {client.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {client.city}</span>}
                          </p>
                       </div>
                       <ChevronRight className='w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors' />
                    </motion.div>
                 ))}
                 {filteredClients.length === 0 && (
                   <div className="text-center py-20 flex flex-col items-center gap-4">
                     <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-full"><Users className="w-8 h-8 text-slate-300" /></div>
                     <p className="text-sm font-bold text-slate-400 italic">Nenhum cliente encontrado.</p>
                   </div>
                 )}
              </div>
           )}
        </div>
      </div>
      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} feature={upgradeFeature} />
    </div>
  );
}
