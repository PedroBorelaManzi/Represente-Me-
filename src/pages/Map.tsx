import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Search, Filter, Layers, Navigation, 
  Map as MapIcon, Globe, Info, Clock, 
  Settings, Loader2, Plus, Target, Building2,
  ChevronRight, X, ScanEye, MousePointer2, Briefcase,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

// Mock de Leaflet / Componente de Mapa de Prospecção
// Nota: Em produção, usar uma biblioteca como React-Leaflet
export default function Map() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isAddingLocal, setIsAddingLocal] = useState(false);
  const [newLocal, setNewLocal] = useState({ name: '', cnpj: '', address: '' });
  const [activeLayer, setActiveLayer] = useState<'heatmap' | 'cluster' | 'dots'>('dots');

  const loadClients = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id);
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, [user]);

  const fetchCnpjData = async (cnpjValue: string) => {
    const cleanerCnpj = cnpjValue.replace(/[^\d]/g, '');
    if (cleanerCnpj.length !== 14) return;

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanerCnpj}`);
      if (!response.ok) throw new Error("CNPJ não encontrado");
      
      const data = await response.json();
      setNewLocal({
        ...newLocal,
        name: data.razao_social || data.nome_fantasia || "",
        address: `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio} - ${data.uf}`,
        cnpj: cleanerCnpj
      });
      toast.success('Empresa encontrada com sucesso!');
    } catch (err) {
      toast.error('CNPJ não encontrado. Preencha manualmente.');
    }
  };

  return (
    <div className='h-[calc(100vh-2rem)] flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden'>
      {/* Header do Mapa */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
           <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
             <MapIcon className="w-6 h-6" /> Localização
           </div>
           <h1 className='text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight'>Mapa de Prospecção</h1>
        </div>
        <div className='flex items-center gap-3'>
           <div className='relative'>
             <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
             <input type='text' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder='Buscar local ou cliente...' className='pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs w-full md:w-80 font-bold outline-none' />
           </div>
           <button onClick={() => setIsAddingLocal(true)} className='px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2'>
             <MapPin className='w-4 h-4' /> Marcar Local
           </button>
        </div>
      </div>

      <div className='flex-1 flex gap-6 min-h-0 relative'>
        {/* Container do Mapa (Visual) */}
        <div className='flex-1 bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-200 dark:border-zinc-800 relative overflow-hidden shadow-sm'>
           {/* Grid Background Simulating Map */}
           <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#09090b] opacity-100 pointer-events-none" 
                style={{ 
                  backgroundImage: `radial-gradient(${settings.theme === 'dark' ? '#27272a' : '#e2e8f0'} 1px, transparent 1px)`, 
                  backgroundSize: '30px 30px' 
                }} 
           />
           
           {/* Overlay Controls */}
           <div className="absolute top-6 right-6 flex flex-col gap-3">
              <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-2 rounded-2xl border border-white dark:border-zinc-800 shadow-xl flex flex-col gap-2">
                 <button onClick={() => setActiveLayer('dots')} className={cn("p-2.5 rounded-xl transition-all", activeLayer === 'dots' ? "bg-indigo-600 text-white" : "text-slate-400")}><MousePointer2 className="w-5 h-5" /></button>
                 <button onClick={() => setActiveLayer('cluster')} className={cn("p-2.5 rounded-xl transition-all", activeLayer === 'cluster' ? "bg-indigo-600 text-white" : "text-slate-400")}><Layers className="w-5 h-5" /></button>
                 <button onClick={() => setActiveLayer('heatmap')} className={cn("p-2.5 rounded-xl transition-all", activeLayer === 'heatmap' ? "bg-indigo-600 text-white" : "text-slate-400")}><ScanEye className="w-5 h-5" /></button>
              </div>
              <button className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-3 rounded-2xl border border-white dark:border-zinc-800 shadow-xl text-slate-400 hover:text-indigo-600 transition-all">
                 <Navigation className="w-5 h-5" />
              </button>
           </div>

           {/* Simulação de Pins */}
           {clients.map((c, i) => (
             <motion.div 
               key={c.id}
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ delay: i * 0.05 }}
               onClick={() => setSelectedClient(c)}
               className="absolute w-4 h-4 cursor-pointer"
               style={{ 
                 left: `${20 + (i * 12) % 60}%`, 
                 top: `${20 + (i * 8) % 60}%` 
               }}
             >
               <div className="relative group">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
                  <MapPin className="w-6 h-6 text-indigo-600 filter drop-shadow-md group-hover:scale-125 transition-transform" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                    {c.name}
                  </div>
               </div>
             </motion.div>
           ))}

           {/* Painel do Cliente Selecionado */}
           <AnimatePresence>
              {selectedClient && (
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  className="absolute top-0 right-0 h-full w-full max-w-[340px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-l border-slate-100 dark:border-zinc-800 z-30 p-8 shadow-2xl overflow-y-auto"
                >
                  <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                  
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center text-indigo-600 mb-6 font-black text-xl uppercase shadow-sm">
                    {selectedClient.name.substring(0, 1)}
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">{selectedClient.name}</h3>
                  <div className="flex items-center gap-2 mb-8">
                     <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded border border-emerald-100">Cliente Full</span>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Endereço Completo</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-start gap-2 leading-relaxed">
                          <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          {selectedClient.address || `${selectedClient.city} - Endereço Sugerido pela IA`}
                        </p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Documento</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-indigo-600" />
                          {selectedClient.cnpj}
                        </p>
                     </div>
                  </div>

                  <div className="mt-10 pt-10 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-2 gap-4">
                     <button className="py-4 bg-slate-900 dark:bg-zinc-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex flex-col items-center gap-2">
                        <Navigation className="w-5 h-5" />
                        Rota
                     </button>
                     <button className="py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex flex-col items-center gap-2 shadow-indigo-100">
                        <Target className="w-5 h-5" />
                        Visitar
                     </button>
                  </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Sidebar Informativa */}
        <div className="hidden lg:flex w-72 flex-col gap-6">
           <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100 dark:shadow-none space-y-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm"><Target className="w-5 h-5" /></div>
              <h4 className="text-sm font-black uppercase tracking-widest opacity-80">Cobertura de Campo</h4>
              <div>
                 <p className="text-4xl font-black">{clients.length}</p>
                 <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Locais Mapeados</p>
              </div>
           </div>
           
           <div className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] p-8 shadow-sm overflow-hidden flex flex-col">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2"><Clock className="w-4 h-4" /> Atividade Recente</h4>
              <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
                 {clients.slice(0, 5).map((c, idx) => (
                    <div key={idx} className="flex gap-4">
                       <div className="w-1 rounded-full bg-slate-100 dark:bg-zinc-800" />
                       <div className="min-w-0">
                          <p className="text-[9px] font-black text-slate-400 mb-0.5 tracking-tighter">HÁ POUCO</p>
                          <p className="text-[11px] font-bold text-slate-900 dark:text-zinc-100 uppercase truncate leading-none">{c.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 truncate">{c.city}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Modal Adicionar Local */}
      <AnimatePresence>
        {isAddingLocal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-md p-8 shadow-2xl relative border border-slate-100 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Marcar Novo Ponto</h2>
                <button onClick={() => setIsAddingLocal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">CNPJ para Busca</label>
                   <div className="flex gap-2">
                     <input 
                       className="flex-1 p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm" 
                       placeholder="00.000.000/0000-00" 
                       onChange={(e) => {
                         if (e.target.value.replace(/\D/g, '').length === 14) {
                           fetchCnpjData(e.target.value);
                         }
                       }}
                     />
                     <div className="w-12 h-12 flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-2xl"><ScanEye className="w-6 h-6" /></div>
                   </div>
                </div>
                <div className="space-y-1.5 pt-4">
                   <p className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2">Dados Detectados</p>
                   <div className="p-5 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                         <Building2 className="w-4 h-4 text-indigo-600" />
                         <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase truncate">{newLocal.name || 'Aguardando busca...'}</span>
                      </div>
                      <div className="flex items-start gap-3">
                         <MapPin className="w-4 h-4 text-indigo-600" />
                         <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase leading-snug">{newLocal.address || 'Endereço não detectado'}</span>
                      </div>
                   </div>
                </div>
                <button 
                  disabled={!newLocal.name}
                  onClick={() => {
                    toast.success('Ponto mapeado com sucesso!');
                    setIsAddingLocal(false);
                    loadClients();
                  }}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50 mt-6"
                >
                   Fixar no Mapa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
