import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, MapPin, Phone, Mail, Globe, ChevronRight, LayoutGrid, List, Filter, Loader2, ArrowUpRight, TrendingUp, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function Empresas() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', cnpj: '', city: '', color: '#4f46e5' });
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadCompanies = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    setCompanies(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCompanies();
  }, [user]);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('companies')
      .insert([{ ...newCompany, user_id: user.id }]);

    if (error) {
      toast.error('Erro ao adicionar representada');
    } else {
      toast.success('Representada adicionada!');
      setIsModalOpen(false);
      setNewCompany({ name: '', cnpj: '', city: '', color: '#4f46e5' });
      loadCompanies();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
            <Building2 className="w-6 h-6" /> Gestão
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Representadas</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
             <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600" : "text-slate-400")}><LayoutGrid className="w-4 h-4" /></button>
             <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600" : "text-slate-400")}><List className="w-4 h-4" /></button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova Representada
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className={cn(
           "grid gap-6",
           viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {companies.map((company) => (
            <motion.div
              layout
              key={company.id}
              className={cn(
                 "bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative",
                 viewMode === 'list' && "flex items-center gap-6"
              )}
            >
              <div 
                className="absolute top-0 left-0 w-full h-1.5" 
                style={{ backgroundColor: company.color }} 
              />
              
              <div className={cn(
                 "w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black uppercase text-white shadow-lg shrink-0",
                 viewMode === 'list' ? "w-12 h-12" : "mb-6"
              )} style={{ backgroundColor: company.color }}>
                {company.name.substring(0, 1)}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight truncate mb-1">
                   {company.name}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   <div className="flex items-center gap-1.5"><Briefcase className="w-3 h-3" /> {company.cnpj}</div>
                   {company.city && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {company.city}</div>}
                </div>
              </div>

              {viewMode === 'grid' && (
                 <div className="mt-8 pt-6 border-t border-slate-50 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Status</span>
                       <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg">Ativa</span>
                    </div>
                    <button className="p-3 bg-slate-50 dark:bg-zinc-850 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all group/btn">
                       <ArrowUpRight className="w-5 h-5 group-hover/btn:rotate-45 transition-transform" />
                    </button>
                 </div>
              )}
              
              {viewMode === 'list' && (
                 <button className="p-3 bg-slate-50 dark:bg-zinc-850 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all">
                    <ChevronRight className="w-5 h-5" />
                 </button>
              )}
            </motion.div>
          ))}
          
          {companies.length === 0 && (
            <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-zinc-950/30 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-zinc-800">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhuma representada cadastrada.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Nova Representada */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-md p-8 shadow-2xl relative border border-slate-100 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Nova Representada</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleAddCompany} className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome da Empresa</label>
                   <input required value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm" placeholder="Ex: Nome da Fábrica" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">CNPJ</label>
                      <input value={newCompany.cnpj} onChange={e => setNewCompany({...newCompany, cnpj: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm" placeholder="00.000.000/0000-00" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cidade Base</label>
                      <input value={newCompany.city} onChange={e => setNewCompany({...newCompany, city: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm" placeholder="Cidade - UF" />
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cor de Identificação</label>
                   <div className="flex gap-2 p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                      {['#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2'].map(c => (
                         <button key={c} type="button" onClick={() => setNewCompany({...newCompany, color: c})} className={cn("w-8 h-8 rounded-lg transition-transform", newCompany.color === c ? "scale-110 shadow-lg ring-2 ring-white" : "opacity-60 hover:opacity-100")} style={{ backgroundColor: c }} />
                      ))}
                   </div>
                </div>
                <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50 mt-4">
                   {saving ? 'Criando...' : 'Cadastrar Representada'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
