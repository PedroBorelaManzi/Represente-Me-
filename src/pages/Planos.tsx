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
  Infinity
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
    color: 'slate'
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
    color: 'indigo'
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
    color: 'zinc'
  }
];

export default function Planos() {
  const { settings } = useSettings();

  return (
    <div className="py-12 px-4 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest mb-4"
          >
            <Star className="w-4 h-4 fill-current" /> Planos e Preços
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Escolha o seu nível de jogo</h1>
          <p className="text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto font-bold uppercase tracking-tight text-sm">Aumente sua produtividade com ferramentas agentic e inteligência brasileira.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex flex-col p-8 rounded-[40px] border transition-all duration-500 hover:scale-105",
                plan.featured 
                  ? "bg-indigo-600 border-indigo-700 shadow-2xl shadow-indigo-200 dark:shadow-none translate-y-[-10px]" 
                  : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 shadow-xl"
              )}
            >
              {plan.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                  Mais Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className={cn("text-xl font-black uppercase tracking-tight mb-2", plan.featured ? "text-white" : "text-slate-900 dark:text-white")}>
                  {plan.name}
                </h3>
                <p className={cn("text-xs font-bold leading-relaxed", plan.featured ? "text-indigo-100" : "text-slate-500 dark:text-zinc-400")}>
                  {plan.description}
                </p>
              </div>

              <div className="flex items-baseline gap-1 mb-8">
                <span className={cn("text-[10px] font-black uppercase", plan.featured ? "text-indigo-200" : "text-slate-400")}>R$</span>
                <span className={cn("text-5xl font-black tracking-tighter", plan.featured ? "text-white" : "text-slate-900 dark:text-white")}>{plan.price}</span>
                <span className={cn("text-[10px] font-black uppercase", plan.featured ? "text-indigo-200" : "text-slate-400")}>{plan.period}</span>
              </div>

              <div className="flex-1 space-y-4 mb-10">
                {plan.features.map((feature, fIndex) => (
                  <div key={fIndex} className="flex items-center gap-3">
                    <div className={cn("shrink-0 p-1.5 rounded-lg", plan.featured ? "bg-white/20 text-white" : "bg-slate-50 dark:bg-zinc-800 text-indigo-600")}>
                      <feature.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={cn("text-[11px] font-bold uppercase tracking-tight", plan.featured ? "text-indigo-50" : "text-slate-700 dark:text-zinc-300")}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              <button className={cn(
                "w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 group",
                plan.featured 
                  ? "bg-white text-indigo-600 hover:bg-slate-50 shadow-xl" 
                  : "bg-slate-900 text-white dark:bg-indigo-600 hover:scale-[1.02]"
              )}>
                {plan.buttonText}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 p-10 bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center shadow-sm"><Users2 className="w-8 h-8 text-indigo-600" /></div>
              <div>
                 <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Precisa de um plano personalizado?</h4>
                 <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight">Fale com nosso time para soluções Corporate e Enterprise.</p>
              </div>
           </div>
           <button className="px-10 py-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all flex items-center gap-2">
              Chamar no WhatsApp <ArrowRight className="w-4 h-4" />
           </button>
        </div>
      </div>
    </div>
  );
}
