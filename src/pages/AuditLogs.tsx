import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Clock, User, Info, Calendar, ChevronRight, Search, Filter, ShieldAlert, Activity, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  if (user?.email !== "pedroborelamanzi@gmail.com") return <div className="p-8 text-center text-slate-500 uppercase font-black text-xs tracking-widest">Acesso Restrito</div>;

  useEffect(() => {
    if (user) loadLogs();
  }, [user]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Erro ao carregar logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(log.metadata).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-10 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">Logs de Auditoria</h1>
          </div>
          <p className="text-slate-500 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-widest px-1">Vigilancia de seguranca e acessos sensiveis</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="BUSCAR AÇÕES/DADOS..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all w-64 md:w-80 shadow-sm"
            />
          </div>
          <button onClick={loadLogs} className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800 text-slate-500 hover:text-indigo-600 transition-all">
            <Activity className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4">
        <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden ring-1 ring-slate-200/50 dark:ring-zinc-800/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800/50">
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Evento</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Informacoes</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Data/Hora</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-zinc-800/30">
                <AnimatePresence mode="popLayout">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-32">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizando registros...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-32">
                        <div className="flex flex-col items-center gap-4 text-slate-300 dark:text-zinc-700">
                          <ShieldCheck className="w-12 h-12" />
                          <p className="text-[11px] font-black uppercase tracking-[0.2em]">Nenhum atividade atipica registrada</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <motion.tr 
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="group hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${log.action.includes('DETAILS') ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                            <span className="text-[11px] font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            {log.metadata && Object.entries(log.metadata).map(([key, val]: [string, any]) => (
                               <div key={key} className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{key}:</span>
                                <span className="text-[9px] font-black text-slate-600 dark:text-zinc-400 uppercase">{String(val)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-xl">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-700 dark:text-zinc-300">{new Date(log.created_at).toLocaleDateString('pt-BR')}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button className="p-2 rounded-xl text-slate-300 hover:text-indigo-600 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
