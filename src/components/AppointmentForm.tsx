import React, { useState, useRef, useEffect } from "react";
import { X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  client_id?: string;
}

interface AppointmentFormProps {
  appointment?: Partial<Appointment> | null;
  onClose: () => void;
  onSaved: () => void;
  clients: any[];
  onSave: (payload: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  isSaving: boolean;
}

// Custom Scrollable Time Picker Component
function ScrollableTimePicker({ 
  value, 
  onChange, 
  label 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);
  
  const [hour, minute] = value.split(":");
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Automatic scroll when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const hBtn = hourRef.current?.querySelector(`[data-val="${hour}"]`);
        const mBtn = minRef.current?.querySelector(`[data-val="${minute}"]`);
        if (hBtn) hBtn.scrollIntoView({ block: 'center', behavior: 'auto' });
        if (mBtn) mBtn.scrollIntoView({ block: 'center', behavior: 'auto' });
      }, 50);
    }
  }, [isOpen, hour, minute]);

  const handleSelect = (newHour: string, newMin: string) => {
    onChange(`${newHour}:${newMin}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 px-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/10 transition-all font-bold group"
      >
        <span className="text-sm">{value}</span>
        <Clock className={cn("w-4 h-4 transition-colors", isOpen ? "text-indigo-500" : "text-slate-400 group-hover:text-indigo-500")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute z-[100] mt-2 p-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex gap-1 min-w-[180px] left-0 right-0 sm:left-auto sm:right-0 overflow-hidden"
          >
            {/* Hours Column */}
            <div 
              ref={hourRef}
              className="flex-1 flex flex-col h-56 overflow-y-auto custom-scrollbar-hide snap-y snap-mandatory py-20"
            >
              {hours.map((h) => (
                <button
                  key={h}
                  data-val={h}
                  type="button"
                  onClick={() => handleSelect(h, minute)}
                  className={cn(
                    "flex-shrink-0 h-10 flex items-center justify-center text-sm font-black transition-all snap-center mx-1 rounded-xl",
                    h === hour 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-105" 
                      : "text-slate-400 dark:text-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  )}
                >
                  {h}
                </button>
              ))}
            </div>

            <div className="w-[1px] bg-slate-100 dark:bg-zinc-800 self-stretch my-4" />

            {/* Minutes Column */}
            <div 
              ref={minRef}
              className="flex-1 flex flex-col h-56 overflow-y-auto custom-scrollbar-hide snap-y snap-mandatory py-20"
            >
              {minutes.map((m) => (
                <button
                  key={m}
                  data-val={m}
                  type="button"
                  onClick={() => handleSelect(hour, m)}
                  className={cn(
                    "flex-shrink-0 h-10 flex items-center justify-center text-sm font-black transition-all snap-center mx-1 rounded-xl",
                    m === minute 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-105" 
                      : "text-slate-400 dark:text-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            
            {/* Center selection indicator */}
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-10 border-y border-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-500/5 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AppointmentForm({ 
  appointment, 
  onClose, 
  clients, 
  onSave, 
  onDelete, 
  isSaving 
}: AppointmentFormProps) {
  if (!appointment) return null;

  const initialTimes = (appointment.time || "09:00 - 10:00").split(" - ");
  const [formData, setFormData] = React.useState({
    title: appointment.title || "",
    client_id: appointment.client_id || "",
    date: appointment.date || "",
    startTime: initialTimes[0] || "09:00",
    endTime: initialTimes[1] || "10:00",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      date: formData.date,
      time: `${formData.startTime} - ${formData.endTime}`,
      client_id: formData.client_id || null
    };
    await onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-8 w-full max-w-md mb-4 sm:mb-0 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
            {appointment.id ? "Editar Compromisso" : "Novo Compromisso"}
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 px-1">
              Título do Evento
            </label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 font-bold transition-all" 
              placeholder="Ex: Visita ao Cliente"
              required 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 px-1">
              Cliente Vinculado
            </label>
            <div className="relative group">
              <select 
                value={formData.client_id} 
                onChange={e => setFormData({...formData, client_id: e.target.value})} 
                className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 font-bold text-sm transition-all appearance-none outline-none"
              >
                <option value="">Nenhum cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Plus className="w-4 h-4 rotate-45" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 px-1">
              Data do Compromisso
            </label>
            <input 
              type="date" 
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})} 
              className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 dark:text-zinc-100 text-sm font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ScrollableTimePicker 
              label="Início"
              value={formData.startTime}
              onChange={(val) => setFormData({...formData, startTime: val})}
            />
            <ScrollableTimePicker 
              label="Término"
              value={formData.endTime}
              onChange={(val) => setFormData({...formData, endTime: val})}
            />
          </div>

          <div className="pt-6 flex gap-3">
            {appointment.id && onDelete && (
              <button 
                type="button" 
                onClick={onDelete} 
                disabled={isSaving}
                className="flex-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-black py-4 rounded-2xl transition-all disabled:opacity-50 hover:bg-red-100 active:scale-95"
              >
                Excluir
              </button>
            )}
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center"
            >
              {isSaving ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : "Salvar Compromisso"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

import { Plus } from "lucide-react";
