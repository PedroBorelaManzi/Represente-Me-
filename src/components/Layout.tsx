import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Users, 
  Building2, 
  Calendar as CalendarIcon,
  LogOut,
  Menu,
  X,
  Mail,
  ChevronDown,
  ChevronUp,
  Settings,
  ShoppingBag
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const navigation = [
  { name: "Painel de Controle", href: "/dashboard", icon: LayoutDashboard },
  { name: "Radar Territorial", href: "/dashboard/map", icon: MapIcon },
  { name: "Carteira de Clientes", href: "/dashboard/clientes", icon: Users },
  { name: "Pedidos e Empresas", href: "/dashboard/empresas", icon: Building2 },
  { name: "Agenda Comercial", href: "/dashboard/agenda", icon: CalendarIcon },
  { name: "Caixa de Entrada", href: "/dashboard/email", icon: Mail },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [integracoesOpen, setIntegracoesOpen] = useState(false);
  const [shortcutLinks, setShortcutLinks] = useState<any[]>([]);

  // Auto-collapse sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (user) loadLinks();
  }, [user]);

  const loadLinks = async () => {
    const { data } = await supabase
      .from("dashboard_links")
      .select("*")
      .eq("user_id", user?.id)
      .eq("is_shortcut", true)
      .order("created_at");
    setShortcutLinks(data || []);
  };

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans selection:bg-emerald-100 selection:text-emerald-900 transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Section */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[110] w-72 bg-white dark:bg-zinc-900 border-r border-slate-100 dark:border-zinc-800 transform transition-all duration-500 ease-spring lg:translate-x-0 lg:static lg:inset-auto",
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col p-6">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center justify-center p-2 mb-6">
            <Logo className='h-8 mx-auto' />
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
            <p className="px-3 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4">MÃ³dulos EstratÃ©gicos</p>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              const isIntegracoes = item.name === "IntegraÃ§Ãµes";

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

          {/* Bottom Actions */}
          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-zinc-800 space-y-2">
            <button
              onClick={toggleTheme}
              className="group flex items-center w-full px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-zinc-400 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:text-zinc-100 transition-all"
            >
              <Settings className="mr-3 h-5 w-5 text-slate-400 dark:text-zinc-500 group-hover:text-slate-500 dark:text-zinc-400" />
              ConfiguraÃ§Ãµes
            </button>
            <button
              onClick={() => signOut()}
              className="group flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
            >
              <LogOut className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-600" />
              Sair da Conta
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header - High Precision Styling */}
        <header className="lg:hidden h-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all active:scale-90"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/dashboard" className="font-black text-base uppercase tracking-tighter text-slate-900 dark:text-zinc-100">Represente-se</Link>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-900 bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                   {user?.email?.charAt(0).toUpperCase()}
                </div>
             </div>
          </div>
        </header>

        {/* Global Page Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 scroll-smooth custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
