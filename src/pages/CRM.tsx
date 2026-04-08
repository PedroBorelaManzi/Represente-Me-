import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Building2, Phone, Mail, FileText, ChevronRight, Filter, Plus, Trash2, Clock, CheckCircle2, TrendingUp, AlertCircle, X, Download, UserPlus, MoreHorizontal, Settings, LayoutGrid, Info, Loader2, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function CRMPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{current: number, total: number} | null>(null);

  const loadClients = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
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
  }, [user]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj?.includes(searchTerm) ||
      c.address?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, searchTerm]);

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este cliente? Todos os pedidos associados serão mantidos, mas o vínculo será perdido.')) return;
    
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', user?.id);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedClient?.id === id) setSelectedClient(null);
    } catch (err) {
      console.error('Delete Error:', err);
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
          <h1 className='text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2'>
             Clientes
          </h1>
          <p className='text-sm text-slate-500 dark:text-zinc-400 mt-1 uppercase font-bold tracking-widest'>
            Gerencie {clients.length} clientes cadastrados no sistema.
          </p>
        </div>
        
        <div className='flex items-center gap-3'>
           <div className='relative'>
             <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
             <input 
               type='text'
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder='Buscar por nome, CNPJ ou endereço...'
               className='pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm w-80 outline-none focus:ring-2 focus:ring-indigo-500'
             />
           </div>
        </div>
      </div>

      {/* Main Content: List Only (Full Width) */}
      <div className='flex-1 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 flex flex-col min-h-0 shadow-sm overflow-hidden relative'>
        <div className='p-4 border-b dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/20 flex items-center justify-between'>
          <span className='text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2'>
              <LayoutGrid className='w-3 h-3' /> LISTA DE CLIENTES
          </span>
          <span className='px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 text-[10px] font-black rounded-md'>
              {filteredClients.length}
          </span>
        </div>
        
        <div className='flex-1 overflow-y-auto p-4'>
           <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {loading ? (
                 <div className='col-span-full flex items-center justify-center h-40'><Loader2 className='w-6 h-6 text-indigo-600 animate-spin' /></div>
              ) : (
                 filteredClients.map((client) => (
                    <div 
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-6 rounded-[28px] cursor-pointer transition-all border group relative ${selectedClient?.id === client.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 hover:border-indigo-100 dark:hover:border-indigo-900 shadow-sm'}`}
                    >
                       <div className='flex items-start gap-4'>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black uppercase ${selectedClient?.id === client.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-zinc-850 text-slate-500 dark:text-zinc-400'}`}>
                             {client.name?.substring(0, 2)}
                          </div>
                          <div className='flex-1 min-w-0'>
                             <p className='text-sm font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight truncate'>{client.name}</p>
                             <p className='text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest'>CNPJ: {client.cnpj || '--- '}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} className='p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-xl transition-all'>
                             <Trash2 className='w-4 h-4' />
                          </button>
                       </div>
                       
                       <div className='mt-6 pt-6 border-t border-slate-50 dark:border-zinc-850 flex items-center justify-between'>
                          <div>
                             <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1'>Faturamento</p>
                             <p className='text-lg font-black text-indigo-600 dark:text-indigo-400'>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getClientFaturamentoTotal(client))}
                             </p>
                          </div>
                          <div className='p-2 bg-slate-50 dark:bg-zinc-850 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all'>
                             <ChevronRight className='w-4 h-4' />
                          </div>
                       </div>
                    </div>
                 ))
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
                         <p className='text-xs font-bold text-slate-600 dark:text-zinc-300 line-clamp-2'>{selectedClient.address}</p>
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

      {/* Settings Modal (Simplified) */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md'>
             <div className='bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-lg p-8 space-y-6 shadow-2xl border border-slate-100 dark:border-zinc-800'>
                <div className='flex justify-between items-center'>
                   <h2 className='text-xl font-black uppercase'>Importação Geográfica</h2>
                   <X onClick={() => setIsImportModalOpen(false)} className='cursor-pointer text-slate-400' />
                </div>
                
                <div className='p-6 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-[28px] flex flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-zinc-950/50'>
                    <Upload className='w-10 h-10 text-indigo-600' />
                    <button className='px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg'>Selecionar Arquivo</button>
                    <p className='text-[10px] text-slate-400 font-bold'>Suporte para Excel (.xlsx) e CSV</p>
                </div>
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
