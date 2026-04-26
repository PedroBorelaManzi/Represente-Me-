import React, { useState, useEffect } from "react";
import { X, Check, Bell, Sun, Moon, Target, Shield, Info, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";
import { cn } from "../lib/utils";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: number;
}

export default function SettingsModal({ isOpen, onClose, initialStep = 1 }: SettingsModalProps) {
  const { settings, loading, updateSettings } = useSettings();
  const [step, setStep] = useState(initialStep);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for settings
  const [alerta, setAlerta] = useState(settings.alerta_days || 15);
  const [critico, setCritico] = useState(settings.critico_days || 30);
  const [perda, setPerda] = useState(settings.perda_days || 45);
  const [inativo, setInativo] = useState(settings.inativo_days || 90);
  const [theme, setTheme] = useState<'light' | 'dark'>(settings.theme || 'light');
  
  const [categories, setCategories] = useState<string[]>(settings.categories || []);

  useEffect(() => {
    if (isOpen) {
      setAlerta(settings.alerta_days || 15);
      setCritico(settings.critico_days || 30);
      setPerda(settings.perda_days || 45);
      setInativo(settings.inativo_days || 90);
      setTheme(settings.theme || 'light');
      
      setCategories(settings.categories || []);
      setStep(initialStep);
    }
  }, [isOpen, settings, initialStep]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings({
        alerta_days: alerta,
        critico_days: critico,
        perda_days: perda,
        inativo_days: inativo,
        theme,
        
        categories
      });
      toast.success("Configurações atualizadas com sucesso!");
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 dark:border-zinc-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-zinc-50 uppercase tracking-tight">Painel de Configurações</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajuste seu Ecossistema de Trabalho</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-zinc-850 p-1 rounded-2xl">
            <button 
              onClick={() => setStep(1)}
              className={cn(
                "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                step === 1 ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Alertas
            </button>
            <button 
              onClick={() => setStep(2)}
              className={cn(
                "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                step === 2 ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Visual
            </button>
            
          </div>

          <div className="min-h-[200px]">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-amber-600 uppercase tracking-wider">Dias para Alerta (Frio)</span>
                    <span className="font-black text-slate-900 dark:text-zinc-100">{alerta} DIAS</span>
                  </div>
                  <input type="range" min="5" max="60" step="5" value={alerta} onChange={(e) => {
                    const val = Number(e.target.value);
                    setAlerta(val);
                    if (critico <= val) setCritico(val + 5);
                    if (perda <= val + 5) setPerda(val + 10);
                  }} className="w-full accent-amber-500 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full cursor-pointer" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-orange-600 uppercase tracking-wider">Dias para Crítico (Quente)</span>
                    <span className="font-black text-slate-900 dark:text-zinc-100">{critico} DIAS</span>
                  </div>
                  <input type="range" min={alerta + 5} max="90" step="5" value={critico} onChange={(e) => {
                    const val = Number(e.target.value);
                    setCritico(val);
                    if (perda <= val) setPerda(val + 5);
                  }} className="w-full accent-orange-500 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full cursor-pointer" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-red-600 uppercase tracking-wider">Dias para Perda</span>
                    <span className="font-black text-slate-900 dark:text-zinc-100">{perda} DIAS</span>
                  </div>
                  <input type="range" min={critico + 5} max="180" step="5" value={perda} onChange={(e) => setPerda(Number(e.target.value))} className="w-full accent-red-500 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full cursor-pointer" />
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex gap-3">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                    Estes prazos definem as cores dos ícones de status dos seus clientes com base na última compra ou contato.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setTheme('light')}
                    className={theme === 'light' ? "p-6 rounded-3xl border border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col items-center gap-4 transition-all" : "p-6 rounded-3xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col items-center gap-4 transition-all"}
                  >
                    <Sun className={theme === 'light' ? "w-8 h-8 text-emerald-600" : "w-8 h-8 text-slate-400"} />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-zinc-200">Tema Claro</span>
                  </button>

                  <button 
                    onClick={() => setTheme('dark')}
                    className={theme === 'dark' ? "p-6 rounded-3xl border border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col items-center gap-4 transition-all" : "p-6 rounded-3xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col items-center gap-4 transition-all"}
                  >
                    <Moon className={theme === 'dark' ? "w-8 h-8 text-emerald-600" : "w-8 h-8 text-slate-400"} />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-zinc-200">Tema Escuro</span>
                  </button>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium text-center italic">
                    O tema será aplicado globalmente em todos os módulos.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Teto de Faturamento (Visual)</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {ceiling}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="100000" 
                    max="10000000" 
                    step="100000" 
                    value={ceiling} 
                    onChange={(e) => setCeiling(Number(e.target.value))} 
                    className="w-full accent-emerald-600 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full cursor-pointer" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-850 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-zinc-400 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            Salvar Alterações
          </button>
        </div>
      </motion.div>
    </div>
  );
}


