import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export const SettingsAppearance = React.memo(function SettingsAppearance() {
  const { settings, updateSettings } = useSettings();

  const toggleTheme = async () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    try {
      await updateSettings({ theme: newTheme });
      toast.success(`Modo ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado!`);
    } catch (err) {
      toast.error("Erro ao salvar tema");
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Personalização</h2>
      
      <div className="space-y-4">
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 hover:scale-[1.02] transition-all group"
        >
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
              {settings.theme === 'dark' ? <Moon className="w-6 h-6 text-indigo-500" /> : <Sun className="w-6 h-6 text-amber-500" />}
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Modo de Exibição</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Alterar entre modo claro e escuro</p>
            </div>
          </div>
          
          <div className={cn(
            "w-14 h-7 rounded-full p-1 transition-colors duration-300 relative",
            settings.theme === 'dark' ? "bg-emerald-500" : "bg-slate-300"
          )}>
            <motion.div 
              animate={{ x: settings.theme === 'dark' ? 28 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-5 h-5 rounded-full bg-white shadow-lg" 
            />
          </div>
        </button>
      </div>
    </div>
  );
});
