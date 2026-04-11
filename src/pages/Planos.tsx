import React from 'react';
import { Check, ArrowRight, Crown, ShieldCheck, Zap, Star, Sparkles, Building2, Map as MapIcon, Users, Calendar, BarChart3, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';

const plans = [
  {
    name: 'Acesso Exclusivo',
    price: '99,90',
    period: '',
    description: 'Ideal para prospectadores e representações locais que estão começando a criar a carteira de vendas.',
    features: [
      { text: 'Até 1 empresa cadastrada', icon: Building2 },
      { text: 'Acesso ao Mapa e CRM Básico', icon: MapIcon },
      { text: 'Limite de 50 clientes', icon: Users },
      { text: 'Suporte por e-mail', icon: ShieldCheck },
    ],
    cta: 'Assinar',
    popular: false,
    gradient: 'from-slate-500 to-slate-800',
    glow: 'shadow-slate-500/20'
  },
  {
    name: 'Profissional',
    price: '149,90',
    period: '/mês',
    description: 'Desenvolvido para agências, vendedores e distribuidores de médio e grande volume.',
    features: [
      { text: 'Até 3 empresas cadastradas', icon: Building2 },
      { text: 'Pesquisa Automática de CNPJ', icon: Zap },
      { text: 'Lote IA (10 arquivos)', icon: Sparkles },
      { text: 'Suporte Prioritário (WhatsApp)', icon: Star },
    ],
    cta: 'Assinar Agora',
    popular: true,
    gradient: 'from-indigo-600 to-violet-600',
    glow: 'shadow-indigo-500/40'
  },
  {
    name: 'Master',
    price: '199,90',
    period: '/mês',
    description: 'Projetado para escritórios de representação master, holding de vendas e franquias atacadistas.',
    features: [
      { text: 'Até 10 empresas (Lote ilimitado)', icon: Globe },
      { text: 'BI Master & Mapeamento Avançado', icon: BarChart3 },
      { text: 'Mentoria Estratégica Inclusiva', icon: Crown },
      { text: 'Sincronização Total Google', icon: Calendar },
    ],
    cta: 'Assinar',
    popular: false,
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/20'
  }
];

export default function Planos() {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute top-[20%] right-[5%] w-[30%] h-[30%] bg-amber-500/5 blur-[100px] rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16 space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            <Crown className="w-3 h-3" /> Planos Premium
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight uppercase"
          >
            Escolha o plano ideal para <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">o seu momento.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 dark:text-zinc-400 text-lg max-w-2xl mx-auto font-medium"
          >
            Potencialize sua representação comercial com inteligência artificial, <br /> mapeamento preciso e gestão de alta performance.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index + 0.3 }}
              whileHover={{ y: -10 }}
              className={`relative flex flex-col p-10 rounded-[48px] border transition-all duration-500 ${
                plan.popular 
                  ? 'bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-900 shadow-2xl scale-105 z-20' 
                  : 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border-slate-100 dark:border-zinc-800 shadow-xl'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-indigo-500/40">
                  Mais Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-400 dark:text-zinc-500">R$</span>
                  <span className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{plan.price}</span>
                  <span className="text-sm font-bold text-slate-400 dark:text-zinc-500">{plan.period}</span>
                </div>
                <p className="mt-6 text-sm text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="flex-1 space-y-5 mb-10">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className={`p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors`}>
                      <feature.icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="text-sm font-bold text-slate-600 dark:text-zinc-300">{feature.text}</span>
                  </div>
                ))}
              </div>

              <button
                className={`w-full py-5 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden group/btn ${
                  plan.popular
                    ? 'bg-indigo-600 text-white shadow-lg hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 active:scale-95'
                }`}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {settings.subscription_plan === plan.name ? 'Seu Plano Atual' : plan.cta}
                  {settings.subscription_plan !== plan.name && <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />}
                </span>
                {plan.popular && (
                   <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                )}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Comparison Footnote */}
        <div className="mt-20 flex flex-col md:flex-row items-center justify-between p-8 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm gap-6">
           <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                 <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                 <p className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Pagamento 100% Seguro</p>
                 <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Processado via infraestrutura Stripe com criptografria militar.</p>
              </div>
           </div>
           <div className="flex items-center gap-8">
              <p className="text-xs font-bold text-slate-400">Cancelamento grátis a qualquer momento</p>
              <div className="w-px h-10 bg-slate-100 dark:bg-zinc-800" />
              <p className="text-xs font-bold text-slate-400">Teste sem riscos por 7 dias</p>
           </div>
        </div>
      </div>
    </div>
  );
}
