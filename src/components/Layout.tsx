import { Outlet, Link, useLocation } from "react-router-dom";
import { Logo } from './Logo';
import { MapPin, Home, Link as LinkIcon, Users, Settings, Building2, LogOut, Menu, X, ChevronDown, ChevronUp, Sun, Moon, ChevronLeft, Calendar, ShoppingCart, Check, Shield, Mail } from "lucide-react";
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
  const isUserAdmin = user?.email === 'pedroborelamanzi@gmail.com';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'menu' | 'alerta' | 'tema'>('menu');
  const [integracoesOpen, setIntegracoesOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [shortcutLinks, setShortcutLinks] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<{perda: boolean, critico: boolean, alerta: boolean}>({ perda: false, critico: false, alerta: false });
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
      if (!user || !settings) return;
      
      const { data, error } = await supabase
        .from("clients")
        .select("name, category_last_contact")
        .eq("user_id", user.id);

      if (error) {
        return;
      }

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
    { name: "E-mail", href: "/dashboard/email", icon: Mail },
    
  ];

  const isIntegrationView = location.pathname.includes('/links') && location.search.includes('id=');

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
            <Logo className='h-8 mx-auto' />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:text-zinc-300">
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
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 hover:text-slate-900 dark:text-zinc-100"
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon
                          className={cn(
                            "mr-3 flex-shrink-0 h-5 w-5 transition-colors",
                            isActive || integracoesOpen ? "text-emerald-600" : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-500 dark:text-zinc-400"
                          )}
                        />
                        {item.name}
                      </div>
                      {integracoesOpen ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-zinc-500" />}
                    </button>

                    <AnimatePresence>
                      {integracoesOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pl-8 space-y-1"
                        >
                          <Link
                            to="/dashboard/links"
                            className="flex items-center px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 dark:bg-zinc-950 transition-colors"
                          >
                             Ver Todos
                          </Link>
                          {shortcutLinks.map((link) => (
                            <Link
                              key={link.id}
                              to={`/dashboard/links?id=${link.id}`}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 dark:bg-zinc-950 transition-colors"
                            >
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
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 hover:text-slate-900 dark:text-zinc-100"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 flex-shrink-0 h-5 w-5 transition-colors",
                      isActive ? "text-emerald-600" : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-500 dark:text-zinc-400"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-900">
             <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider px-3 mb-3">
               Acompanhamento
             </h3>
             <div className="space-y-2 px-1">
                
                {/* Perda Section */}
                <div className="rounded-xl border border-red-100 bg-red-50/50 overflow-hidden transition-all duration-300">
                  <button 
                    type="button"
                    onClick={() => setExpandedSections(prev => ({ ...prev, perda: !prev.perda }))}
                    className="w-full flex items-center justify-between p-2.5 bg-red-50 hover:bg-red-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-red-500" />
                       <span className="text-xs font-bold text-red-900">Perda ({settings?.perda_days}D+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-md">{stats.perda.length}</span>
                      <ChevronDown className={cn("w-3 h-3 text-red-400 transition-transform", expandedSections.perda && "rotate-180")} />
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedSections.perda && stats.perda.length > 0 && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden p-2 space-y-1.5 border-t border-red-100/50"
                      >
                        {stats.perda.map((item, idx) => (
                          <div key={idx} className="text-[11px] leading-tight flex flex-col gap-0.5 p-1.5 hover:bg-red-100/50 rounded-lg transition-colors">
                            <span className="font-bold text-red-900">{item.category} <span className="text-red-500 font-medium">({item.days}d)</span></span>
                            <span className="text-red-700 truncate opacity-90">{item.clientName}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Crítico Section */}
                <div className="rounded-xl border border-orange-100 bg-orange-50/50 overflow-hidden transition-all duration-300">
                  <button 
                    type="button"
                    onClick={() => setExpandedSections(prev => ({ ...prev, critico: !prev.critico }))}
                    className="w-full flex items-center justify-between p-2.5 bg-orange-50 hover:bg-orange-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-orange-500" />
                       <span className="text-xs font-bold text-orange-900">Crítico ({settings?.critico_days}D)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-md">{stats.critico.length}</span>
                      <ChevronDown className={cn("w-3 h-3 text-orange-400 transition-transform", expandedSections.critico && "rotate-180")} />
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedSections.critico && stats.critico.length > 0 && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden p-2 space-y-1.5 border-t border-orange-100/50"
                      >
                        {stats.critico.map((item, idx) => (
                          <div key={idx} className="text-[11px] leading-tight flex flex-col gap-0.5 p-1.5 hover:bg-orange-100/50 rounded-lg transition-colors">
                            <span className="font-bold text-red-900">{item.category} <span className="text-red-500 font-medium">({item.days}d)</span></span>
                            <span className="text-red-700 truncate opacity-90">{item.clientName}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Alerta Section */}
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 overflow-hidden transition-all duration-300">
                  <button 
                    type="button"
                    onClick={() => setExpandedSections(prev => ({ ...prev, alerta: !prev.alerta }))}
                    className="w-full flex items-center justify-between p-2.5 bg-amber-50 hover:bg-amber-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-amber-500" />
                       <span className="text-xs font-bold text-amber-900">Alerta ({settings?.alerta_days}D)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md">{stats.alerta.length}</span>
                      <ChevronDown className={cn("w-3 h-3 text-amber-400 transition-transform", expandedSections.alerta && "rotate-180")} />
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedSections.alerta && stats.alerta.length > 0 && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden p-2 space-y-1.5 border-t border-amber-100/50"
                      >
                        {stats.alerta.map((item, idx) => (
                           <div key={idx} className="text-[11px] leading-tight flex flex-col gap-0.5 p-1.5 hover:bg-amber-100/50 rounded-lg transition-colors">
                             <span className="font-bold text-amber-900">{item.category} <span className="text-amber-500 font-medium">({item.days}d)</span></span>
                             <span className="text-amber-700 truncate opacity-90">{item.clientName}</span>
                           </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
          </div>
        </div>

        <div className="flex-shrink-0 p-4 border-t border-slate-100 dark:border-zinc-900 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-zinc-100 truncate">Usuário Ativo</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <button onClick={() => setSettingsOpen(true)} className="w-full group flex items-center px-3 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 rounded-xl hover:bg-slate-50 dark:bg-zinc-950 transition-colors mb-1">
              <Settings className="mr-3 flex-shrink-0 h-5 w-5 text-slate-400 dark:text-zinc-500 group-hover:text-slate-500 dark:text-zinc-400" />
              Configurações
            </button>
            <button onClick={signOut} className="w-full group flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors">
              <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-red-500 group-hover:text-red-600" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:text-zinc-300">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-zinc-100">Represente-se</span>
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
             {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
        </div>

        <div className={cn(
          cn("flex-1", location.pathname.includes('/email') ? "overflow-hidden" : "overflow-y-auto"),
          isIntegrationView ? "p-0" : "p-4 sm:p-6 lg:p-8"
        )}>
          <Outlet />
        </div>
      </main>

      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl p-6 w-full max-w-sm space-y-4 relative">
              
              {settingsTab === 'menu' && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Configurações</h2>
                    <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <button onClick={() => setSettingsTab('alerta')} className="w-full p-3 text-left bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 rounded-xl font-medium text-slate-800 dark:text-zinc-200 transition-colors">Configurar Alertas</button>
                    <button onClick={() => setSettingsTab('tema')} className="w-full p-3 text-left bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 rounded-xl font-medium text-slate-800 dark:text-zinc-200 transition-colors">Escolher Tema</button>
                  </div>
                  <div className="pt-2">
                    <button onClick={() => setSettingsOpen(false)} className="w-full px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 font-medium text-sm">Fechar</button>
                  </div>
                </>
              )}

              {settingsTab === 'alerta' && (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSettingsTab('menu')} className="text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:text-zinc-300"><ChevronLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Configurar Alertas</h2>
                  </div>
                  <form onSubmit={async (e) => {
                     e.preventDefault();
                     setIsSaving(true);
                     const formData = new FormData(e.target as HTMLFormElement);
                     try {
                         await updateSettings({
                            alerta_days: Number(formData.get('alerta')),
                            critico_days: Number(formData.get('critico')),
                            perda_days: Number(formData.get('perda')),
                            inativo_days: Number(formData.get('inativo'))
                         });
                         setSaveSuccess(true);
                         setTimeout(() => {
                           setSaveSuccess(false);
                           setSettingsTab('menu');
                           setSettingsOpen(false);
                         }, 1500);
                     } catch (err) { 
                       alert("Erro ao salvar."); 
                       setIsSaving(false);
                     }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Alerta (dias)</label>
                      <input name="alerta" type="number" step="1" min="0" defaultValue={settings.alerta_days} className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm bg-white dark:bg-zinc-950 dark:text-zinc-100" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Crítico (dias)</label>
                      <input name="critico" type="number" step="1" min="0" defaultValue={settings.critico_days} className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm bg-white dark:bg-zinc-950 dark:text-zinc-100" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Perda (dias)</label>
                      <input name="perda" type="number" step="1" min="0" defaultValue={settings.perda_days} className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm bg-white dark:bg-zinc-950 dark:text-zinc-100" required />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button type="button" onClick={() => setSettingsTab('menu')} className="flex-1 px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 font-medium text-sm">Voltar</button>
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-xl shadow-sm font-medium text-sm transition-all flex items-center justify-center gap-2",
                          saveSuccess ? "bg-emerald-500 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700",
                          isSaving && !saveSuccess && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        {saveSuccess ? (
                          <>
                            <Check className="w-4 h-4" />
                            Salvo!
                          </>
                        ) : (
                          isSaving ? "Salvando..." : "Salvar"
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {settingsTab === 'tema' && (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSettingsTab('menu')} className="text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:text-zinc-300"><ChevronLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Escolher Tema</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={async () => { await updateSettings({ theme: 'light' }); setSettingsOpen(false); setSettingsTab('menu'); }} className={`p-4 border rounded-xl flex flex-col items-center gap-2 ${settings.theme === 'light' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 dark:border-zinc-800'}`}>
                       <Sun className="w-6 h-6 text-slate-600 dark:text-zinc-400" />
                       <span className="text-sm font-medium text-slate-800 dark:text-zinc-200">Claro</span>
                    </button>
                    <button onClick={async () => { await updateSettings({ theme: 'dark' }); setSettingsOpen(false); setSettingsTab('menu'); }} className={`p-4 border rounded-xl flex flex-col items-center gap-2 ${settings.theme === 'dark' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 dark:border-zinc-800'}`}>
                       <Moon className="w-6 h-6 text-slate-600 dark:text-zinc-400" />
                       <span className="text-sm font-medium text-slate-800 dark:text-zinc-200">Escuro</span>
                    </button>
                  </div>
                  <div className="pt-2">
                    <button onClick={() => setSettingsTab('menu')} className="w-full px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 font-medium text-sm">Voltar</button>
                  </div>
                </>
              )}

            </div>
          </div>
        )}
      </AnimatePresence>
      <OnboardingModal />
    </div>
  );
}

