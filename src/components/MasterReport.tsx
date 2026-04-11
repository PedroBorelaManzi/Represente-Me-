import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, MapPin, Building2, Crown, Zap, BarChart3, PieChart, ArrowUpRight } from 'lucide-react';

interface MasterReportProps {
  clients: any[];
  orders: any[];
}

export default function MasterReport({ clients, orders }: MasterReportProps) {
  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.value || 0), 0);
    const avgOrder = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    // Top Cities
    const cityMap: Record<string, number> = {};
    clients.forEach(c => {
      if (c.city) cityMap[c.city] = (cityMap[c.city] || 0) + 1;
    });
    const topCities = Object.entries(cityMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top Clients by Revenue
    const clientRevenue: Record<string, {name: string, value: number}> = {};
    orders.forEach(o => {
      if (o.client_id) {
        if (!clientRevenue[o.client_id]) clientRevenue[o.client_id] = { name: o.client?.name || 'Cliente', value: 0 };
        clientRevenue[o.client_id].value += (o.value || 0);
      }
    });
    const topClients = Object.values(clientRevenue)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Revenue by Month (Simplified)
    const monthMap: Record<string, number> = {};
    orders.forEach(o => {
      const date = new Date(o.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = (monthMap[key] || 0) + (o.value || 0);
    });
    const sortedMonths = Object.entries(monthMap).sort((a,b) => a[0].localeCompare(b[0])).slice(-6);

    return { totalRevenue, avgOrder, topCities, topClients, sortedMonths };
  }, [clients, orders]);

  const maxMonthValue = Math.max(...stats.sortedMonths.map(m => m[1]), 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-[40px] text-white border border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
           <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30">
                 <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Master BI Dashboard</span>
           </div>
           <h2 className="text-4xl font-black mb-2 uppercase tracking-tight">Visão Gerencial</h2>
           <p className="text-zinc-400 text-sm font-medium">Análise de dados de alta performance para tomada de decisão.</p>
        </div>
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full" />
        <TrendingUp className="w-32 h-32 text-white/5 absolute right-8 bottom-4 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Revenue Total', val: stats.totalRevenue, icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Ticket Médio', val: stats.avgOrder, icon: Zap, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { label: 'Clientes Ativos', val: clients.length, icon: Users, color: 'text-sky-500', bg: 'bg-sky-500/10' },
          { label: 'Cidades Atendidas', val: Object.keys(stats.topCities).length, icon: MapPin, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        ].map((s, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm"
          >
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            <h3 className="text-2xl font-black mt-1">
              {typeof s.val === 'number' && s.val > 100 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.val) : s.val}
            </h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-sm">
           <h3 className="text-sm font-black uppercase tracking-widest mb-10 flex items-center gap-2">
             <ArrowUpRight className="w-4 h-4 text-indigo-600" /> Crescimento de Vendas (6 Meses)
           </h3>
           <div className="flex items-end justify-between h-48 gap-4 px-2">
              {stats.sortedMonths.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group">
                  <motion.div 
                    initial={{ height: 0 }} 
                    animate={{ height: `${(m[1] / maxMonthValue) * 100}%` }}
                    className="w-full bg-gradient-to-t from-indigo-600 to-violet-400 rounded-t-xl relative group-hover:from-indigo-500"
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[8px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(m[1])}
                    </div>
                  </motion.div>
                  <span className="text-[8px] font-black text-slate-400 mt-4 uppercase rotate-[-45deg]">{m[0]}</span>
                </div>
              ))}
           </div>
        </div>

        <div className="p-8 bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-sm">
           <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" /> Concentração por Cidades
           </h3>
           <div className="space-y-4">
              {stats.topCities.map(([city, count], i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold uppercase">{city}</span>
                    <span className="text-[10px] font-black text-indigo-600">{count} Clientes</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / clients.length) * 100}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="p-8 bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-sm">
         <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" /> Top 5 Clientes Premium (Faturamento)
         </h3>
         <div className="divide-y border-t border-slate-100 dark:border-zinc-850">
            {stats.topClients.map((c, i) => (
              <div key={i} className="py-6 flex items-center justify-between group hover:bg-slate-50/50 dark:hover:bg-zinc-950 transition-colors px-4 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs uppercase">
                    #{i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase text-slate-800 dark:text-zinc-200">{c.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400">CLIENTE VIP MASTER</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-indigo-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.value)}
                  </p>
                </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
