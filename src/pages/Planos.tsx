import React, { useState, useEffect } from "react";
import { 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Star, 
  ChevronRight,
  Sparkles,
  Crown,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const plans = [
  {
    name: "Exclusivo",
    id: "exclusivo",
    monthlyPrice: 117,
    semiannualPrice: 107,
    annualPrice: 97,
    description: "Para quem está começando.",
    features: ["1 Empresa", "Mapa Básico", "CRM Básico", "Suporte Email"],
    icon: Building2,
    color: "from-slate-500 to-slate-600",
    popular: false,
  },
  {
    name: "Profissional",
    id: "profissional",
    monthlyPrice: 167,
    semiannualPrice: 157,
    annualPrice: 147,
    description: "Ideal para equipes em crescimento.",
    features: ["5 Empresas", "Busca CNPJ Automática", "Dashboard de Faturamento", "Suporte WhatsApp"],
    icon: Star,
    color: "from-emerald-500 to-emerald-600",
    popular: true,
  },
  {
    name: "Master",
    id: "master",
    monthlyPrice: 217,
    semiannualPrice: 207,
    annualPrice: 197,
    description: "A solução completa definitiva.",
    features: ["Empresas Ilimitadas", "BI & Analytics Avançado", "Personalização White-label", "Inbox Integrada"],
    icon: Crown,
    color: "from-emerald-600 to-emerald-700",
    popular: false,
  }
];

export default function Planos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "semiannual" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_settings')
        .select('subscription_status, subscription_tier')
        .eq('id', user.id)
        .single();
      setCurrentSubscription(data);
    };
    fetchSubscription();
  }, [user]);

  const handleSubscribe = (plan: any) => {
    const period = billingCycle.toUpperCase();
    // Navigate to public checkout with query params
    navigate(`/checkout?plan=${plan.id}&period=${period}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-4 lg:p-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/30 mb-8"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Planos & Assinaturas
          </motion.div>
          
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter mb-6 leading-none">
            Escolha o nível do seu <br /> <span className="text-emerald-600">Sucesso Profissional</span>
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 font-medium max-w-2xl mx-auto text-lg leading-relaxed mb-12">
            Invista na tecnologia que organiza sua rotina e potencializa suas vendas. 
            Mude de plano quando quiser.
          </p>

          <div className="flex flex-col items-center gap-4">
            <div className="flex p-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-800 rounded-[32px] shadow-sm relative z-10">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "px-10 py-5 rounded-[26px] text-[11px] font-black uppercase tracking-widest transition-all",
                  billingCycle === "monthly" ? "bg-slate-900 text-white shadow-xl scale-105" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle("semiannual")}
                className={cn(
                  "px-10 py-5 rounded-[26px] text-[11px] font-black uppercase tracking-widest transition-all relative",
                  billingCycle === "semiannual" ? "bg-slate-900 text-white shadow-xl scale-105" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Semestral
                <div className="absolute -top-3 -right-2 px-3 py-1 bg-emerald-500 text-white text-[8px] rounded-full font-black uppercase shadow-lg shadow-emerald-500/20">
                  -R$10/mês
                </div>
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={cn(
                  "px-10 py-5 rounded-[26px] text-[11px] font-black uppercase tracking-widest transition-all relative",
                  billingCycle === "annual" ? "bg-slate-900 text-white shadow-xl scale-105" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Anual
                <div className="absolute -top-3 -right-2 px-3 py-1 bg-emerald-500 text-white text-[8px] rounded-full font-black uppercase shadow-lg shadow-emerald-500/20">
                  -R$20/mês
                </div>
              </button>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-6 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl flex items-center gap-3"
            >
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                {billingCycle === "annual" ? "Economia de R$ 240,00 por ano no plano anual" : 
                 billingCycle === "semiannual" ? "Economia de R$ 60,00 por semestre" : 
                 "Plano mensal sem fidelidade"}
              </span>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, idx) => {
            let price = plan.annualPrice;
            if (billingCycle === "monthly") price = plan.monthlyPrice;
            if (billingCycle === "semiannual") price = plan.semiannualPrice;

            const isCurrent = currentSubscription?.subscription_tier?.toLowerCase() === plan.id.toLowerCase();

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "relative bg-white dark:bg-zinc-900 rounded-[48px] p-10 border transition-all duration-500 group overflow-hidden flex flex-col h-full",
                  plan.popular ? "border-emerald-500 shadow-[0_32px_64px_-16px_rgba(16,185,129,0.15)] ring-4 ring-emerald-500/5" : "border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700"
                )}
              >
                {plan.popular && (
                  <div className="absolute top-8 right-8">
                    <div className="px-4 py-1.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/20">
                      Recomendado
                    </div>
                  </div>
                )}

                <div className={cn(
                  "w-14 h-14 md:w-16 md:h-16 rounded-[24px] bg-gradient-to-br flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110 duration-500",
                  plan.color
                )}>
                  <plan.icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>

                <div className="mb-8">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium leading-tight">{plan.description}</p>
                </div>

                <div className="mb-10 flex items-baseline gap-1">
                  <span className="text-sm font-black text-slate-400">R$</span>
                  <span className="text-5xl md:text-6xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter">{price}</span>
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">/mês</span>
                </div>

                <div className="space-y-4 mb-10 flex-grow">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="text-xs md:text-sm font-bold text-slate-600 dark:text-zinc-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrent}
                  className={cn(
                    "w-full py-6 rounded-[28px] font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-[0.98] group/btn",
                    isCurrent 
                      ? "bg-slate-50 dark:bg-zinc-800 text-slate-400 cursor-not-allowed"
                      : plan.popular
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-500/20"
                        : "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-zinc-200 shadow-xl shadow-slate-900/10"
                  )}
                >
                  {isCurrent ? "Plano Atual" : (
                    <>
                      Assinar Plano
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Cancellation Section Refined */}
        <div className="max-w-4xl mx-auto p-12 bg-white dark:bg-zinc-900 rounded-[56px] border border-slate-100 dark:border-zinc-800 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <h4 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter mb-4">Gerenciar Minha Conta</h4>
            <p className="text-slate-500 dark:text-zinc-400 font-medium mb-8 max-w-lg mx-auto">
              Precisa pausar ou cancelar sua assinatura? Fale com nosso suporte para processarmos seu pedido com segurança.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => window.open('https://wa.me/5515997472785', '_blank')}
                className="px-10 py-5 bg-slate-900 dark:bg-zinc-800 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 shadow-lg"
              >
                Suporte Financeiro
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.open('https://wa.me/5515997472785', '_blank')}
                className="px-10 py-5 bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900/30 text-red-600 rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
              >
                Solicitar Cancelamento
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
