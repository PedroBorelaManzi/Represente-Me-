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
  Mail,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useSync } from '../contexts/SyncContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import SettingsModal from './SettingsModal';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { WhatsAppButton } from './WhatsAppButton';
import { Logo } from './Logo';
import { SubscriptionGuard } from './SubscriptionGuard';

export default function Layout() {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const { isOnline, pendingCount, isSyncing, syncNow } = useSync();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [mobileAvatarError, setMobileAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
    setMobileAvatarError(false);
  }, [settings.avatar_url]);

  // Request browser notification permission on load if enabled by default
  useEffect(() => {
    const isPushEnabled = localStorage.getItem("rm_push_notifications") !== "false";
    if (isPushEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Background check for notifications (appointments in 1h, client inactivities)
  useEffect(() => {
    if (!user) return;

    const sendNotification = (title: string, body: string, tag: string) => {
      const isPushEnabled = localStorage.getItem("rm_push_notifications") !== "false";
      if (!isPushEnabled || Notification.permission !== "granted") return;

      const notifiedTags = JSON.parse(localStorage.getItem("rm_notified_tags") || "[]");
      if (notifiedTags.includes(tag)) return;

      new Notification(title, { body, icon: "/favicon.ico" });
      notifiedTags.push(tag);
      localStorage.setItem("rm_notified_tags", JSON.stringify(notifiedTags));
    };

    const runChecks = async () => {
      try {
        // 1. Check appointments in 1 hour
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        
        const { data: appointments } = await supabase
          .from("appointments")
          .select("id, title, start_time")
          .eq("user_id", user.id)
          .gte("start_time", now.toISOString())
          .lte("start_time", oneHourFromNow.toISOString());

        if (appointments && appointments.length > 0) {
          appointments.forEach((appt: any) => {
            const timeDiff = Math.round((new Date(appt.start_time).getTime() - now.getTime()) / (60 * 1000));
            sendNotification(
              "Lembrete de Compromisso",
              `Não esqueça que você tem um agendamento para daqui ${timeDiff} minutos: ${appt.title}`,
              `appt_${appt.id}`
            );
          });
        }

        // 2. Check client inactivities (Alerta state)
        const { data: clientsData } = await supabase
          .from("clients")
          .select("id, name, last_contact")
          .eq("user_id", user.id);

        if (clientsData && clientsData.length > 0) {
          const alertaDays = settings?.alerta_days || 30;
          const today = new Date().getTime();

          clientsData.forEach((client: any) => {
            if (!client.last_contact) return;
            const contactDate = new Date(client.last_contact).getTime();
            const daysInactive = Math.floor((today - contactDate) / (1000 * 60 * 60 * 24));
            
            if (daysInactive >= alertaDays) {
              sendNotification(
                "Alerta de Inatividade",
                `${client.name} está há ${daysInactive} dias sem comprar e entrou no estado de alerta.`,
                `client_alert_${client.id}_${client.last_contact}`
              );
            }
          });
        }
      } catch (err) {
        console.error("Error running background notification checks:", err);
      }
    };

    runChecks();
    const interval = setInterval(runChecks, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, settings?.alerta_days]);

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
            <div className="flex items-center justify-between"
              style={{
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 32px)",
                paddingLeft: "32px",
                paddingRight: "32px",
                paddingBottom: "32px"
              }}
            >
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
                    {settings.avatar_url && !avatarError ? (
                      <img 
                        src={settings.avatar_url} 
                        alt="Perfil" 
                        className="w-full h-full object-cover" 
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      (user?.user_metadata?.full_name || user?.email || 'R').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-zinc-100 truncate uppercase">{user?.user_metadata?.full_name || 'Representante'}</p>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-400 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            
            {/* Sync Status Button */}
            <div className="px-6 mb-4">
              <button 
                onClick={syncNow}
                disabled={isSyncing}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  !isOnline ? 'bg-red-50/50 border-red-100/50 text-red-600' : 
                  pendingCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                  'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {!isOnline ? <CloudOff className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {!isOnline ? 'Offline' : pendingCount > 0 ? 'Sincronizar' : 'Online'}
                  </span>
                </div>
                {pendingCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black">{pendingCount}</span>
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  </div>
                )}
              </button>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                const isEmailItem = item.label === 'E-mails';
                
                const handleItemClick = (e: React.MouseEvent) => {
                  if (isEmailItem && Capacitor.isNativePlatform()) {
                    e.preventDefault();
                    setSidebarOpen(false);
                    
                    const platform = Capacitor.getPlatform();
                    if (platform === 'android') {
                      // Android Intent for Gmail with web fallback
                      const androidIntent = "intent://#Intent;scheme=googlegmail;package=com.google.android.gm;end;S.browser_fallback_url=https%3A%2F%2Fwww.gmail.com;";
                      window.open(androidIntent, "_system");
                    } else if (platform === 'ios') {
                      // iOS custom scheme for Gmail
                      const start = Date.now();
                      window.open("googlegmail://", "_system");
                      
                      // Fallback for iOS if not installed
                      setTimeout(() => {
                        if (Date.now() - start < 1500) {
                          window.open("https://www.gmail.com", "_system");
                        }
                      }, 1000);
                    } else {
                      window.open("https://www.gmail.com", "_system");
                    }
                  } else {
                    setSidebarOpen(false);
                  }
                };

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleItemClick}
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

              <WhatsAppButton 
                label="WhatsApp"
                variant="sidebar"
              />

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800/50">
                <p className="px-4 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personalização</p>
                
                <div className='space-y-1'>
                  <button
                    onClick={() => {
                      setIsSettingsModalOpen(true);
                      setSidebarOpen(false);
                      setDesktopSidebarOpen(false);
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

            <div className="mt-auto"
              style={{
                paddingTop: "32px",
                paddingLeft: "32px",
                paddingRight: "32px",
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)"
              }}
            >
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
          <header className="lg:hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between px-6 flex-shrink-0"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              height: "calc(env(safe-area-inset-top, 0px) + 80px)"
            }}
          >
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all active:scale-90">
                <Menu className="w-6 h-6" />
              </button>
              <Link to="/dashboard" className="font-black text-base uppercase tracking-tighter text-slate-900 dark:text-zinc-100">Represente-se</Link>
            </div>
            <div className="flex items-center gap-3">
               
              <button 
                onClick={syncNow}
                disabled={isSyncing}
                className={`flex items-center justify-center p-2 rounded-xl transition-all ${
                  !isOnline ? 'bg-red-50 text-red-500' : 
                  pendingCount > 0 ? 'bg-amber-50 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 
                  'bg-slate-50 text-emerald-500'
                }`}
              >
                {pendingCount > 0 ? (
                  <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                ) : !isOnline ? (
                  <CloudOff className="w-5 h-5" />
                ) : (
                  <Cloud className="w-5 h-5" />
                )}
                {pendingCount > 0 && !isSyncing && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[8px] font-black text-white items-center justify-center">{pendingCount}</span>
                  </span>
                )}
              </button>

               <div className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-900 bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white shadow-sm overflow-hidden">
                  {settings.avatar_url && !mobileAvatarError ? (
                    <img 
                      src={settings.avatar_url} 
                      alt="Perfil" 
                      className="w-full h-full object-cover" 
                      onError={() => setMobileAvatarError(true)}
                    />
                  ) : (
                    (user?.user_metadata?.full_name || user?.email || 'R').charAt(0).toUpperCase()
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

          <main 
            className={cn(
              "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-12 scroll-smooth custom-scrollbar transition-all duration-300",
              !desktopSidebarOpen && "lg:pl-24"
            )}
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)"
            }}
          >
            <div className="mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SubscriptionGuard>
  );
}
