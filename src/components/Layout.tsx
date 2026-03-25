import { Outlet, Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { MapPin, LayoutDashboard, Link as LinkIcon, Users, Settings, Building2, LogOut, Menu, X, ChevronDown, ChevronUp, Sun, Moon, ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext"; // Added
import OnboardingModal from "./OnboardingModal";
import { supabase } from "../lib/supabase";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const location = useLocation();
  const { signOut, user } = useAuth();
  const { settings, updateSettings } = useSettings(); // Added
  const [settingsOpen, setSettingsOpen] = useState(false); // Added
  const [settingsTab, setSettingsTab] = useState<'menu' | 'alerta' | 'tema'>('menu');
  const [integracoesOpen, setIntegracoesOpen] = useState(false);
  const [shortcutLinks, setShortcutLinks] = useState<any[]>([]);
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
  }, [user]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Mapa", href: "/dashboard/map", icon: MapPin },
    { name: "Integrações", href: "/dashboard/links", icon: LinkIcon },
    { name: "Clientes", href: "/dashboard/clientes", icon: Users },
    { name: "Empresas", href: "/dashboard/empresas", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100 dark:border-zinc-900">
          <Link to="/" className="block p-4 bg-slate-950 rounded-xl mb-4">
            <img src={logo} alt="Represente-Me!" className="h-10 w-auto mx-auto" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:text-zinc-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
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
                        <item.icon
                          className={cn(
                            "mr-3 flex-shrink-0 h-5 w-5 transition-colors",
                            isActive || integracoesOpen ? "text-indigo-600" : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-500 dark:text-zinc-400"
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
                          {/* Item geral */}
                          <Link
                            to="/dashboard/links"
                            className="flex items-center px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 dark:bg-zinc-950 transition-colors"
                          >
                             Ver Todos
                          </Link>
                          {shortcutLinks.map((link) => (
                            <Link
                              key={link.id}
                              to={`/dashboard/links?id=${link.id}`}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 dark:bg-zinc-950 transition-colors"
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
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 hover:text-slate-900 dark:text-zinc-100"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 flex-shrink-0 h-5 w-5 transition-colors",
                      isActive ? "text-indigo-600" : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-500 dark:text-zinc-400"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Inactivity Stats Section */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-900">
             <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider px-3 mb-3">
               Acompanhamento
             </h3>
             <div className="space-y-3 px-1">
                
                {/* Perda */}
                <div className="rounded-xl border border-red-100 bg-red-50/50 overflow-hidden">
                  <div className="flex items-center justify-between p-2.5 bg-red-50">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-red-500" />
                       <span className="text-xs font-bold text-red-900">Perda ({settings.perda_days}D+)</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-md">{stats.perda.length}</span>
                  </div>
                  {stats.perda.length > 0 && (
                    <div className="p-2 space-y-1.5 border-t border-red-100/50">
                      {stats.perda.map((item, idx) => (
                        <div key={idx} className="text-[11px] leading-tight flex flex-col gap-0.5 p-1.5 hover:bg-red-100/50 rounded-lg transition-colors">
                          <span className="font-bold text-red-900">{item.category} <span className="text-red-500 font-medium">({item.days}d)</span></span>
                          <span className="text-red-700 truncate opacity-90">{item.clientName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Critico */}
                <div className="rounded-xl border border-orange-100 bg-orange-50/50 overflow-hidden">
                  <div className="flex items-center justify-between p-2.5 bg-orange-50">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-orange-500" />
                       <span className="text-xs font-bold text-orange-900">Crítico ({settings.critico_days}D)</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-md">{stats.critico.length}</span>
                  </div>
                  {stats.critico.length > 0 && (
                    <div className="p-2 space-y-1.5 border-t border-orange-100/50">
                      {stats.critico.map((item, idx) => (
                        <div key={idx} className="text-[11px] leading-tight flex flex-col gap-0.5 p-1.5 hover:bg-orange-100/50 rounded-lg transition-colors">
                          <span className="font-bold text-orange-900">{item.category} <span className="text-orange-500 font-medium">({item.days}d)</span></span>
                          <span className="text-orange-700 truncate opacity-90">{item.clientName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Alerta */}
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 overflow-hidden">
                  <div className="flex items-center justify-between p-2.5 bg-amber-50">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-amber-500" />
                       <span className="text-xs font-bold text-amber-900">Alerta ({settings.alerta_days}D)</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md">{stats.alerta.length}</span>
                  </div>
                  {stats.alerta.length > 0 && (
                    <div className="p-2 space-y-1.5 border-t border-amber-100/50">
                      {stats.alerta.map((item, idx) => (
                         <div key={idx} className="text-[11px] leading-tight flex flex-col gap-0.5 p-1.5 hover:bg-amber-100/50 rounded-lg transition-colors">
                           <span className="font-bold text-amber-900">{item.category} <span className="text-amber-500 font-medium">({item.days}d)</span></span>
                           <span className="text-amber-700 truncate opacity-90">{item.clientName}</span>
                         </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-zinc-900">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:text-zinc-300">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-zinc-100">Represente-Me!</span>
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
             {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Modal de Configurações */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl p-6 w-full max-w-sm space-y-4">
              
              {settingsTab === 'menu' && (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Configurações</h2>
                  <div className="space-y-2">
                    <button onClick={() => setSettingsTab('alerta')} className="w-full p-3 text-left bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 rounded-xl font-medium text-slate-800 transition-colors">Configurar Alertas</button>
                    <button onClick={() => setSettingsTab('tema')} className="w-full p-3 text-left bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 rounded-xl font-medium text-slate-800 transition-colors">Escolher Tema</button>
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
                     const formData = new FormData(e.target as HTMLFormElement);
                     try {
                         await updateSettings({
                            alerta_days: Number(formData.get('alerta')),
                            critico_days: Number(formData.get('critico')),
                            perda_days: Number(formData.get('perda'))
                         });
                         setSettingsTab('menu');
                         setSettingsOpen(false);
                     } catch (err) { alert("Erro ao salvar."); }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Alerta (dias)</label>
                      <input name="alerta" type="number" defaultValue={settings.alerta_days} className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Crítico (dias)</label>
                      <input name="critico" type="number" defaultValue={settings.critico_days} className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Perda (dias)</label>
                      <input name="perda" type="number" defaultValue={settings.perda_days} className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" required />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button type="button" onClick={() => setSettingsTab('menu')} className="flex-1 px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 font-medium text-sm">Voltar</button>
                      <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm dark:shadow-none hover:bg-indigo-700 font-medium text-sm">Salvar</button>
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
                    <button onClick={async () => { await updateSettings({ theme: 'light' }); }} className={`p-4 border rounded-xl flex flex-col items-center gap-2 ${settings.theme === 'light' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 dark:border-zinc-800'}`}>
                       <Sun className="w-6 h-6 text-slate-600 dark:text-zinc-400" />
                       <span className="text-sm font-medium text-slate-800">Claro</span>
                    </button>
                    <button onClick={async () => { await updateSettings({ theme: 'dark' }); }} className={`p-4 border rounded-xl flex flex-col items-center gap-2 ${settings.theme === 'dark' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 dark:border-zinc-800'}`}>
                       <Moon className="w-6 h-6 text-slate-600 dark:text-zinc-400" />
                       <span className="text-sm font-medium text-slate-800">Escuro</span>
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
