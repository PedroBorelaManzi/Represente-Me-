import React, { useState } from 'react';
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
  X,
  MessageCircle,
  ShieldAlert,
  Percent
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const planPeriods = [
  { id: 'MONTHLY', label: 'Mensal', priceMod: 20, description: 'Sem compromisso' },
  { id: 'SEMIANNUAL', label: 'Semestral', priceMod: 10, discount: 'Economia de R$ 60' },
  { id: 'ANNUAL', label: 'Anual', priceMod: 0, discount: 'Economia de R$ 240', featured: true }
];

const plans = [
  {
    id: 'exclusivo',
    name: 'Acesso Exclusivo',
    basePrice: 0,
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
    id: 'premium',
    name: 'Acesso Premium',
    basePrice: 147,
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
    id: 'master',
    name: 'Acesso Master',
    basePrice: 297,
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('ANNUAL');

  const activePeriod = planPeriods.find(p => p.id === selectedPeriod)!;

  const handlePlanSelection = (planId: string) => {
    navigate(`/checkout?plan=${planId}&period=${selectedPeriod}`);
  };

  return (
    <div className="py-20 px-8 flex flex-col gap-20 bg-slate-50 dark:bg-zinc-950 min-h-screen">
      {/* Premium Header */}
      <div className="text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-8 border border-emerald-100 dark:border-emerald-900/40 shadow-sm"
        >
          <Sparkles className="w-5 h-5 fill-current" /> Ecossistema & Investimento
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-8 leading-[0.9]">
            Selecione o plano ideal para o <span className="text-emerald-600">seu negócio</span>
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto font-black uppercase tracking-tight text-sm leading-relaxed mb-12">
            Aumente sua produtividade com ferramentas agentic e inteligência brasileira de ponta.
        </p>
      </div>

      {/* Period Selector with emphasis on Annual */}
      <div className="flex flex-col items-center gap-4 -mt-10">
        <div className="bg-white dark:bg-zinc-900 p-2 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-xl flex gap-2">
          {planPeriods.map((period) => (
            <button
              key={period.id}
              onClick={() => setSelectedPeriod(period.id)}
              className={cn(
                "px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                selectedPeriod === period.id
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              )}
            >
              {period.label}
              {period.discount && (
                <span className={cn(
                  "block text-[8px] opacity-80 mt-1 font-black",
                  selectedPeriod === period.id ? "text-white" : "text-emerald-500"
                )}>
                  {period.discount}
                </span>
              )}
              {period.featured && (
                <div className="absolute top-0 right-0 p-1">
                  <Star className={cn("w-2 h-2 fill-current", selectedPeriod === period.id ? "text-white" : "text-emerald-500")} />
                </div>
              )}
            </button>
          ))}
        </div>
        
        {selectedPeriod === 'ANNUAL' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-200 dark:border-amber-500/20 shadow-sm"
          >
            <Percent className="w-3 h-3" />
            Economia Real: R$ 240,00 por ano no plano anual
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto w-full">
        {plans.map((plan, index) => {
          const PlanIcon = plan.icon;
          const isCurrentPlan = settings.plan_id === plan.id;
          const currentMonthlyPrice = plan.basePrice === 0 ? 0 : plan.basePrice + activePeriod.priceMod;
          
          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.8 }}
              className={cn(
                "relative flex flex-col p-12 rounded-[56px] border transition-all duration-700 hover:scale-[1.02]",
                plan.featured 
                  ? "bg-emerald-600 border-emerald-700 shadow-[0_48px_96px_-24px_rgba(16,185,129,0.4)] dark:shadow-none translate-y-[-20px]" 
                  : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 shadow-2xl"
              )}
            >
              {plan.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-2xl z-10">
                  Mais escolhido!
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute top-4 right-8 text-[8px] font-black uppercase tracking-widest text-emerald-500/50">
                  Plano Atual
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
                <span className={cn("text-7xl font-black tracking-tighter", plan.featured ? "text-white" : "text-slate-900 dark:text-white")}>
                  {currentMonthlyPrice}
                </span>
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

              <button 
                onClick={() => handlePlanSelection(plan.id)}
                disabled={isCurrentPlan}
                className={cn(
                  "w-full py-7 rounded-[32px] font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-4 group active:scale-[0.98] disabled:opacity-50",
                  plan.featured 
                    ? "bg-white text-emerald-600 hover:bg-slate-50 shadow-2xl" 
                    : "bg-slate-900 text-white dark:bg-emerald-600 shadow-xl"
                )}
              >
                {isCurrentPlan ? 'Plano Ativo' : plan.buttonText}
                {!isCurrentPlan && <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Special Offer & Support Section */}
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="p-16 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[64px] flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl"
        >
           <div className="flex items-center gap-10 flex-1">
              <div className="w-24 h-24 bg-slate-50 dark:bg-zinc-800 rounded-[40px] flex items-center justify-center shadow-inner border border-slate-100 dark:border-zinc-700">
                  <Users2 className="w-12 h-12 text-emerald-600" />
              </div>
              <div>
                 <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Precisa de um plano personalizado?</h4>
                 <p className="text-sm font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Soluções Corporate & Enterprise para grandes operações.</p>
              </div>
           </div>
           <button className="px-16 py-8 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-[32px] font-black uppercase tracking-[0.2em] text-xs hover:scale-105 transition-all flex items-center gap-4 shadow-2xl active:scale-95">
              Falar com Especialista <ArrowRight className="w-5 h-5 text-emerald-600" />
           </button>
        </motion.div>

        {/* Cancellation Section */}
        <div className="flex flex-col items-center gap-4 pt-12">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldAlert className="w-4 h-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Gestão de Conta Transparente</p>
          </div>
          <button 
            onClick={() => {
              const whatsappNumber = "5515997472785";
              const msg = encodeURIComponent(`Olá! Gostaria de solicitar o cancelamento da minha assinatura no Represente-Me. Meu e-mail é: ${user?.email}`);
              window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
            }}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2"
          >
            <X className="w-3 h-3" /> Desejo cancelar minha assinatura
          </button>
          <p className="text-[8px] text-slate-400 font-medium uppercase tracking-[0.2em] text-center max-w-xs leading-relaxed">
            Seus dados permanecerão salvos por 90 dias após o cancelamento. Você pode reativar seu acesso a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
}
