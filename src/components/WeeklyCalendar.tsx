import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

export default function WeeklyCalendar() {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-100 dark:border-zinc-800 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
            <Calendar className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">Agenda Semanal</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Timeline de Visitas e Compromissos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
            <button className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {days.map((day, i) => (
          <div key={i} className="space-y-4">
            <div className={cn(
                "flex flex-col items-center py-4 rounded-2xl border transition-all",
                i === todayIndex ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none" : "bg-slate-50 dark:bg-zinc-950 border-slate-100 dark:border-zinc-800 text-slate-400"
            )}>
              <span className="text-[10px] font-black uppercase tracking-widest">{day}</span>
              <span className="text-lg font-black mt-1">{Math.max(1, (new Date().getDate() - todayIndex + i))}</span>
            </div>
            
            <div className="space-y-2">
               {i === todayIndex && (
                 <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/20 rounded-xl">
                    <p className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase leading-tight">Visita Técnica</p>
                    <p className="text-[8px] font-bold text-amber-600/60 uppercase mt-0.5">14:00</p>
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
