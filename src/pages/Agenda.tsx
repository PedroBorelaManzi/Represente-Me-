import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
            <CalendarIcon className="w-6 h-6" /> Planejamento
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Agenda Mensal</h1>
        </div>
        <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 shadow-indigo-100">
          <Plus className="w-4 h-4" /> Novo Compromisso
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Abril 2026</h2>
            <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
                <button className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
            </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-inner">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="bg-slate-50 dark:bg-zinc-950 p-4 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{d}</span>
                </div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 min-h-[140px] p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <span className="text-sm font-black text-slate-300 dark:text-zinc-700 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{i + 1}</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
