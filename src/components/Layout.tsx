import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Map as MapIcon, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Bell, 
  Shield, 
  Palette,
  Building2,
  ChevronDown,
  User,
  Mail
} from 'lucide-react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import SettingsModal from './SettingsModal';
import { Logo } from './Logo';
import { SubscriptionGuard } from './SubscriptionGuard';

export default function Layout() {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Início', path: '/dashboard' },
    { icon: MapIcon, label: 'Mapa de Clientes', path: '/dashboard/map' },
    { icon: Users, label: 'Meus Clientes', path: '/dashboard/clientes' },
    { icon: Building2, label: 'Empresas & Pedidos', path: '/dashboard/empresas' },
    { icon: Calendar, label: 'Minha Agenda', path: '/dashboard/agenda' },
    { icon: Mail, label: 'E-mails', path: '/dashboard/email' },
  ];

  return (
    <SubscriptionGuard>
      <div className="flex h-screen bg-slate-100/60 dark:bg-zinc-950 transition-colors duration-300">
        <AnimatePresence mode='wait'>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside className={cn(
          "fixed inset-y-0 left-0 z-[101] w-[280px] bg-white dark:bg-zinc-900 border-r border-slate-100 dark:border-zinc-800 transition-all duration-500 ease-in-out lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          !desktopSidebarOpen && "lg:-translate-x-full lg:w-0 lg:overflow-hidden lg:border-r-0 lg:opacity-0"
        )}>
          <div className="flex flex-col h-full">
            <div className="p-8 flex items-center justify-between">
              <Logo size="sm" />
              <button 
                onClick={() => setDesktopSidebarOpen(false)}
                className="hidden lg:flex p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-100 dark:border-zinc-800/80 rounded-xl text-slate-400 hover:text-emerald-600 transition-all duration-300 active:scale-95"
                title="Ocultar Menu Lateral"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 mb-8">
              <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-[24px] border border-slate-100 dark:border-zinc-700/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-black text-white overflow-hidden shadow-sm">
                    {settings.avatar_url ? (
                      <img src={settings.avatar_url} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                      user?.email?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-zinc-100 truncate uppercase">Representante</p>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-400 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                      isActive 
                        ? "bg-slate-900 dark:bg-zinc-800 text-white shadow-lg shadow-slate-900/10" 
                        : "text-slate-500 dark:text-zinc-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-zinc-800/30"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                      isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-600"
                    )} />
                    <span className="text-[13px] font-bold uppercase tracking-tight">{item.label}</span>
                    {isActive && (
                      <motion.div 
                        layoutId="active-pill"
                        className="absolute left-0 w-1 h-6 bg-emerald-400 rounded-r-full"
                      />
                    )}
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800/50">
                <p className="px-4 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personalização</p>
                
                <div className='space-y-1'>
                  <button
                    onClick={() => {
                      setIsSettingsModalOpen(true);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl transition-all duration-300 text-slate-500 dark:text-zinc-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-zinc-800/30",
                      isSettingsModalOpen && "text-emerald-600 bg-slate-50 dark:bg-zinc-800/30"
                    )}
                  >
                    <Settings className='w-5 h-5' />
                    <span className="text-[13px] font-bold uppercase tracking-tight">Configurações</span>
                  </button>
                </div>

                <button onClick={() => signOut()} className="flex items-center gap-4 w-full px-4 py-3.5 mt-2 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-300">
                  <LogOut className="w-5 h-5" />
                  <span className="text-[13px] font-bold uppercase tracking-tight">Sair do Sistema</span>
                </button>
              </div>
            </nav>

            <div className="p-8 mt-auto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Versão 2.4.2</p>
                  <p className="text-[8px] font-medium text-emerald-500 uppercase tracking-widest">Neural Engine 2026</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-800 flex items-center justify-center">
                   <Shield className="w-4 h-4 text-emerald-600 opacity-20" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <header className="lg:hidden h-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all active:scale-90">
                <Menu className="w-6 h-6" />
              </button>
              <Link to="/dashboard" className="font-black text-base uppercase tracking-tighter text-slate-900 dark:text-zinc-100">Represente-se</Link>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-900 bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white shadow-sm overflow-hidden">
                  {settings.avatar_url ? (
                    <img src={settings.avatar_url} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    user?.email?.charAt(0).toUpperCase()
                  )}
               </div>
            </div>
          </header>

          {/* Floating toggle for desktop when collapsed */}
          {!desktopSidebarOpen && (
            <button 
              onClick={() => setDesktopSidebarOpen(true)}
              className="hidden lg:flex fixed top-6 left-6 z-[99] p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all shadow-md active:scale-95 animate-in fade-in zoom-in-75 duration-300"
              title="Mostrar Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <main className={cn(
            "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-12 scroll-smooth custom-scrollbar transition-all duration-300",
            !desktopSidebarOpen && "lg:pl-24"
          )}>
            <div className="mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SubscriptionGuard>
  );
}
