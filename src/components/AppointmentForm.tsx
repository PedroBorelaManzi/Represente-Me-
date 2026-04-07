import React from "react";
import { X } from "lucide-react";

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

export default function AppointmentForm({ 
  appointment, 
  onClose, 
  clients, 
  onSave, 
  onDelete, 
  isSaving 
}: AppointmentFormProps) {
  if (!appointment) return null;

  const [formData, setFormData] = React.useState({
    title: appointment.title || "",
    client_id: appointment.client_id || "",
    date: appointment.date || "",
    time: appointment.time || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      client_id: formData.client_id || null
    };
    await onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-8 w-full max-w-md mb-4 sm:mb-0">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
            {appointment.id ? "Editar Compromisso" : "Novo Compromisso"}
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
              Título do Evento
            </label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 font-bold" 
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
              Cliente Vinculado
            </label>
            <select 
              value={formData.client_id} 
              onChange={e => setFormData({...formData, client_id: e.target.value})} 
              className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
            >
              <option value="">Nenhum cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                Data
              </label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
                className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 dark:text-zinc-100 text-sm font-bold" 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                Horário
              </label>
              <input 
                type="text" 
                value={formData.time} 
                onChange={e => setFormData({...formData, time: e.target.value})} 
                className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 dark:text-zinc-100 text-sm font-bold" 
                required 
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            {appointment.id && onDelete && (
              <button 
                type="button" 
                onClick={onDelete} 
                disabled={isSaving}
                className="flex-1 bg-red-50 text-red-600 font-black py-3 rounded-2xl transition-all disabled:opacity-50"
              >
                Excluir
              </button>
            )}
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl shadow-lg transition-all disabled:opacity-50"
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
