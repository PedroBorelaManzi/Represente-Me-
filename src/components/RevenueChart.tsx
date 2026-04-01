import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { TrendingUp, Settings } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface RevenueData {
  name: string;
  value: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  loading?: boolean;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, loading }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [ceilingInput, setCeilingInput] = useState('');
  const { settings, updateSettings } = useSettings();

  const ceiling = settings.revenue_ceiling ?? 1000000;

  const MAX_REVENUE = useMemo(() => {
    const highest = Math.max(...data.map(d => d.value), 0);
    return Math.max(highest, ceiling);
  }, [data, ceiling]);

  const scaleMarks = useMemo(() => {
    const step = MAX_REVENUE / 5;
    return [5, 4, 3, 2, 1, 0].map(i => Math.round(step * i));
  }, [MAX_REVENUE]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  const formatShortCurrency = (val: number) => {
    if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
    return `R$ ${val}`;
  };

  const handleSaveCeiling = async () => {
    const parsed = parseFloat(ceilingInput.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      await updateSettings({ revenue_ceiling: parsed });
    }
    setShowSettings(false);
    setCeilingInput('');
  };

  return (
    <div className="bg-white dark:bg-zinc-800/40 shadow-inner ring-1 ring-slate-200 dark:ring-zinc-700/60 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 flex flex-col h-full relative">
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute inset-x-6 top-16 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 shadow-2xl ring-1 ring-black/5"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2">
              Teto de Faturamento
            </p>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={ceilingInput}
                onChange={e => setCeilingInput(e.target.value)}
                placeholder={`Atual: ${formatShortCurrency(ceiling)}`}
                className="flex-1 text-sm border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 ring-indigo-500/30"
              />
              <button
                onClick={handleSaveCeiling}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl px-4 py-2 transition-colors"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs font-black px-2 py-2 transition-colors"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Faturamento por Empresa
          </h2>
          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-tighter mt-1">
            Passe o mouse ou clique na barra para ver o valor
          </p>
        </div>
        <button
          onClick={() => setShowSettings(v => !v)}
          className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-colors group"
          title="Configurar teto de faturamento"
        >
          <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:rotate-45 transition-transform duration-300" />
        </button>
      </div>

      <div className="flex-1 flex gap-3 relative min-h-0">
        {/* Y Axis Labels */}
        <div className="flex flex-col justify-between text-[8px] font-black text-slate-400 dark:text-zinc-600 pb-10 w-10 border-r border-slate-100 dark:border-zinc-800/50 pr-2">
          {scaleMarks.map(mark => (
            <span key={mark} className="leading-none">{formatShortCurrency(mark)}</span>
          ))}
        </div>

        {/* Chart Area */}
        <div className="flex-1 flex items-end justify-around gap-4 relative bg-slate-50/50 dark:bg-zinc-950/20 rounded-2xl p-4 border border-slate-100/50 dark:border-zinc-900/50">
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
                const isSelected = selectedIdx === idx;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end z-10"
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onMouseLeave={() => setSelectedIdx(null)}
                    onClick={() => setSelectedIdx(isSelected ? null : idx)}
                  >
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: `${heightPercent}%`, opacity: 1 }}
                      transition={{ delay: idx * 0.05, duration: 0.8, ease: "circOut" }}
                      className={cn(
                        "w-full max-w-[64px] min-w-[16px] rounded-t-xl bg-indigo-600/80 hover:bg-indigo-600 transition-all cursor-pointer relative",
                        "dark:bg-indigo-500/80 dark:hover:bg-indigo-50",
                        isSelected && "bg-indigo-600 dark:bg-indigo-500 ring-4 ring-indigo-500/20 ring-offset-2 dark:ring-offset-zinc-900"
                      )}
                    >
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-50 pointer-events-none"
                          >
                            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 min-w-[160px] shadow-xl ring-1 ring-black/5">
                              <div className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest border-b border-slate-100 dark:border-zinc-800 pb-2 mb-2 truncate">
                                {item.name}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
                                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Faturamento:</span>
                                <span className="text-[11px] font-black text-slate-900 dark:text-zinc-100 ml-auto whitespace-nowrap">
                                  {formatCurrency(item.value)}
                                </span>
                              </div>
                            </div>
                            <div className="w-3 h-3 bg-white dark:bg-zinc-900 border-r border-b border-slate-200 dark:border-zinc-700 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!isSelected && (
                        <div className="absolute bottom-1.5 left-0 right-0 text-center text-[7px] font-black text-white/40 group-hover:text-white transition-colors">
                          {(heightPercent).toFixed(0)}%
                        </div>
                      )}
                    </motion.div>

                    {/* Label */}
                    <div className="mt-3 w-full text-center">
                      <p className={cn(
                        "text-[9px] font-black uppercase truncate px-1 transition-colors",
                        isSelected ? "text-indigo-600 dark:text-indigo-400 scale-110" : "text-slate-600 dark:text-zinc-500"
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
