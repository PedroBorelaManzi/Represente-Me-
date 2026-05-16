import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Star, 
  ChevronRight,
  Sparkles,
  Layout as LayoutIcon,
  CheckCircle2,
  Eye,
  EyeOff,
  Building2,
  TrendingUp,
  Stethoscope,
  Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "../components/Logo";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const features = [
  {
    icon: ShieldCheck,
    title: "Segurança Total",
    desc: "Criptografia avançada"
  },
  {
    icon: Zap,
    title: "Agilidade",
    desc: "Interface ultra-rápida"
  },
  {
    icon: LayoutIcon,
    title: "Organização",
    desc: "Gestão completa"
  }
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Bem-vindo de volta!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white dark:bg-zinc-950 flex flex-col lg:flex-row transition-colors duration-500 overflow-hidden">
      {/* Left Side: Auth Form */}
      <div className="w-full lg:w-[45%] p-6 md:p-12 lg:p-16 flex flex-col justify-center relative bg-white dark:bg-zinc-950 z-10 overflow-y-auto">
        <div className="max-w-md mx-auto w-full space-y-10">
          {/* Logo Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Logo size="lg" showText={true} variant="light" />
          </motion.div>

          {/* Form Header */}
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-none"
            >
              Bem-vindo
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-slate-500 dark:text-zinc-400 font-medium text-base"
            >
              Acesse sua plataforma de representação comercial e domine o mercado.
            </motion.p>
          </div>

          {/* Login Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-[0.2em] px-4">E-mail Corporativo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-300 dark:text-zinc-700 group-focus-within:text-emerald-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border-2 border-slate-50 dark:border-zinc-800 rounded-[28px] py-5 pl-16 pr-8 text-sm font-bold text-slate-900 dark:text-zinc-100 outline-none focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-4">
                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-[0.2em]">Senha de Acesso</label>
                <Link to="/recovery" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors">Esqueceu?</Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-300 dark:text-zinc-700 group-focus-within:text-emerald-500 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border-2 border-slate-50 dark:border-zinc-800 rounded-[28px] py-5 pl-16 pr-20 text-sm font-bold text-slate-900 dark:text-zinc-100 outline-none focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-6 flex items-center text-slate-400 hover:text-slate-600 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[28px] font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-slate-800 dark:hover:bg-zinc-100 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Entrar na Plataforma
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </motion.form>

          {/* Create Account Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="pt-8 border-t border-slate-100 dark:border-zinc-900 text-center"
          >
            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Novo por aqui?</p>
            <Link 
              to="/register" 
              className="inline-flex items-center gap-2 text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] hover:text-emerald-600 transition-colors group"
            >
              Criar minha conta agora
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Visual/Features */}
      <div className="hidden lg:flex w-[55%] bg-slate-50 dark:bg-zinc-900 relative items-center justify-center p-12 lg:p-16 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-6"
          >
            {/* Benefícios Subiram e Diminuíram */}
            <div className="col-span-2 space-y-4 mb-8">
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-zinc-800 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-zinc-700"
               >
                 <Sparkles className="w-4 h-4 text-amber-500" />
                 <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Tecnologia de Ponta</span>
               </motion.div>
               <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                 O futuro da <br />
                 <span className="text-emerald-600">Representação</span>
               </h2>
            </div>

            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + (idx * 0.1) }}
                className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl p-8 rounded-[40px] border border-white dark:border-zinc-700 shadow-2xl shadow-slate-200/50 dark:shadow-none group hover:-translate-y-1 transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-[20px] bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <feature.icon className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">{feature.title}</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 leading-tight">{feature.desc}</p>
              </motion.div>
            ))}

            {/* Testimonial / Social Proof Reduzido */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="col-span-2 mt-8 bg-slate-900 dark:bg-zinc-800 p-8 rounded-[40px] text-white space-y-4"
            >
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-base font-medium italic opacity-90 leading-relaxed">
                "O controle que tenho hoje sobre minha carteira é algo que eu nunca imaginei ser possível."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-black text-[10px]">RM</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Ricardo Moreira</p>
                  <p className="text-[8px] font-bold opacity-50 uppercase tracking-tight">Representante Comercial</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
