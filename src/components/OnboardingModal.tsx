import { useState } from "react";
import { Plus, Trash2, Sun, Moon, Check, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../contexts/SettingsContext";


export default function OnboardingModal() {
  const { settings, loading, updateSettings } = useSettings();
  const [step, setStep] = useState(1);

  
  // Step 1: Categories
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");

  const addCategory = () => {
    if (newCat.trim() && !categories.includes(newCat.trim())) {
      setCategories([...categories, newCat.trim()]);
      setNewCat("");
    }
  };

  // Step 2: Alerts
  const [alerta, setAlerta] = useState(15);
  const [critico, setCritico] = useState(30);
  const [perda, setPerda] = useState(45);
  const [inativo, setInativo] = useState(90);

  // Step 3: Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(settings.theme || 'light');

  // Step 4: Revenue Ceiling
  const [ceiling, setCeiling] = useState(1000000);

  const handleFinish = async () => {
    await updateSettings({
      categories,
      alerta_days: alerta,
      critico_days: critico,
      perda_days: perda,
      inativo_days: inativo,
      theme,
      revenue_ceiling: ceiling,
      has_completed_onboarding: true,
    });
  };

  if (loading || settings.has_completed_onboarding || (settings.categories && settings.categories.length > 0)) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-8 w-full max-w-lg space-y-6"
      >
        {/* Progress Bar */}
        <div className="flex gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-indigo-600" : "bg-slate-100 dark:bg-zinc-800"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-indigo-600" : "bg-slate-100 dark:bg-zinc-800"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? "bg-indigo-600" : "bg-slate-100 dark:bg-zinc-800"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 4 ? "bg-indigo-600" : "bg-slate-100 dark:bg-zinc-800"}`} />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-zinc-50 uppercase tracking-tight">Configure suas empresas</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Adicione as empresas que você trabalha hoje.</p>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="Ex: Nestle, Coca-Cola..."
                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-zinc-950 dark:text-zinc-100"
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                />
                <button 
                  onClick={addCategory}
                  disabled={!newCat.trim()}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {categories.map((cat, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-center p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-xl"
                  >
                    <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{cat}</span>
                    <button onClick={() => setCategories(categories.filter((_, i) => i !== index))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </motion.div>
                ))}
                {categories.length === 0 && (
                  <p className="text-center text-xs text-slate-400 dark:text-zinc-500 py-4">Me dê o nome de todas as empresas que você trabalha hoje.</p>
                )}
              </div>

              <button 
                onClick={() => setStep(2)}
                disabled={categories.length === 0}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm tracking-wide disabled:opacity-50 flex items-center justify-center gap-1 mt-4"
              >
                Próximo Passo <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-zinc-50 uppercase tracking-tight">Alertas de Inatividade</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Como você deseja acompanhar suas perdas, crítico e alertas de clientes sem compra?</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-amber-600">Dias para Alerta (Frio)</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-300">{alerta} dias</span>
                  </div>
                  <input type="range" min="5" max="60" step="5" value={alerta} onChange={(e) => {
                    const val = Number(e.target.value);
                    setAlerta(val);
                    if (critico <= val) setCritico(val + 5);
                    if (perda <= val + 5) setPerda(val + 10);
                    if (inativo <= val + 10) setInativo(val + 15);
                  }} className="w-full accent-amber-500 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-orange-600">Dias para Crítico (Quente)</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-300">{critico} dias</span>
                  </div>
                  <input type="range" min={alerta + 5} max="90" step="5" value={critico} onChange={(e) => {
                    const val = Number(e.target.value);
                    setCritico(val);
                    if (perda <= val) setPerda(val + 5);
                    if (inativo <= val + 5) setInativo(val + 10);
                  }} className="w-full accent-orange-500 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-red-600">Dias para Perda</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-300">{perda} dias</span>
                  </div>
                  <input type="range" min={critico + 5} max="180" step="5" value={perda} onChange={(e) => setPerda(Number(e.target.value)); if (inativo <= Number(e.target.value)) setInativo(Number(e.target.value) + 5); } className="w-full accent-red-500 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full" />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 rounded-xl font-bold text-sm">Voltar</button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1">Próximo</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-zinc-50 uppercase tracking-tight">Estilo Visual</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Escolha o tema que prefere usar no dia a dia.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setTheme('light')}
                  className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${theme === 'light' ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"}`}
                >
                  <Sun className={`w-8 h-8 ${theme === 'light' ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">Tema Claro</span>
                </button>

                <button 
                  onClick={() => setTheme('dark')}
                  className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"}`}
                >
                  <Moon className={`w-8 h-8 ${theme === 'dark' ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">Tema Escuro</span>
                </button>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 rounded-xl font-bold text-sm">Voltar</button>
                <button onClick={() => setStep(4)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1">Próximo</button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-zinc-50 uppercase tracking-tight">Teto de Faturamento</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Agora configure qual é o seu teto de faturamento hoje?</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-500">Valor do Teto Anual/Mensal</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ceiling)}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="100000" 
                    max="10000000" 
                    step="100000" 
                    value={ceiling} 
                    onChange={(e) => setCeiling(Number(e.target.value))} 
                    className="w-full accent-indigo-600 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full cursor-pointer" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>R$ 100k</span>
                    <span>R$ 10M</span>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">
                    Este valor será usado como limite máximo nos gráficos de faturamento por empresa. Você pode alterar isso depois nas configurações do gráfico.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 rounded-xl font-bold text-sm">Voltar</button>
                <button onClick={handleFinish} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Finalizar</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

