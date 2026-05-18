import React, { useState, useRef, useEffect } from 'react';
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
  Camera,
  QrCode,
  Key,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Logo } from './Logo';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

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
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [is2FASetup, setIs2FASetup] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStep, setPasswordStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Sync temp avatar with settings
  useEffect(() => {
    if (settings.avatar_url) {
      setTempAvatar(settings.avatar_url);
    }
  }, [settings.avatar_url]);

  if (!isOpen) return null;

  const toggleTheme = async () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    try {
      await updateSettings({ theme: newTheme });
      toast.success(`Modo ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado!`);
    } catch (err) {
      toast.error("Erro ao salvar tema");
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 2MB for base64 storage)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("A imagem deve ter menos de 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setTempAvatar(base64);
        try {
          await updateSettings({ avatar_url: base64 });
          toast.success("Foto de perfil atualizada!");
        } catch (err) {
          toast.error("Erro ao salvar foto de perfil");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const planInfo = {
    exclusivo: { 
      name: 'Exclusivo', 
      icon: Trophy, 
      color: 'text-slate-400 dark:text-slate-300', 
      bg: 'bg-slate-50 dark:bg-zinc-800/50', 
      border: 'border-slate-100 dark:border-zinc-800' 
    },
    premium: { 
      name: 'Premium', 
      icon: Gem, 
      color: 'text-emerald-500 dark:text-emerald-400', 
      bg: 'bg-emerald-50 dark:bg-emerald-950/20', 
      border: 'border-emerald-100 dark:border-emerald-900/30' 
    },
    master: { 
      name: 'Master', 
      icon: Crown, 
      color: 'text-amber-500 dark:text-amber-400', 
      bg: 'bg-amber-50 dark:bg-amber-950/20', 
      border: 'border-amber-100 dark:border-amber-900/30' 
    }
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
        className="relative w-full max-w-5xl h-[90vh] md:h-[85vh] bg-white dark:bg-zinc-900 rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-zinc-800/50 flex flex-col md:flex-row"
      >
        {/* Mobile Horizontal Menu (Icons Only & Centered Layout) */}
        <div className="md:hidden flex flex-row items-center justify-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 justify-center">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative",
                    isActive 
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 scale-110 z-10" 
                      : "bg-white dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-100 dark:border-zinc-700/50 active:scale-95"
                  )}
                >
                  {item.id === 'profile' && tempAvatar ? (
                    <img 
                      src={tempAvatar} 
                      alt="Avatar" 
                      className={cn(
                        "w-5 h-5 rounded-full object-cover transition-transform",
                        isActive ? "border border-white/50 scale-110" : ""
                      )} 
                    />
                  ) : (
                    <item.icon className={cn("w-4 h-4 transition-transform", isActive ? "scale-110" : "")} />
                  )}
                  
                  {/* Subtle active indicator dot */}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {/* Sidebar */}
        <div className="hidden md:flex w-full md:w-80 bg-slate-50/50 dark:bg-zinc-950/50 border-r border-slate-100 dark:border-zinc-800 p-8 flex-col gap-8">
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
        <div className="flex-1 p-5 md:p-12 overflow-y-auto custom-scrollbar">
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
                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
                    <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                      {tempAvatar ? (
                        <img src={tempAvatar} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-xl group-hover:scale-105 transition-transform border-4 border-emerald-500/20" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-3xl font-black shadow-xl group-hover:scale-105 transition-transform border-4 border-emerald-500/20">
                          {user?.email?.[0].toUpperCase()}
                        </div>
                      )}
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
                      <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Configurações de Perfil</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nome de Exibição</label>
                      <input 
                        type="text" 
                        value={user?.user_metadata?.full_name || ''} 
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-4 md:px-6 py-3.5 md:py-4 text-xs md:text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
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
                  <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Personalização</h2>
                  
                  <div className="space-y-4">
                    <button 
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 hover:scale-[1.02] transition-all group"
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
                      
                      {/* Fixed Toggle Switch */}
                      <div className={cn(
                        "w-14 h-7 rounded-full p-1 transition-colors duration-300 relative",
                        settings.theme === 'dark' ? "bg-emerald-500" : "bg-slate-300"
                      )}>
                        <motion.div 
                          animate={{ x: settings.theme === 'dark' ? 28 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="w-5 h-5 rounded-full bg-white shadow-lg" 
                        />
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
                  <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Notificações</h2>
                  <div className="space-y-4">
                    {[
                      { title: 'Notificações por E-mail', desc: 'Receba alertas de inatividade e relatórios por e-mail', icon: Globe },
                      { title: 'Notificações Push', desc: 'Alertas em tempo real no seu navegador', icon: Smartphone },
                      { title: 'Lembretes de Agenda', desc: 'Avisos sobre seus compromissos e reuniões', icon: Bell }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
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
                  <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Segurança</h2>
                  <div className="space-y-4">
                    {/* Alterar Senha Section */}
                    {!isChangingPassword ? (
                      <button 
                        onClick={() => {
                          setIsChangingPassword(true);
                          setPasswordStep(1);
                          setInputCode('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="w-full flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 hover:scale-[1.02] transition-all group"
                      >
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
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 md:p-6 rounded-2xl md:rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 space-y-6"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                              <Key className="w-5 h-5" />
                            </div>
                            <h3 className="text-xs md:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Alteração de Senha</h3>
                          </div>
                          <button 
                            onClick={() => setIsChangingPassword(false)}
                            className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>

                        {passwordStep === 1 && (
                          <div className="space-y-4">
                            <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase leading-relaxed">
                              Para sua segurança, enviaremos um código de 6 dígitos para o e-mail cadastrado <span className="text-emerald-500 font-black">{user?.email}</span> antes de liberar a troca de senha.
                            </p>
                            <button
                              onClick={async () => {
                                setIsSendingCode(true);
                                const code = Math.floor(100000 + Math.random() * 900000).toString();
                                setVerificationCode(code);
                                
                                try {
                                  const { data, error } = await supabase.functions.invoke('reset-user-password', {
                                    body: { email: user?.email, code }
                                  });
                                  
                                  if (error) throw error;
                                  
                                  setPasswordStep(2);
                                  toast.success("Código de segurança enviado com sucesso!");
                                } catch (error) {
                                  console.error("Erro ao enviar código:", error);
                                  toast.error("Erro ao enviar e-mail com o código de segurança. Tente novamente.");
                                } finally {
                                  setIsSendingCode(false);
                                }
                              }}
                              disabled={isSendingCode}
                              className="w-full py-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                            >
                              {isSendingCode ? "Enviando Código..." : "Enviar Código de Verificação"}
                            </button>
                          </div>
                        )}

                        {passwordStep === 2 && (
                          <div className="space-y-4">
                            <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase leading-relaxed">
                              Insira o código de 6 dígitos enviado para seu e-mail para validar a sua identidade.
                            </p>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                maxLength={6}
                                placeholder="Digite o código" 
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                                className="flex-1 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none text-center tracking-widest focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                              />
                              <button 
                                onClick={() => {
                                  if (inputCode === verificationCode) {
                                    setPasswordStep(3);
                                    toast.success("Código confirmado! Insira a nova senha.");
                                  } else {
                                    toast.error("Código inválido! Tente novamente.");
                                  }
                                }}
                                className="bg-emerald-600 text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                              >
                                Confirmar
                              </button>
                            </div>
                            <button
                              onClick={() => setPasswordStep(1)}
                              className="text-[9px] font-black text-slate-400 uppercase hover:text-slate-600 dark:hover:text-white transition-colors block text-center w-full"
                            >
                              Reenviar Código
                            </button>
                          </div>
                        )}

                        {passwordStep === 3 && (() => {
                          const isLength = newPassword.length >= 8;
                          const isUppercase = /[A-Z]/.test(newPassword);
                          const isNumber = /[0-9]/.test(newPassword);
                          const isSpecial = /[^A-Za-z0-9]/.test(newPassword);

                          return (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nova Senha</label>
                                <input 
                                  type="password" 
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  placeholder="Digite a nova senha" 
                                  className="w-full bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                                />
                                
                                {/* Requisitos de Senha em tempo real */}
                                <div className="grid grid-cols-2 gap-2 mt-3 px-1 py-2 bg-slate-100/50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                                  {[
                                    { label: "Mínimo de 8 caracteres", met: isLength },
                                    { label: "Uma letra maiúscula", met: isUppercase },
                                    { label: "Um número", met: isNumber },
                                    { label: "Um caractere especial", met: isSpecial },
                                  ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 px-2">
                                      <div className={cn(
                                        "w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors shrink-0",
                                        item.met ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-zinc-800 text-slate-400"
                                      )}>
                                        <Check className="w-2.5 h-2.5" />
                                      </div>
                                      <span className={cn(
                                        "text-[8px] font-black uppercase tracking-wider transition-colors leading-none",
                                        item.met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-zinc-500"
                                      )}>{item.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Confirmar Nova Senha</label>
                              <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirme a nova senha" 
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                              />
                            </div>
                            <button
                              onClick={async () => {
                                if (!isLength || !isUppercase || !isNumber || !isSpecial) {
                                  toast.error("A senha não atende a todos os requisitos de segurança!");
                                  return;
                                }
                                if (newPassword !== confirmPassword) {
                                  toast.error("As senhas não coincidem!");
                                  return;
                                }
                                
                                setIsSavingPassword(true);
                                const { error } = await supabase.auth.updateUser({ password: newPassword });
                                setIsSavingPassword(false);
                                
                                if (error) {
                                  toast.error("Erro ao alterar senha: " + error.message);
                                } else {
                                  toast.success("Senha alterada com sucesso!");
                                  setIsChangingPassword(false);
                                }
                              }}
                              disabled={isSavingPassword}
                              className="w-full py-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                            >
                              {isSavingPassword ? "Salvando Nova Senha..." : "Confirmar Nova Senha"}
                            </button>
                          </div>
                        )
                        })()}
                      </motion.div>
                    )}

                    {/* 2FA Section */}
                    <div className="p-4 md:p-6 rounded-2xl md:rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm text-blue-500">
                            <Lock className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Autenticação em Duas Etapas (2FA)</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Camada extra de proteção para seu login</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIs2FASetup(!is2FASetup)}
                          className={cn(
                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            is2FASetup ? "bg-red-50 dark:bg-red-900/20 text-red-500" : "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                          )}
                        >
                          {is2FASetup ? "Desativar" : "Configurar"}
                        </button>
                      </div>

                      {/* 2FA Warning Banner */}
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1">
                            Aviso Importante (2FA Exclusivo para Computador)
                          </p>
                          <p className="text-[9px] font-medium text-amber-700 dark:text-zinc-400 leading-relaxed uppercase">
                            A autenticação em duas etapas (2FA) só está disponível e funciona perfeitamente ao acessar o sistema de um computador. A sincronização e leitura em smartphones ou tablets não é suportada.
                          </p>
                        </div>
                      </div>

                      {is2FASetup && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pt-6 border-t border-slate-100 dark:border-zinc-800 space-y-6"
                        >
                          <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-inner">
                              <QrCode className="w-32 h-32 text-slate-900 dark:text-white" />
                            </div>
                            <div className="space-y-4 flex-1">
                              <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase leading-relaxed">
                                Escaneie o QR Code acima com seu app de autenticação (Google Authenticator ou Authy) para ativar o 2FA.
                              </p>
                              <div className="flex gap-2">
                                <input type="text" placeholder="Código de 6 dígitos" className="flex-1 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                                <button className="bg-slate-900 dark:bg-emerald-600 text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest">Validar</button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
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
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sua Assinatura</h2>
                    <div className={cn("px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] shadow-sm", currentPlan.bg, currentPlan.border, currentPlan.color)}>
                      {currentPlan.name}
                    </div>
                  </div>

                  <div className={cn("p-6 md:p-10 rounded-3xl md:rounded-[48px] border relative overflow-hidden", currentPlan.bg, currentPlan.border)}>
                    <div className="relative z-10 space-y-8">
                       <div className="flex items-center gap-6">
                          <div className="p-5 bg-white dark:bg-zinc-900 rounded-[28px] shadow-sm">
                            <currentPlan.icon className={cn("w-10 h-10", currentPlan.color)} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.3em]">Plano Atual</p>
                            <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Acesso {currentPlan.name}</h3>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: 'Status', value: 'Ativo', icon: CheckCircle2, color: 'text-emerald-500' },
                            { label: 'Renovação', value: 'Mensal', icon: TrendingUp, color: 'text-blue-500' }
                          ].map((stat, i) => (
                            <div key={i} className="p-4 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-white/20 dark:border-zinc-800">
                              <p className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
                              <div className="flex items-center gap-2">
                                <stat.icon className={cn("w-3 h-3", stat.color)} />
                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{stat.value}</span>
                              </div>
                            </div>
                          ))}
                       </div>

                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4">Seus Benefícios</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {settings.plan_id === 'exclusivo' && [
                              { text: '1 Empresa Cadastrada', icon: Building2 },
                              { text: 'Mapa e CRM Básico', icon: MapIcon },
                              { text: 'Lançamento Manual', icon: Plus }
                            ].map((b, i) => (
                              <div key={i} className="flex items-center gap-3 text-slate-600 dark:text-zinc-300">
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
                              <div key={i} className="flex items-center gap-3 text-slate-600 dark:text-zinc-300">
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
                      className="p-5 md:p-8 rounded-2xl md:rounded-[32px] bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex flex-col md:flex-row items-center justify-between gap-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-400 rounded-2xl text-white">
                          <Crown className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">Oportunidade de Upgrade</p>
                          <h4 className="text-lg font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">Vá para o plano Master por apenas +R$ 50/mês</h4>
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
                      className="w-full py-4 md:py-6 rounded-2xl md:rounded-[32px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-4 group shadow-xl shadow-slate-900/10 dark:shadow-none"
                    >
                      Ver todos os planos <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Floating Glassmorphism Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-8 md:right-8 z-30 p-2 md:p-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-all text-slate-400 border border-slate-100 dark:border-zinc-800/50 shadow-md"
        >
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </motion.div>
    </div>
  );
}
