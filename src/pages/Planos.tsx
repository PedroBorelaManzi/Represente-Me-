import React from 'react';
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
  Gem
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

const plans = [
  {
    name: 'Acesso Exclusivo',
    price: '0',
    period: '/mês',
    description: 'Ideal para prospectadores e representações locais que estão começando a criar a carteira de vendas.',
    features: [
      { text: 'Até 1 empresa cadastrada', icon: Building2 },
      { text: 'Acesso ao Mapa e CRM Básico', icon: MapIcon },
      { text: 'Lançamento manual de pedidos', icon: Check },
      { text: 'Indicadores básicos de faturamento', icon: Check }
    ],
    buttonText: 'Começar Grátis',
    featured: false,
    color: 'slate',
    icon: Trophy
  },
  {
    name: 'Acesso Premium',
    price: '147',
    period: '/mês',
    description: 'Desenvolvido para agências, vendedores e distribuidores de médio e grande volume.',
    features: [
      { text: 'Até 3 empresas cadastradas', icon: Building2 },
      { text: 'Pesquisa Automática de CNPJ', icon: Zap },
      { text: 'Lançamento via IA (Gemini)', icon: Sparkles },
      { text: 'Suporte Prioritário (WhatsApp)', icon: Star },
      { text: 'Exportação completa de relatórios', icon: Check },
      { text: 'Filtros avançados de inatividade', icon: Check }
    ],
    buttonText: 'Assinar Premium',
    featured: true,
    color: 'indigo',
    icon: Gem
  },
  {
    name: 'Acesso Master',
    price: '297',
    period: '/mês',
    description: 'A solução definitiva para grandes operações e gestão de múltiplas frentes de vendas.',
    features: [
      { text: 'Empresas Ilimitadas', icon: Infinity },
      { text: 'Tudo do plano Premium', icon: Shield },
      { text: 'Painel Master de Business Intelligence', icon: Zap },
      { text: 'Gestão Completa de CRM Portfólio', icon: Users2 },
      { text: 'Personalização de cores e logos', icon: Check }
    ],
    buttonText: 'Seja um Master',
    featured: false,
    color: 'zinc',
    icon: Crown
  }
];

export default function Planos() {
  const { settings } = useSettings();

  return (
    <div className="py-20 px-8 flex flex-col gap-20">
      {/* Premium Header */}
      <div className="text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-8 border border-emerald-100 dark:border-emerald-900/40"
        >
          <Sparkles className="w-5 h-5 fill-current" /> Ecossistema & Investimento
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-8 leading-[0.9]">
            Escolha o seu <span className="text-emerald-600">nível de jogo</span>
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto font-black uppercase tracking-tight text-sm leading-relaxed mb-12">
            Aumente sua produtividade com ferramentas agentic e inteligência brasileira de ponta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto w-full">
        {plans.map((plan, index) => {
          const PlanIcon = plan.icon;
          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.8 }}
              className={cn(
                "relative flex flex-col p-12 rounded-[56px] border transition-all duration-700 hover:scale-[1.02]",
                plan.featured 
                  ? "bg-emerald-600 border-emerald-700 shadow-[0_48px_96px_-24px_rgba(99,102,241,0.4)] dark:shadow-none translate-y-[-20px]" 
                  : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 shadow-2xl"
              )}
            >
              {plan.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-2xl z-10">
                  Mais escolhido!
                </div>
              )}

              <div className="mb-12 flex justify-between items-start">
                <div>
                   <h3 className={cn("text-2xl font-black uppercase tracking-tighter mb-2", plan.featured ? "text-white" : "text-slate-900 dark:text-white")}>
                     {plan.name}
                   </h3>
                   <p className={cn("text-[10px] font-black uppercase tracking-widest leading-relaxed", plan.featured ? "text-emerald-100" : "text-slate-400 dark:text-zinc-500")}>
                     {plan.description}
                   </p>
                </div>
                <PlanIcon className={cn("w-10 h-10", plan.featured ? "text-white/40" : "text-slate-100")} />
              </div>

              <div className="flex items-baseline gap-2 mb-12">
                <span className={cn("text-xs font-black uppercase tracking-widest", plan.featured ? "text-emerald-200" : "text-slate-400")}>R$</span>
                <span className={cn("text-7xl font-black tracking-tighter", plan.featured ? "text-white" : "text-slate-900 dark:text-white")}>{plan.price}</span>
                <span className={cn("text-xs font-black uppercase tracking-widest", plan.featured ? "text-emerald-200" : "text-slate-400")}>{plan.period}</span>
              </div>

              <div className="flex-1 space-y-6 mb-12">
                {plan.features.map((feature, fIndex) => (
                  <div key={fIndex} className="flex items-center gap-4 group">
                    <div className={cn(
                        "shrink-0 p-2.5 rounded-2xl transition-all group-hover:scale-110", 
                        plan.featured ? "bg-white/20 text-white" : "bg-slate-50 dark:bg-zinc-800 text-emerald-600 shadow-sm"
                    )}>
                      <feature.icon className="w-4 h-4" />
                    </div>
                    <span className={cn("text-xs font-black uppercase tracking-tight", plan.featured ? "text-emerald-50" : "text-slate-700 dark:text-zinc-300")}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              <button className={cn(
                "w-full py-7 rounded-[32px] font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-4 group active:scale-[0.98]",
                plan.featured 
                  ? "bg-white text-emerald-600 hover:bg-slate-50 shadow-2xl" 
                  : "bg-slate-900 text-white dark:bg-emerald-600 shadow-xl"
              )}>
                {plan.buttonText}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Special Offer Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="max-w-7xl mx-auto w-full p-16 bg-slate-50 dark:bg-zinc-950/40 border-4 border-dashed border-slate-100 dark:border-zinc-800 rounded-[64px] flex flex-col md:flex-row items-center justify-between gap-12"
      >
         <div className="flex items-center gap-10 flex-1">
            <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-[40px] flex items-center justify-center shadow-2xl border border-slate-100 dark:border-zinc-800">
                <Users2 className="w-12 h-12 text-emerald-600" />
            </div>
            <div>
               <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Precisa de um plano personalizado?</h4>
               <p className="text-sm font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Soluções Corporate & Enterprise para grandes operações.</p>
            </div>
         </div>
         <button className="px-16 py-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-50 hover:scale-105 transition-all flex items-center gap-4 shadow-2xl active:scale-95">
            Falar com Especialista <ArrowRight className="w-5 h-5 text-emerald-600" />
         </button>
      </motion.div>
    </div>
  );
}

