import React, { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";

type EventType = { id: number; title: string; time: string; date: Date };

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  // Fill the grid based on 6 weeks (42 slots)
  const daysArray = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
    }
    return null; 
  });

  const isSameDay = (d1: Date | null, d2: Date) => {
    if (!d1) return false;
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Mock
  const [events, setEvents] = useState<EventType[]>([
    { id: 1, title: "Reunião de Alinhamento", time: "09:00", date: new Date() },
    { id: 2, title: "Apresentação Cliente X", time: "14:00", date: new Date() },
    { id: 3, title: "Follow-up Propostas", time: "10:00", date: new Date(new Date().setDate(new Date().getDate() + 1)) },
    { id: 4, title: "Envio de Relatório", time: "18:00", date: new Date(new Date().setDate(new Date().getDate() + 5)) },
  ]);

  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);

  const onDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("eventId", id.toString());
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const onDrop = (e: React.DragEvent, targetDate: Date | null) => {
    e.preventDefault();
    if (!targetDate) return;
    const id = parseInt(e.dataTransfer.getData("eventId"));
    if (!id) return;
    
    setEvents(events.map(ev => 
      ev.id === id ? { ...ev, date: new Date(targetDate) } : ev
    ));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setEvents(events.map(ev => ev.id === editingEvent.id ? editingEvent : ev));
    setEditingEvent(null);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Agenda</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Visão mensal dos seus compromissos e atividades.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[600px]">
        {/* Header Calendário Mensal */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/50">
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            {capitalize(currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-400 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-slate-700 dark:text-zinc-300 transition-colors">
              Hoje
            </button>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-400 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Calendário */}
        <div className="flex-1 flex flex-col min-w-[700px] overflow-auto custom-scrollbar">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/80 sticky top-0 z-10">
            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
              <div key={day} className="p-3 text-center text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 flex-1 bg-slate-50 dark:bg-zinc-950/30 auto-rows-fr">
            {daysArray.map((date, i) => {
              const isToday = isSameDay(date, new Date());
              const dayEvents = date ? events.filter(e => isSameDay(e.date, date)) : [];
              
              return (
                <div 
                  key={i} 
                  className={`border-r border-b border-slate-200 dark:border-zinc-800/50 p-1 flex flex-col min-h-[100px] transition-colors ${date ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50 dark:bg-zinc-950/30'} ${isToday ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`}
                  onDragOver={date ? onDragOver : undefined}
                  onDrop={date ? (e) => onDrop(e, date) : undefined}
                >
                  {date && (
                    <>
                      <div className={`text-right p-1 mb-1 ${isToday ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-500 font-medium'}`}>
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-indigo-100 dark:bg-indigo-500/20' : ''}`}>
                          {date.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
                        {dayEvents.map(event => (
                          <div 
                            key={event.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, event.id)}
                            onClick={() => setEditingEvent(event)}
                            className="text-[10px] sm:text-xs font-medium px-1.5 py-1 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 shadow-sm truncate cursor-grab active:cursor-grabbing hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                          >
                            {event.time} - {event.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Editar Compromisso</h3>
              <button type="button" onClick={() => setEditingEvent(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Título</label>
                <input 
                  type="text" 
                  value={editingEvent.title} 
                  onChange={e => setEditingEvent({...editingEvent, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Horário</label>
                <input 
                  type="text" 
                  value={editingEvent.time} 
                  onChange={e => setEditingEvent({...editingEvent, time: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: 14:00"
                  required
                />
              </div>
              
              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-xl transition-colors">
                  Salvar Alterações
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
