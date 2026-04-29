import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface DailyNotesProps {
  selectedDate: Date;
  className?: string;
}

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DailyNotes({ selectedDate, className }: DailyNotesProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedContent, setLastSavedContent] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dateIso = formatDateLocal(selectedDate);

  // Fetch note for the selected date
  useEffect(() => {
    const fetchNote = async () => {
      if (!user) return;
      setLoading(true);
      setSaveStatus('idle');

      const { data, error } = await supabase
        .from('daily_notes')
        .select('content')
        .eq('user_id', user.id)
        .eq('date', dateIso)
        .maybeSingle();

      if (!error) {
        const fetchedContent = data?.content || '';
        setContent(fetchedContent);
        setLastSavedContent(fetchedContent);
      } else {
        console.error('Error fetching daily note:', error);
      }
      setLoading(false);
    };

    fetchNote();
  }, [user, dateIso]);

  // Auto-save logic
  useEffect(() => {
    if (content === lastSavedContent) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      if (!user) return;

      const { error } = await supabase
        .from('daily_notes')
        .upsert(
          { user_id: user.id, date: dateIso, content },
          { onConflict: 'user_id,date' }
        );

      if (!error) {
        setSaveStatus('saved');
        setLastSavedContent(content);
        // Reset saved status after 3 seconds
        setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000);
      } else {
        console.error('Error saving daily note:', error);
        setSaveStatus('error');
      }
    }, 1000); // 1 second debounce

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [content, user, dateIso, lastSavedContent]);

  const formattedDateDisplay = selectedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    weekday: 'long',
  });

  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 rounded-[32px] border-2 border-emerald-600/20 p-6 shadow-xl flex flex-col h-full",
      className
    )}>
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
            <StickyNote className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Anotações do Dia</h2>
            <p className="text-[11px] font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter mt-0.5">
              {formattedDateDisplay}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {saveStatus === 'saving' && (
              <motion.div
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 rounded-full border border-slate-100 dark:border-zinc-700"
              >
                <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Salvando</span>
              </motion.div>
            )}
            {saveStatus === 'saved' && (
              <motion.div
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-100 dark:border-emerald-500/20"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Salvo</span>
              </motion.div>
            )}
            {saveStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 rounded-full border border-red-100 dark:border-red-500/20"
              >
                <AlertCircle className="w-3 h-3 text-red-600" />
                <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">Erro</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative group">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10 rounded-2xl">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : null}
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Comece a escrever suas anotações para este dia..."
          className={cn(
            "w-full h-full p-5 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm font-medium text-slate-700 dark:text-zinc-300 resize-none custom-scrollbar",
            loading && "opacity-50"
          )}
        />
        
        {!loading && !content && (
          <div className="absolute bottom-6 right-6 pointer-events-none opacity-20 group-focus-within:opacity-0 transition-opacity">
            <StickyNote className="w-12 h-12 text-slate-400" />
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">As notas são salvas automaticamente</p>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">Nuvem Ativa</span>
        </div>
      </div>
    </div>
  );
}