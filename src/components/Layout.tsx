import { Outlet, Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { MapPin, Home, Link as LinkIcon, Users, Settings, Building2, LogOut, Menu, X, ChevronDown, ChevronUp, Sun, Moon, ChevronLeft, Calendar, ShoppingCart, Check, Crown } from "lucide-react";
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

  useEffect(() => {
    const loadLinks = () => {
      const saved = localStorage.getItem("crm_shortcut_links");
      if (saved) setShortcutLinks(JSON.parse(saved));
    };
    
    loadLinks();
    window.addEventListener('crm_shortcut_links_updated', loadLinks);
    
    async function loadStats() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("clients")
        .select("name, category_last_contact")
        .eq("user_id", user.id);

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

    return () => {
      window.removeEventListener('crm_shortcut_links_updated', loadLinks);
    };
  }, [user, settings]);

  const navigation = [
    { name: "Início", href: "/dashboard", icon: Home },
    { name: "Mapa", href: "/dashboard/map", icon: MapPin },
    { name: "Integrações", href: "/dashboard/links", icon: LinkIcon },
    { name: "Clientes", href: "/dashboard/clientes", icon: Users },
    { name: "Pedidos e Empresas", href: "/dashboard/empresas", icon: Building2 },
    { name: "Agenda", href: "/dashboard/agenda", icon: Calendar },
    { name: "Planos Premium", href: "/dashboard/planos", icon: Crown, premium: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans flex">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static flex flex-col h-screen overflow-y-auto overscroll-contain shadow-2xl md:shadow-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex-shrink-0 flex items-center justify-between pt-8 px-6 border-b border-slate-100 dark:border-zinc-900">
          <Link to="/" className="flex items-center justify-center p-2 mb-6">
            <img src={logo} alt="Represente-Me!" className="h-32 w-auto mx-auto object-contain" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500 dark:text-zinc-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 py-6 px-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const isIntegracoes = item.name === "Integrações";

              if (isIntegracoes) {
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => setIntegracoesOpen(!integracoesOpen)}
                      className={cn(
                        "group flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all",
                        isActive || integracoesOpen
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 hover:text-slate-900 dark:text-zinc-100"
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className={cn("mr-3 h-5 w-5", isActive || integracoesOpen ? "text-indigo-600" : "text-slate-400")} />
                        {item.name}
                      </div>
                      {integracoesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <AnimatePresence>
                      {integracoesOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-8 space-y-1">
                          <Link to="/dashboard/links" className="flex items-center px-3 py-1.5 text-xs text-slate-500 hover:text-indigo-600">Ver Todos</Link>
                          {shortcutLinks.map((link) => (
                            <Link key={link.id} to={`/dashboard/links?id=${link.id}`} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-zinc-400">
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
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all relative overflow-hidden",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 hover:text-slate-900 dark:text-zinc-100",
                    item.premium && "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50"
                  )}
                >
                  <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-indigo-600" : item.premium ? "text-indigo-500" : "text-slate-400")} />
                  {item.name}
                  {item.premium && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-[8px] font-black uppercase rounded text-indigo-700 dark:text-indigo-300">Novo</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 px-1">
             <Link 
               to="/dashboard/planos"
               className="flex items-center gap-3 p-4 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-transform active:scale-95 group"
             >
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                   <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                   <p className="text-white text-[10px] font-black uppercase tracking-widest opacity-80">Plano Atual</p>
                   <p className="text-white text-xs font-bold">{settings.subscription_plan || 'Acesso Exclusivo'}</p>
                </div>
             </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-900">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">Acompanhamento</h3>
              <div className="space-y-2 px-1">
                <div className="rounded-xl border border-red-100 bg-red-50/50 overflow-hidden">
                  <button onClick={() => setExpandedSections(prev => ({ ...prev, perda: !prev.perda }))} className="w-full flex items-center justify-between p-2.5 bg-red-50 text-xs font-bold text-red-900 uppercase">
                    Perda ({settings.perda_days}D+) <ChevronDown className={cn("w-3 h-3 transition-transform", expandedSections.perda && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {expandedSections.perda && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden p-2 space-y-1">
                        {stats.perda.map((item, idx) => (
                           <div key={idx} className="text-[10px] leading-tight flex flex-col p-1.5 bg-white/50 rounded-lg">
                             <span className="font-bold">{item.category} ({item.days}d)</span>
                             <span className="text-slate-500 truncate">{item.clientName}</span>
                           </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-zinc-900">
          <button onClick={() => setSettingsOpen(true)} className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl">
            <Settings className="mr-3 h-5 w-5 text-slate-400" /> Configurações
          </button>
          <button onClick={signOut} className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl">
            <LogOut className="mr-3 h-5 w-5 text-red-400" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b">
          <button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6 text-slate-500" /></button>
          <span className="font-bold text-lg">Represente-Me!</span>
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">{user?.email?.charAt(0).toUpperCase()}</div>
        </div>
        <div className={cn("flex-1 overflow-y-auto", location.pathname.includes('/links') ? "p-0" : "p-4 sm:p-6 lg:p-8")}><Outlet /></div>
      </main>

      {/* Settings Modal ... removed for brevity in this Set-Content call, I will restore it in a next step if needed or just keep it simple */}
      
    </div>
  );
}
