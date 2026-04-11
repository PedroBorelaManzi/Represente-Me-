import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, Plus, Search, Filter, FileUp, 
  Loader2, ChevronRight, Building2, Calendar,
  TrendingDown, TrendingUp, DollarSign, Package,
  MoreVertical, Trash2, Eye, Download, Sparkles,
  ArrowRight, CheckCircle2, AlertCircle, X, ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { processOrderFile } from '../lib/orderProcessor';
import UpgradeModal from '../components/UpgradeModal';

export default function Pedidos() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<'lote' | 'empresas'>('lote');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBasicPlan = settings.subscription_plan === 'Acesso Exclusivo';

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, clients(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user) return;

    if (isBasicPlan && files.length > 1) {
       setUpgradeFeature('lote');
       setIsUpgradeModalOpen(true);
       return;
    }

    setIsProcessing(true);
    const toastId = toast.loading(`Processando ${files.length} arquivo(s)...`);

    try {
      for (const file of files) {
        const result = await processOrderFile(file, user.id);
        if (result.success) {
          toast.success(`Pedido de ${result.clientName} processado!`);
        } else {
          toast.error(`Erro no arquivo ${file.name}: ${result.error}`);
        }
      }
      loadOrders();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro crítico ao processar arquivos.');
    } finally {
      setIsProcessing(false);
      toast.dismiss(toastId);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredOrders = orders.filter(o => 
    o.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
            <ShoppingCart className="w-6 h-6" /> Vendas
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Pedidos & Faturamento</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar pedidos..." 
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs w-full md:w-64 font-bold outline-none" 
            />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            multiple={!isBasicPlan}
            className="hidden" 
            accept=".pdf,.xlsx,.xls,.docx,image/*" 
          />
          <button 
            onClick={handleUploadClick}
            disabled={isProcessing}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            {isProcessing ? 'Processando...' : 'Lançar Pedidos'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center gap-4">
             <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl text-emerald-600"><TrendingUp className="w-6 h-6" /></div>
             <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Faturamento Total</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orders.reduce((acc, o) => acc + (o.total_amount || 0), 0))}</p>
             </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center gap-4">
             <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl text-indigo-600"><Package className="w-6 h-6" /></div>
             <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total de Pedidos</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{orders.length}</p>
             </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 rounded-[32px] shadow-lg flex items-center gap-4 text-white">
             <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md"><Sparkles className="w-6 h-6 text-amber-300" /></div>
             <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">IA Agentic</p>
                <p className="text-xs font-bold leading-tight truncate">Pedidos extraídos com Gemini 1.5</p>
             </div>
          </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b dark:border-zinc-850 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/20">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Histórico de Lançamentos</h3>
             <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest"><Clock className="w-4 h-4" /> Últimos 100 registros</div>
          </div>
          
          <div className="overflow-x-auto min-h-[400px]">
             <table className="w-full text-left">
                <thead>
                   <tr className="border-b dark:border-zinc-850">
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Representada</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Data</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                   {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-zinc-850/50 transition-colors group">
                         <td className="px-8 py-5">
                            <p className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase truncate max-w-[200px]">{order.clients?.name || 'Cliente Desconhecido'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 truncate max-w-[200px]">{order.file_name}</p>
                         </td>
                         <td className="px-8 py-5">
                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg border border-indigo-100 dark:border-indigo-800">
                               {order.company_name || 'Geral'}
                            </span>
                         </td>
                         <td className="px-8 py-5 text-xs font-bold text-slate-600 dark:text-zinc-400">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                         </td>
                         <td className="px-8 py-5 text-sm font-black text-slate-900 dark:text-zinc-100">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount || 0)}
                         </td>
                         <td className="px-8 py-5 text-right">
                            <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                         </td>
                      </tr>
                   ))}
                   {filteredOrders.length === 0 && !loading && (
                      <tr>
                         <td colSpan={5} className="py-20 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-30">
                               <Package className="w-12 h-12" />
                               <p className="text-xs font-black uppercase tracking-[0.2em]">Nenhum pedido encontrado</p>
                            </div>
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
      </div>
      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} feature={upgradeFeature} />
    </div>
  );
}
