import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
  Lock, 
  Boxes, 
  ShieldCheck, 
  Heart, 
  ArrowRight, 
  ChevronLeft,
  X,
  KeyRound,
  CheckCircle2
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { Logo } from '../components/Logo';
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetStep, setResetStep] = useState<"email" | "otp" | "password" | "success">("email");
  const [otpToken, setOtpToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  const startPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { data: customer, error: customerError } = await supabase
        .from('user_settings')
        .select('email')
        .eq('email', forgotEmail)
        .single();

      if (customerError || !customer) {
        throw new Error("E-mail nÃ£o encontrado em nossa base de assinantes.");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail);
      if (error) throw error;

      setResetStep("otp");
      toast.success("CÃ³digo enviado para o seu e-mail!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao solicitar recuperaÃ§Ã£o");
    } finally {
      setResetLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: forgotEmail,
        token: otpToken,
        type: 'recovery'
      });
      if (error) throw error;
      setResetStep("password");
    } catch (error: any) {
      toast.error("CÃ³digo invÃ¡lido ou expirado.");
    } finally {
      setResetLoading(false);
    }
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      setResetStep("success");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar senha");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 overflow-hidden relative">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-100/30 dark:bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-50/30 dark:bg-emerald-950/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full flex">
        {/* Left Side: Premium Branding */}
        <div className="hidden lg:flex w-[55%] p-20 flex-col justify-between relative">
          <div className="relative z-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 text-emerald-600 mb-20"
            >
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl dark:shadow-none dark:shadow-none border border-emerald-50 dark:border-zinc-800">
                <Boxes className="h-8 w-8" />
              </div>
              <Logo showText={true} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-[84px] font-black text-slate-900 dark:text-zinc-100 leading-[0.9] mb-8 tracking-tighter">
                O FUTURO DA <br />
                <span className="text-emerald-600">REPRESENTAÃ‡ÃƒO.</span>
              </h1>
              <p className="text-slate-500 dark:text-zinc-400 text-xl font-medium max-w-xl leading-relaxed">
                A tecnologia que vocÃª precisa para dominar seu territÃ³rio e multiplicar suas vendas com inteligÃªncia e elegÃ¢ncia.
              </p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative z-10 grid grid-cols-2 gap-8"
          >
            {[
              { icon: ShieldCheck, title: "SeguranÃ§a Total", desc: "Seus dados protegidos por criptografia de ponta." },
              { icon: Boxes, title: "OrganizaÃ§Ã£o", desc: "Tudo o que vocÃª precisa em um sÃ³ lugar." }
            ].map((feature, i) => (
              <div key={i} className="group cursor-default">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-zinc-800 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-slate-900 dark:text-zinc-100 font-black uppercase text-[11px] tracking-widest">{feature.title}</h3>
                </div>
                <p className="text-slate-400 dark:text-zinc-500 text-sm font-bold leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Side: Glassmorphism Login Form */}
        <div className="w-full lg:w-[45%] flex items-center justify-center p-8 lg:p-24 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white/70 dark:bg-zinc-900/70 backdrop-blur-3xl p-12 lg:p-16 rounded-[64px] border border-white dark:border-zinc-800 shadow-[0_32px_128px_-16px_rgba(99,102,241,0.12)] relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
            
            {/* New Header Layout */}
            <div className="mb-12 flex flex-col items-center">
              <button 
                onClick={() => navigate("/")} 
                className="mb-8 flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-zinc-800 rounded-xl text-slate-500 hover:text-emerald-600 transition-all active:scale-95 group self-start"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Voltar</span>
              </button>

              <Logo className='h-16 mb-8' />
              
              <h2 className="text-4xl font-black text-slate-900 dark:text-zinc-100 mb-2 tracking-tighter uppercase text-center">Entrar</h2>
              <p className="text-slate-500 dark:text-zinc-400 font-medium text-center">Bem-vindo de volta ao seu comando central.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-2">E-mail Corporativo</label>
                <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-16 pr-8 py-5 bg-slate-50/50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/50 rounded-[24px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 text-sm font-bold transition-all placeholder:text-slate-300 outline-none"
                    placeholder="email@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Senha de Acesso</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setForgotEmail(email);
                      setResetStep("email");
                      setShowForgotModal(true);
                    }}
                    className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
                  >
                    Esqueci
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-16 pr-8 py-5 bg-slate-50/50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/50 rounded-[24px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 text-sm font-bold transition-all placeholder:text-slate-300 outline-none"
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full group relative flex items-center justify-center gap-3 py-6 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:bg-emerald-700 transition-all  dark:shadow-none disabled:opacity-50 overflow-hidden active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Entrar no Sistema
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-zinc-800 flex flex-col items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem conta?</span>
                <button
                  onClick={() => navigate("/register")}
                  className="px-6 py-2 bg-slate-50 dark:bg-zinc-800 text-[10px] font-black text-slate-900 dark:text-zinc-100 uppercase tracking-widest rounded-xl border border-slate-100 dark:border-zinc-700 hover:bg-white transition-all shadow-sm"
                >
                  Criar Conta
                </button>
              </div>

              <div className="flex justify-center items-center gap-2 grayscale opacity-30 text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">
                <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                <span>Premium Access</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[48px] p-10 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setShowForgotModal(false)}
                className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-zinc-800 text-emerald-600 flex items-center justify-center mb-6">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Recuperar Senha</h3>
              </div>

              {resetStep === "email" && (
                <form onSubmit={startPasswordReset} className="space-y-6">
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Digite seu e-mail cadastrado para receber o cÃ³digo de verificaÃ§Ã£o.
                  </p>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">E-mail</label>
                    <input
                      required
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm font-bold"
                      placeholder="email@empresa.com"
                    />
                  </div>
                  <button
                    disabled={resetLoading}
                    type="submit"
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all  dark:shadow-none flex items-center justify-center gap-2"
                  >
                    {resetLoading ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Enviar CÃ³digo"}
                  </button>
                </form>
              )}

              {resetStep === "otp" && (
                <form onSubmit={verifyOtp} className="space-y-6">
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Insira o cÃ³digo de 6 dÃ­gitos enviado para <strong>{forgotEmail}</strong>.
                  </p>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">CÃ³digo de VerificaÃ§Ã£o</label>
                    <input
                      required
                      type="text"
                      maxLength={8}
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none text-center text-2xl font-black tracking-[0.3em]"
                      placeholder="00000000"
                    />
                  </div>
                  <button
                    disabled={resetLoading}
                    type="submit"
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all  dark:shadow-none flex items-center justify-center gap-2"
                  >
                    {resetLoading ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Validar CÃ³digo"}
                  </button>
                </form>
              )}

              {resetStep === "password" && (
                <form onSubmit={updatePassword} className="space-y-6">
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Quase lÃ¡! Defina sua nova senha de acesso.
                  </p>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nova Senha</label>
                    <input
                      required
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm font-bold"
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    />
                  </div>
                  <button
                    disabled={resetLoading}
                    type="submit"
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all  dark:shadow-none flex items-center justify-center gap-2"
                  >
                    {resetLoading ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Alterar Senha"}
                  </button>
                </form>
              )}

              {resetStep === "success" && (
                <div className="text-center py-6 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 text-green-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">Senha Atualizada!</h4>
                    <p className="text-xs text-slate-500 font-medium">VocÃª jÃ¡ pode entrar no sistema com sua nova senha.</p>
                  </div>
                  <button
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-4 bg-slate-900 dark:bg-zinc-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
                  >
                    Voltar ao Login
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
