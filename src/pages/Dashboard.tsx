import React, { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Clock } from "lucide-react";

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Lógica para pegar o primeiro dia da semana (Segunda-feira)
  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); 
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  // Criar array com os 7 dias da semana
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Eventos mockados para visualizar a interface
  const mockEvents = [
    { id: 1, title: "Reunião de Alinhamento", time: "09:00 - 10:00", date: new Date() },
    { id: 2, title: "Apresentação Cliente X", time: "14:00 - 15:30", date: new Date() },
    { id: 3, title: "Follow-up Propostas", time: "10:00 - 11:00", date: new Date(new Date().setDate(new Date().getDate() + 1)) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Início</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Acompanhe seus compromissos e resumo das atividades.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>
      
      {/* Agenda Semanal */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
        {/* Header Calendário */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
            {capitalize(startOfWeek.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} 
              className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-400 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())} 
              className="px-4 py-1.5 text-sm font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-slate-700 dark:text-zinc-300 transition-colors"
            >
              Hoje
            </button>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} 
              className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-400 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scroll Horizontal para Mobile */}
        <div className="overflow-x-auto flex-1 flex flex-col custom-scrollbar">
          <div className="min-w-[800px] flex-1 flex flex-col">
            {/* Cabeçalho dos Dias */}
            <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-zinc-800/50 bg-slate-50 border-b border-slate-200 dark:bg-zinc-950 dark:border-zinc-800 sticky top-0 z-10">
              {weekDays.map((date, i) => {
                const isToday = isSameDay(date, new Date());
                return (
                  <div key={i} className={`p-3 text-center ${isToday ? 'bg-indigo-50/80 dark:bg-indigo-500/10' : ''}`}>
                    <div className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400'}`}>
                      {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                    </div>
                    <div className={`text-lg font-bold w-9 h-9 flex items-center justify-center rounded-full mx-auto transition-transform ${isToday ? 'bg-indigo-600 text-white shadow-md scale-110' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800'}`}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Área de Horários / Eventos */}
            <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-zinc-800/50 flex-1">
              {weekDays.map((date, i) => {
                const dayEvents = mockEvents.filter(e => isSameDay(e.date, date));
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div key={i} className={`p-2 space-y-2.5 min-h-[300px] ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : 'bg-slate-50/30 dark:bg-zinc-900/30'}`}>
                    {dayEvents.length === 0 ? (
                      <div className="w-full h-full min-h-[100px] border-2 border-dashed border-transparent hover:border-slate-200 dark:hover:border-zinc-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100">
                         <Plus className="w-5 h-5 text-slate-400" />
                      </div>
                    ) : (
                      dayEvents.map(event => (
                        <div key={event.id} className="p-3 rounded-xl border bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group flex flex-col gap-2">
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-100 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {event.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-950 px-2 py-1 rounded-md w-fit">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            {event.time}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
