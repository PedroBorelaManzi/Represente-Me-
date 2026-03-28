import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { TrendingUp, Info } from 'lucide-react';

interface RevenueData {
  name: string;
  value: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  loading?: boolean;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, loading }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Constants for scale
  const MAX_REVENUE = useMemo(() => {
    const highest = Math.max(...data.map(d => d.value), 0);
    return Math.max(highest, 1000000); // Scale up to at least 1M
  }, [data]);

  const scaleMarks = [1000000, 800000, 600000, 400000, 200000, 0];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatShortCurrency = (val: number) => {
    if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
    return `R$ ${val}`;
  };

  return (
    <div className="bg-white dark:bg-zinc-800/40 shadow-inner ring-1 ring-slate-200 dark:ring-zinc-700/60 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Faturamento por Empresa
          </h2>
          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-tighter mt-1">
            Total consolidado por representada
          </p>
        </div>
        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
           <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>

      <div className="flex-1 flex gap-3 relative min-h-0">
        {/* Y Axis Labels */}
        <div className="flex flex-col justify-between text-[8px] font-black text-slate-400 dark:text-zinc-600 pb-10 w-10 border-r border-slate-100 dark:border-zinc-800/50 pr-2">
          {scaleMarks.map(mark => (
            <span key={mark} className="leading-none">{formatShortCurrency(mark)}</span>
          ))}
        </div>

        {/* Chart Area */}
        <div className="flex-1 flex items-end justify-around gap-2 relative bg-slate-50/50 dark:bg-zinc-950/20 rounded-2xl p-4 overflow-hidden border border-slate-100/50 dark:border-zinc-900/50">
          {loading ? (
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
             </div>
          ) : data.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-widest text-center px-6">
               Nenhum dado disponível.
            </div>
          ) : (
            <>
              {/* Background Grid Lines */}
              <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
                {scaleMarks.map(m => (
                    <div key={m} className="w-full border-t border-slate-200/50 dark:border-zinc-800/30" />
                ))}
              </div>

              {/* Bars */}
              {data.map((item, idx) => {
                const heightPercent = (item.value / MAX_REVENUE) * 100;
                const isHovered = hoveredIdx === idx;
                
                return (
                  <div 
                    key={idx} 
                    className="flex-1 flex flex-col items-center group relative h-full justify-end z-10"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* ENHANCED Tooltip Box */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.95 }}
                          className="absolute -top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                        >
                          <div className="bg-slate-900 dark:bg-zinc-100 p-3 rounded-2xl shadow-2xl border border-slate-700 dark:border-zinc-300 min-w-[140px] text-center">
                            <p className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                              Faturamento Total
                            </p>
                            <p className="text-sm font-black text-white dark:text-zinc-900 whitespace-nowrap">
                              {formatCurrency(item.value)}
                            </p>
                            <div className="mt-1 flex items-center justify-center gap-1">
                               <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                               <p className="text-[7px] font-bold text-indigo-400 dark:text-indigo-600 uppercase">
                                 {item.name}
                               </p>
                            </div>
                          </div>
                          {/* Triangle pointer */}
                          <div className="w-3 h-3 bg-slate-900 dark:bg-zinc-100 mx-auto rotate-45 -mt-1.5 border-b border-r border-slate-700 dark:border-zinc-300" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: `${heightPercent}%`, opacity: 1 }}
                      transition={{ delay: idx * 0.05, duration: 0.8, ease: "circOut" }}
                      className={cn(
                        "w-full max-w-[56px] min-w-[12px] rounded-t-xl bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-lg shadow-indigo-500/10 relative group-hover:from-indigo-500 group-hover:to-indigo-300 transition-all cursor-pointer",
                        "dark:shadow-none dark:from-indigo-500 dark:to-indigo-300",
                        isHovered && "ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-zinc-900 scale-x-105"
                      )}
                    >
                       <div className="absolute bottom-1.5 left-0 right-0 text-center text-[7px] font-black text-white/40 group-hover:text-white transition-colors">
                          {(heightPercent).toFixed(0)}%
                       </div>
                    </motion.div>
                    
                    {/* Label */}
                    <div className="mt-3 w-full text-center">
                       <p className={cn(
                          "text-[9px] font-black uppercase truncate px-1 transition-colors",
                          isHovered ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-zinc-400"
                       )}>
                          {item.name}
                       </p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
