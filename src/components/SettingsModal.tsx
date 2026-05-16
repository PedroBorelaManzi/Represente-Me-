import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  CreditCard,
  LogOut,
  Moon,
  Sun,
  Globe,
  Smartphone,
  ChevronRight,
  Sparkles,
  Trophy,
  Crown,
  Gem,
  CheckCircle2,
  AlertCircle,
  Building2,
  Zap,
  Map as MapIcon,
  MessageCircle,
  TrendingUp,
  Percent,
  Plus,
  Lock,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Logo } from './Logo';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { id: 'profile', label: 'Meu Perfil', icon: User, color: 'text-blue-500' },
  { id: 'appearance', label: 'Aparência', icon: Moon, color: 'text-indigo-500' },
  { id: 'subscription', label: 'Minha Assinatura', icon: CreditCard, color: 'text-emerald-500' },
  { id: 'notifications', label: 'Notificações', icon: Bell, color: 'text-amber-500' },
  { id: 'security', label: 'Segurança', icon: Shield, color: 'text-red-500' }
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, signOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const toggleTheme = async () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    // Optimistic update
    updateSettings({ theme: newTheme }).catch(() => {
        toast.error("Erro ao salvar tema");
    });
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success("Funcionalidade de upload em desenvolvimento");
    }
  };

  const planInfo = {
    exclusivo: { name: 'Exclusivo', icon: Trophy, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' },
    premium: { name: 'Premium', icon: Gem, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    master: { name: 'Master', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' }
  };

  const currentPlan = planInfo[settings.plan_id as keyof typeof planInfo] || planInfo.exclusivo;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-zinc-800/50 flex flex-col md:flex-row"
      >
        {/* Sidebar */}
        <div className="w-full md:w-80 bg-slate-50/50 dark:bg-zinc-950/50 border-r border-slate-100 dark:border-zinc-800 p-8 flex flex-col gap-8">
          <div className="flex items-center gap-4 px-2">
            <Logo size="sm" showText />
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group",
                  activeTab === item.id 
                    ? "bg-white dark:bg-zinc-900 shadow-xl shadow-slate-200/50 dark:shadow-none text-slate-900 dark:text-white" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-900/50"
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? item.color : "text-current")} />
                <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
          </nav>

          <div className="pt-8 border-t border-slate-100 dark:border-zinc-800">
            <button 
              onClick={() => signOut()}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
            >
              <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[11px] font-black uppercase tracking-widest">Sair da Conta</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-12">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                  <div className="flex items-center gap-8">
                    <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-3xl font-black shadow-xl group-hover:scale-105 transition-transform">
                        {user?.email?.[0].toUpperCase()}
                      </div>
                      <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                      <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-slate-100 dark:border-zinc-700 hover:scale-110 transition-transform">
                        <Plus className="w-4 h-4 text-emerald-600" />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                        accept="image/*"
                      />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Configurações de Perfil</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nome de Exibição</label>
                      <input 
                        type="text" 
                        value={user?.user_metadata?.full_name || ''} 
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        placeholder="Seu Nome"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">E-mail</label>
                      <input 
                        type="email" 
                        disabled
                        value={user?.email || ''} 
                        className="w-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl px-6 py-4 text-sm font-bold text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'appearance' && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Personalização</h2>
                  
                  <div className="space-y-4">
                    <button 
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between p-6 rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 hover:scale-[1.02] transition-all group"
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
                        "w-12 h-6 rounded-full p-1 transition-all flex items-center",
                        settings.theme === 'dark' ? "bg-emerald-500 justify-end" : "bg-slate-200 justify-start"
                      )}>
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Notificações</h2>
                  <div className="space-y-4">
                    {[
                      { title: 'Notificações por E-mail', desc: 'Receba alertas de inatividade e relatórios por e-mail', icon: Globe },
                      { title: 'Notificações Push', desc: 'Alertas em tempo real no seu navegador', icon: Smartphone },
                      { title: 'Lembretes de Agenda', desc: 'Avisos sobre seus compromissos e reuniões', icon: Bell }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-6 rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-6">
                          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm text-amber-500">
                            <item.icon className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{item.title}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.desc}</p>
                          </div>
                        </div>
                        <div className="w-12 h-6 rounded-full p-1 bg-emerald-500 flex items-center justify-end">
                          <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Segurança</h2>
                  <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-6 rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 hover:scale-[1.02] transition-all group">
                      <div className="flex items-center gap-6">
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm text-red-500">
                          <Shield className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Alterar Senha</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Mantenha sua conta protegida</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="flex items-center justify-between p-6 rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center gap-6">
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm text-blue-500">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Autenticação em Duas Etapas</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Camada extra de proteção para seu login</p>
                        </div>
                      </div>
                      <div className="w-12 h-6 rounded-full p-1 bg-slate-200 flex items-center justify-start">
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'subscription' && (
                <motion.div
                  key="subscription"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sua Assinatura</h2>
                    <div className={cn("px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] shadow-sm", currentPlan.bg, currentPlan.border, currentPlan.color)}>
                      {currentPlan.name}
                    </div>
                  </div>

                  <div className={cn("p-10 rounded-[48px] border relative overflow-hidden", currentPlan.bg, currentPlan.border)}>
                    <div className="relative z-10 space-y-8">
                       <div className="flex items-center gap-6">
                          <div className="p-5 bg-white dark:bg-zinc-900 rounded-[28px] shadow-sm">
                            <currentPlan.icon className={cn("w-10 h-10", currentPlan.color)} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Plano Atual</p>
                            <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Acesso {currentPlan.name}</h3>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: 'Status', value: 'Ativo', icon: CheckCircle2, color: 'text-emerald-500' },
                            { label: 'Renovação', value: 'Mensal', icon: TrendingUp, color: 'text-blue-500' }
                          ].map((stat, i) => (
                            <div key={i} className="p-4 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-white/20">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                              <div className="flex items-center gap-2">
                                <stat.icon className={cn("w-3 h-3", stat.color)} />
                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{stat.value}</span>
                              </div>
                            </div>
                          ))}
                       </div>

                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Seus Benefícios</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {settings.plan_id === 'exclusivo' && [
                              { text: '1 Empresa Cadastrada', icon: Building2 },
                              { text: 'Mapa e CRM Básico', icon: MapIcon },
                              { text: 'Lançamento Manual', icon: Plus }
                            ].map((b, i) => (
                              <div key={i} className="flex items-center gap-3 text-slate-600 dark:text-zinc-400">
                                <b.icon className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-tight">{b.text}</span>
                              </div>
                            ))}
                            {settings.plan_id === 'premium' && [
                              { text: 'Até 3 Empresas', icon: Building2 },
                              { text: 'Busca CNPJ Auto', icon: Zap },
                              { text: 'IA Gemini Pro 1.5', icon: Sparkles },
                              { text: 'Suporte Prioritário', icon: MessageCircle }
                            ].map((b, i) => (
                              <div key={i} className="flex items-center gap-3 text-slate-600 dark:text-zinc-400">
                                <b.icon className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-tight">{b.text}</span>
                              </div>
                            ))}
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Upsell for Master if Premium */}
                  {settings.plan_id === 'premium' && (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-8 rounded-[32px] bg-amber-50 border border-amber-100 flex flex-col md:flex-row items-center justify-between gap-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-400 rounded-2xl text-white">
                          <Crown className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Oportunidade de Upgrade</p>
                          <h4 className="text-lg font-black text-amber-900 uppercase tracking-tight">Vá para o plano Master por apenas +R$ 50/mês</h4>
                        </div>
                      </div>
                      <button 
                        onClick={() => { onClose(); navigate('/planos'); }}
                        className="px-8 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
                      >
                        Fazer Upgrade
                      </button>
                    </motion.div>
                  )}

                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => {
                        onClose();
                        setTimeout(() => navigate('/planos'), 100);
                      }}
                      className="w-full py-6 rounded-[32px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-4 group"
                    >
                      Ver todos os planos <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-all text-slate-400"
        >
          <X className="w-6 h-6" />
        </button>
      </motion.div>
    </div>
  );
}
