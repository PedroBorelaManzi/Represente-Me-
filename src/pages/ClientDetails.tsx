import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, Phone, Mail, Globe, 
  Calendar, ShoppingCart, TrendingUp, AlertCircle,
  FileText, History, Trash2, ArrowLeft, 
  MoreVertical, Edit3, User, Search,
  Briefcase, CheckCircle2, AlertTriangle, Clock,
  Loader2, Badge, ChevronRight, PieChart, Star,
  DollarSign, Package, TrendingDown, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'geral' | 'pedidos' | 'indicadores'>('geral');

  const loadData = async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      setClient(clientData);
      setOrders(ordersData || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar detalhes do cliente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, user]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  if (!client) return <div>Cliente no encontrado</div>;

  const totalSpent = orders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
  const ordersCount = orders.length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all"><ArrowLeft className="w-5 h-5" /></button>
           <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl flex items-center justify-center text-2xl font-black text-white uppercase shadow-lg shadow-indigo-200 dark:shadow-none">{client.name.substring(0, 1)}</div>
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{client.name}</h1>
                 <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg border border-emerald-100">Ativo</span>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                 <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {client.cnpj}</span>
                 {client.city && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {client.city}</span>}
              </p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <button className="px-6 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"><Edit3 className="w-4 h-4" /> Editar Cadastro</button>
           <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Vincular Pedido</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[32px] p-6 shadow-sm overflow-hidden relative">
               <div className="absolute top-0 right-0 p-4 opacity-5"><Layers className="w-24 h-24" /></div>
               <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2"><User className="w-3 h-3" /> Info Comercial</h3>
               <div className="space-y-6">
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Representada Atual</p>
                     <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Geral / Multimarcas</p>
                  </div>
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereo</p>
                     <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 leading-relaxed">{client.address || 'No informado'}</p>
                  </div>
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ltimo Contato</p>
                     <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-zinc-100">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        {new Date(client.last_contact).toLocaleDateString('pt-BR')}
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100 dark:shadow-none space-y-6">
               <div>
                  <h4 className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">Total de Vendas</h4>
                  <p className="text-3xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalSpent)}</p>
               </div>
               <div className="pt-6 border-t border-white/20">
                  <h4 className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">Volume de Pedidos</h4>
                  <p className="text-2xl font-black">{ordersCount} <span className="text-xs opacity-60">entries</span></p>
               </div>
            </div>
         </div>

         <div className="lg:col-span-3">
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[32px] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
               <div className="px-8 pt-8 border-b dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/20 flex items-center gap-8">
                  <button onClick={() => setActiveTab('geral')} className={cn("pb-6 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'geral' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400")}>Geral & Timeline</button>
                  <button onClick={() => setActiveTab('pedidos')} className={cn("pb-6 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'pedidos' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400")}>Pedidos ({orders.length})</button>
                  <button onClick={() => setActiveTab('indicadores')} className={cn("pb-6 px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'indicadores' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400")}>BI & Analytics</button>
               </div>

               <div className="p-8">
                  {activeTab === 'geral' && (
                     <div className="space-y-8">
                        <div className="flex items-center justify-between">
                           <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Linha do Tempo</h4>
                           <button className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Ver tudo</button>
                        </div>
                        <div className="relative space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-zinc-800">
                           {orders.slice(0, 5).map((order) => (
                              <div key={order.id} className="relative pl-10 flex items-start gap-4">
                                 <div className="absolute left-0 w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border-2 border-indigo-600 flex items-center justify-center z-10">
                                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
                                 </div>
                                 <div className="flex-1 p-5 bg-slate-50 dark:bg-zinc-850/50 rounded-3xl border border-slate-100 dark:border-zinc-800">
                                    <div className="flex justify-between items-start mb-2">
                                       <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded shadow-sm border border-indigo-100">Novo Pedido</span>
                                       <span className="text-[10px] font-bold text-slate-400">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <p className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase truncate mb-1">Lançamento de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><FileText className="w-3 h-3" /> {order.file_name}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {activeTab === 'pedidos' && (
                     <div className="space-y-6">
                        {orders.map((order) => (
                           <div key={order.id} className="group p-5 bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 hover:border-indigo-200 transition-all flex items-center justify-between">
                              <div className="flex items-center gap-5">
                                 <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-zinc-900 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all"><ShoppingCart className="w-5 h-5" /></div>
                                 <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase mb-0.5">Pedido #{order.id.substring(0, 8)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                                       <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                       <span className="text-indigo-600 opacity-50 px-2">|</span>
                                       <Layers className="w-3 h-3" /> {order.company_name || 'Individual'}
                                    </p>
                                 </div>
                              </div>
                              <div className="text-right flex items-center gap-6">
                                 <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-zinc-100">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}</p>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase">Processado</p>
                                 </div>
                                 <button className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl text-slate-300 hover:text-indigo-600 transition-all"><Eye className="w-5 h-5" /></button>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}

                  {activeTab === 'indicadores' && (
                     <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-full text-indigo-600"><Star className="w-10 h-10 animate-pulse" /></div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Insights do Cliente</h4>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-tight max-w-sm">Este recurso usa IA Gemini para prever prximos pedidos com base no histrico. Disponvel em breve!</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
