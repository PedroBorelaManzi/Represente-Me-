import { Outlet, Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { MapPin, Home, Link as LinkIcon, Users, Settings, Building2, LogOut, Menu, X, ChevronDown, ChevronUp, Sun, Moon, ChevronLeft, Calendar, ShoppingCart, Check, Crown, Globe, BarChart3, Zap, Star, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import OnboardingModal from "./OnboardingModal";
import { supabase } from "../lib/supabase";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'menu' | 'alerta' | 'tema'>('menu');
  const [integracoesOpen, setIntegracoesOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [shortcutLinks, setShortcutLinks] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<{perda: boolean, critico: boolean, alerta: boolean}>({ perda: false, critico: false, alerta: true });
  type AlertItem = { clientName: string, category: string, days: number };
  const [stats, setStats] = useState<{alerta: AlertItem[], critico: AlertItem[], perda: AlertItem[]}>({ alerta: [], critico: [], perda: [] });

  const isIntegrationView = location.pathname.includes('/links');

  useEffect(() => {
    const loadLinks = () => {
      const saved = localStorage.getItem("crm_shortcut_links");
      if (saved) setShortcutLinks(JSON.parse(saved));
    };
    
    loadLinks();
    window.addEventListener('crm_shortcut_links_updated', loadLinks);
    
    async function loadStats() {
      if (!user) return;
      const { data, error } = await supabase.from("clients").select("name, category_last_contact").eq("user_id", user.id);
      if (error) return;

      const alertas: AlertItem[] = [];
      const criticos: AlertItem[] = [];
      const perdas: AlertItem[] = [];
      const today = new Date().getTime();

      data.forEach((client: any) => {
        if (!client.category_last_contact) return;
        Object.entries(client.category_last_contact).forEach(([category, dateStr]) => {
            const lastContact = new Date(dateStr as string).getTime();
            const diffDays = Math.floor((today - lastContact) / (1000 * 60 * 60 * 24));
            if (diffDays >= settings.perda_days) {
                perdas.push({ clientName: client.name, category, days: diffDays });
            } else if (diffDays >= settings.critico_days) {
                criticos.push({ clientName: client.name, category, days: diffDays });
            } else if (diffDays >= settings.alerta_days) {
                alertas.push({ clientName: client.name, category, days: diffDays });
            }
        });
      });

      perdas.sort((a,b) => b.days - a.days);
      criticos.sort((a,b) => b.days - a.days);
      alertas.sort((a,b) => b.days - a.days);
      setStats({ alerta: alertas, critico: criticos, perda: perdas });
    }

    loadStats();
  }, [user, settings]);

  const navigation = [
    { name: "Início", href: "/dashboard", icon: Home },
    { name: "Representadas", href: "/dashboard/empresas", icon: Building2 },
    { name: "Pedidos", href: "/dashboard/pedidos", icon: ShoppingCart },
    { name: "CRM Clientes", href: "/dashboard/clientes", icon: Users },
    { name: "Mapa de Cidades", href: "/dashboard/map", icon: MapPin },
    { name: "Agenda", href: "/dashboard/agenda", icon: Calendar },
    { name: "Integrações", href: "/dashboard/links", icon: LinkIcon },
    { name: "Planos Premium", href: "/dashboard/planos", icon: Crown, premium: true },
  ];

  return (
    <div className={cn("flex h-screen bg-slate-50 dark:bg-[#09090b]", settings.theme === 'dark' ? 'dark' : '')}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 transition-transform duration-300 flex flex-col transform md:relative md:translate-x-0 shadow-xl md:shadow-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex-shrink-0 flex items-center justify-between pt-8 px-6 border-b border-slate-100 dark:border-zinc-900 pb-6">
          <Link to="/" className="flex items-center justify-center p-2">
            <img src={logo} alt="Represente-Me!" className="h-28 w-auto mx-auto object-contain" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500 dark:text-zinc-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 py-6 px-4 overflow-y-auto custom-scrollbar">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              if (item.name === "Integrações") {
                return (
                  <div key={item.name} className="space-y-1">
                    <button onClick={() => setIntegracoesOpen(!integracoesOpen)} className={cn("group flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all", isActive || integracoesOpen ? "bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-950 hover:text-slate-900 dark:hover:text-zinc-100")}>
                      <div className="flex items-center">
                        <item.icon className={cn("mr-3 h-5 w-5", isActive || integracoesOpen ? "text-indigo-600" : "text-slate-400")} />
                        {item.name}
                      </div>
                      {integracoesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <AnimatePresence>
                      {integracoesOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-8 space-y-1">
                          {shortcutLinks.map((link) => (
                            <Link key={link.id} to={`/dashboard/links?id=${link.id}`} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-zinc-400 font-medium hover:text-indigo-600 transition-colors">
                              <div className={`w-1.5 h-1.5 rounded-full ${link.color || 'bg-slate-400'}`} />
                              <span className="truncate">{link.title}</span>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
              return (
                <Link key={item.name} to={item.href} className={cn("group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all relative overflow-hidden", isActive ? "bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-950 hover:text-slate-900 dark:hover:text-zinc-100", item.premium && "text-indigo-600 dark:text-indigo-400 font-black")}>
                  <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                  {item.name}
                  {item.premium && <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-[8px] font-black uppercase rounded text-indigo-700 dark:text-indigo-300">Novo</span>}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 px-1">
             <Link to="/dashboard/planos" className="flex items-center gap-3 p-4 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg transition-transform active:scale-95 group">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md"><Crown className="w-5 h-5 text-amber-300" /></div>
                <div>
                   <p className="text-white text-[10px] font-black uppercase tracking-widest opacity-80">Plano Atual</p>
                   <p className="text-white text-xs font-bold uppercase">{settings.subscription_plan || 'Acesso Exclusivo'}</p>
                </div>
             </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-4">Acompanhamento</h3>
             <div className="space-y-3 px-1">
                {['perda', 'critico', 'alerta'].map((key) => (
                   <div key={key} className={cn("rounded-2xl border overflow-hidden transition-all", key === 'perda' ? 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20' : key === 'critico' ? 'border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-950/20' : 'border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20')}>
                      <button onClick={() => setExpandedSections(p => ({ ...p, [key]: !p[key] }))} className="w-full flex items-center justify-between p-3.5 text-[10px] font-black uppercase">
                         <span className={cn(key === 'perda' ? 'text-red-900 dark:text-red-400' : key === 'critico' ? 'text-orange-900 dark:text-orange-400' : 'text-amber-900 dark:text-amber-400')}>
                            {key === 'perda' ? `Perda (${settings.perda_days}D+)` : key === 'critico' ? `Crítico (${settings.critico_days}D)` : `Alerta (${settings.alerta_days}D)`}
                         </span>
                         <div className="flex items-center gap-2">
                            <span className={cn("text-[8px] px-2 py-0.5 rounded-lg", key === 'perda' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : key === 'critico' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300')}>{stats[key as keyof typeof stats].length}</span>
                            <ChevronDown className={cn("w-3 h-3 transition-transform", expandedSections[key as keyof typeof expandedSections] && "rotate-180")} />
                         </div>
                      </button>
                      <AnimatePresence>
                         {expandedSections[key as keyof typeof expandedSections] && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden p-2 space-y-1.5 border-t border-black/5 dark:border-white/5">
                               {stats[key as keyof typeof stats].length > 0 ? stats[key as keyof typeof stats].map((item, id) => (
                                  <div key={id} className="text-[10px] p-2 bg-white/60 dark:bg-zinc-900/60 rounded-xl shadow-sm">
                                     <p className="font-black uppercase truncate text-slate-800 dark:text-zinc-200">{item.category} ({item.days}d)</p>
                                     <p className="opacity-70 truncate font-medium">{item.clientName}</p>
                                  </div>
                               )) : (
                                  <p className="text-[10px] text-center py-2 text-slate-400 font-bold uppercase italic">Sem alertas</p>
                               )}
                            </motion.div>
                         )}
                      </AnimatePresence>
                   </div>
                ))}
             </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <button onClick={() => setSettingsOpen(true)} className="w-full flex items-center px-3 py-3 text-sm font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-950 rounded-xl transition-all">
            <Settings className="mr-3 h-5 w-5 text-slate-400" /> Configurações
          </button>
          <button onClick={signOut} className="w-full flex items-center px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all">
            <LogOut className="mr-3 h-5 w-5 text-red-400" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800">
          <button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6 text-slate-500" /></button>
          <span className="font-bold text-lg">Represente-Me!</span>
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">{user?.email?.charAt(0).toUpperCase()}</div>
        </div>
        <div className={cn("flex-1 overflow-y-auto", isIntegrationView ? "p-0" : "p-4 sm:p-6 lg:p-8")}><Outlet /></div>
      </main>

      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-2xl p-8 w-full max-w-sm space-y-6 relative overflow-hidden">
              {settingsTab === 'menu' && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase tracking-tight">Ajustes</h2>
                    <button onClick={() => setSettingsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-3">
                    <button onClick={() => setSettingsTab('alerta')} className="w-full p-4 text-left bg-slate-50 dark:bg-zinc-950 rounded-2xl font-bold border border-slate-100 dark:border-zinc-800 hover:border-indigo-500 transition-all flex items-center justify-between group">
                       Configurar Alertas <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </button>
                    <button onClick={() => setSettingsTab('tema')} className="w-full p-4 text-left bg-slate-50 dark:bg-zinc-950 rounded-2xl font-bold border border-slate-100 dark:border-zinc-800 hover:border-indigo-500 transition-all flex items-center justify-between group">
                       Escolher Tema <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </button>
                  </div>
                </>
              )}
              {settingsTab === 'alerta' && (
                <>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSettingsTab('menu')} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-black uppercase tracking-tight">Alertas</h2>
                  </div>
                  <form onSubmit={async (e) => {
                     e.preventDefault(); setIsSaving(true);
                     const fd = new FormData(e.target as HTMLFormElement);
                     await updateSettings({ alerta_days: Number(fd.get('a')), critico_days: Number(fd.get('c')), perda_days: Number(fd.get('p')) });
                     setSaveSuccess(true); setTimeout(() => { setSaveSuccess(false); setSettingsOpen(false); setSettingsTab('menu'); }, 1000);
                  }} className="space-y-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Alerta (Dias)</label><input name="a" type="number" defaultValue={settings.alerta_days} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Crítico (Dias)</label><input name="c" type="number" defaultValue={settings.critico_days} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl font-bold" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Perda (Dias)</label><input name="p" type="number" defaultValue={settings.perda_days} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl font-bold" /></div>
                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 disabled:opacity-50">{isSaving ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar Alterações'}</button>
                  </form>
                </>
              )}
              {settingsTab === 'tema' && (
                <>
                   <div className="flex items-center gap-3"><button onClick={() => setSettingsTab('menu')} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button><h2 className="text-xl font-black uppercase tracking-tight">Tema</h2></div>
                   <div className="grid grid-cols-2 gap-4 mt-4">
                      <button onClick={() => updateSettings({ theme: 'light' })} className={cn("p-6 border-2 rounded-[24px] flex flex-col items-center gap-3 transition-all", settings.theme === 'light' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' : 'border-slate-100 dark:border-zinc-800 grayscale opacity-60')}>
                         <div className="p-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm"><Sun className="w-6 h-6 text-amber-500" /></div>
                         <span className="text-xs font-black uppercase">Claro</span>
                      </button>
                      <button onClick={() => updateSettings({ theme: 'dark' })} className={cn("p-6 border-2 rounded-[24px] flex flex-col items-center gap-3 transition-all", settings.theme === 'dark' ? 'border-indigo-600 bg-indigo-950 shadow-indigo-900/10' : 'border-slate-100 dark:border-zinc-800 grayscale opacity-60')}>
                         <div className="p-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm"><Moon className="w-6 h-6 text-indigo-400" /></div>
                         <span className="text-xs font-black uppercase">Escuro</span>
                      </button>
                   </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <OnboardingModal />
    </div>
  );
}
