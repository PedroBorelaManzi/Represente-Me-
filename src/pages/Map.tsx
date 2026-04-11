import React, { useState, useEffect } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MapComponent from '../components/Map';

export default function Map() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase.from('clients').select('*').eq('user_id', user.id);
      setClients(data || []);
    }
    load();
  }, [user]);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
             <MapIcon className="w-6 h-6" /> Localização
           </div>
           <h1 className="text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Mapa de Prospecção</h1>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-200 dark:border-zinc-800 relative overflow-hidden shadow-sm">
        <MapComponent clients={clients} />
      </div>
    </div>
  );
}
