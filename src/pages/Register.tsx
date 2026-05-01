import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  Zap, 
  Shield, 
  Star, 
  Building2, 
  Users2, 
  Map as MapIcon, 
  ArrowRight,
  Sparkles,
  Infinity,
  Trophy,
  Crown,
  Gem,
  ChevronLeft,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  Box,
  BarChart3
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { Logo } from '../components/Logo';
import { cn } from '../lib/utils';

const plans = [
  {
    id: 'exclusivo',
    name: 'Exclusivo',
    price: '97',
    period: '/mês',
    description: 'Para quem está começando.',
    justification: 'Ideal para validar sua operação com baixo investimento e organização básica.',
    features: [
      { text: '1 Empresa cadastrada', icon: Building2 },
      { text: 'Mapa Territorial Básico', icon: MapIcon },
      { text: 'CRM Essencial', icon: Check },
      { text: 'Suporte por E-mail', icon: Mail }
    ],
    featured: false,
    color: 'slate',
    icon: Trophy
  },
  {
    id: 'profissional',
    name: 'Profissional',
    price: '147',
    period: '/mês',
    description: 'Ideal para equipes em crescimento.',
    justification: 'A automação de busca de CNPJ economiza cerca de 10 horas de trabalho manual por mês.',
    features: [
      { text: 'Até 5 Empresas', icon: Building2 },
      { text: 'Busca CNPJ Automática', icon: Zap },
      { text: 'Dashboard de Faturamento', icon: BarChart3 },
      { text: 'Suporte via WhatsApp', icon: Star },
      { text: 'Exportação de Relatórios', icon: Check }
    ],
    featured: true,
    color: 'emerald',
    icon: Gem
  },
  {
    id: 'corporativo',
    name: 'Corporativo',
    price: '197',
    period: '/mês',
    description: 'Para grandes volumes e IA.',
    justification: 'Potencializado por Inteligência Artificial para processar pedidos e analisar mercado em tempo real.',
    features: [
      { text: 'Empresas Ilimitadas', icon: Infinity },
      { text: 'Lançamento via IA (Gemini)', icon: Sparkles },
      { text: 'Radar Territorial Avançado', icon: MapIcon },
      { text: 'Automação de Pedidos', icon: Zap },
      { text: 'Integração com Inbox', icon: Mail }
    ],
    featured: false,
    color: 'zinc',
    icon: Crown
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: '247',
    period: '/mês',
    description: 'A solução completa definitiva.',
    justification: 'BI avançado e personalização total para grandes operações de representação comercial.',
    features: [
      { text: 'Tudo do Corporativo', icon: Shield },
      { text: 'BI & Analytics Avançado', icon: BarChart3 },
      { text: 'Personalização White-label', icon: Box },
      { text: 'Suporte VIP 24/7', icon: Star },
      { text: 'Treinamento de Equipe', icon: Users2 }
    ],
    featured: false,
    color: 'indigo',
    icon: Sparkles
  }
];

const Register = () => {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            selected_plan: selectedPlan,
          }
        }
      });

      if (error) throw error;

      if (data.user && data.session) {
        toast.success("Conta criada com sucesso!");
        navigate("/dashboard");
      } else {
        toast.success("Verifique seu e-mail para confirmar o cadastro.");
        setStep(3);
      }
    } catch (error) {
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 overflow-x-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-100/30 dark:bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-50/30 dark:bg-emerald-950/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="flex justify-between items-center mb-16">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : navigate("/")} 
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl text-slate-500 hover:text-emerald-600 transition-all border border-slate-100 dark:border-zinc-800"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Voltar</span>
          </button>
          <Logo showText={true} />
          <div className="w-20" />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                  Escolha o seu <span className="text-emerald-600">nível de jogo</span>
                </h1>
                <p className="text-slate-50 dark:text-zinc-400 font-bold uppercase text-xs tracking-widest">
                  Selecione o plano que melhor se adapta à sua realidade atual.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -8 }}
                    className={cn(
                      "relative flex flex-col p-6 rounded-[40px] border transition-all duration-500 cursor-pointer",
                      plan.featured 
                        ? "bg-emerald-600 border-emerald-500 shadow-2xl text-white scale-105 z-10" 
                        : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 shadow-xl"
                    )}
                    
                  >
                    {plan.featured && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-amber-400 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg whitespace-nowrap">
                        Mais escolhido!
                      </div>
                    )}
                    <div className="mb-6">
                      <h3 className="text-lg font-black uppercase tracking-tight mb-2">{plan.name}</h3>
                      <p className={cn("text-[9px] font-bold uppercase opacity-70 leading-tight", plan.featured ? "text-emerald-50" : "text-slate-400")}>
                        {plan.description}
                      </p>
                    </div>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-xs font-black opacity-50">R$</span>
                      <span className="text-4xl font-black tracking-tighter">{plan.price}</span>
                      <span className="text-[10px] font-black uppercase opacity-50">{plan.period}</span>
                    </div>
                    
                    <div className={cn("p-4 rounded-2xl mb-6 text-[10px] font-bold leading-relaxed", plan.featured ? "bg-white/10" : "bg-slate-50 dark:bg-zinc-800")}>
                      <Sparkles className="w-4 h-4 mb-2 inline-block mr-2" />
                      {plan.justification}
                    </div>

                    <div className="space-y-3 flex-1 mb-6">
                      {plan.features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={cn("p-1.5 rounded-lg shrink-0", plan.featured ? "bg-white/20" : "bg-emerald-50 dark:bg-emerald-950/30")}>
                            <feat.icon className={cn("w-3 h-3", plan.featured ? "text-white" : "text-emerald-600")} />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-tight leading-none">{feat.text}</span>
                        </div>
                      ))}
                    </div>
                    <button className={cn(
                      "w-full py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all",
                      plan.featured ? "bg-white text-emerald-600" : "bg-slate-900 text-white"
                    )}>
                      Selecionar
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white dark:bg-zinc-900 rounded-[48px] p-10 border border-slate-100 dark:border-zinc-800 shadow-2xl space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Crie sua Conta</h2>
                  <p className="text-slate-500 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-widest">
                    Plano selecionado: <span className="text-emerald-600">{plans.find(p => p.id === selectedPlan)?.name}</span>
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nome Completo</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50/50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/50 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 text-sm font-bold outline-none"
                        placeholder="Seu Nome"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">E-mail Corporativo</label>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50/50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/50 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 text-sm font-bold outline-none"
                        placeholder="email@empresa.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Senha de Acesso</label>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                      <input
                        required
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50/50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/50 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 text-sm font-bold outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Finalizar Cadastro
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center">
                  <button 
                    onClick={() => setStep(1)} 
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                  >
                    Mudar de Plano
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center space-y-8 bg-white dark:bg-zinc-900 p-12 rounded-[48px] border border-slate-100 dark:border-zinc-800 shadow-2xl"
            >
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Quase pronto!</h2>
                <p className="text-slate-500 dark:text-zinc-400 font-medium text-sm leading-relaxed">
                  Enviamos um e-mail de confirmação para <strong>{email}</strong>. Por favor, valide sua conta para começar a usar o sistema.
                </p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all"
              >
                Voltar para Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Register;


