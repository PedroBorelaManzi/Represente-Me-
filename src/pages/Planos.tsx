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
  Percent,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const planPeriods = [
  { id: 'ANNUAL', label: 'Plano Anual', priceMod: 0, discount: 'Economize R$ 240', featured: true, installments: 12 },
  { id: 'SEMIANNUAL', label: 'Plano 6 Meses', priceMod: 10, discount: 'Economize R$ 60', installments: 6 },
  { id: 'MONTHLY', label: 'Plano Mensal', priceMod: 20, description: 'Sem fidelidade', installments: 1 }
];

const plans = [
  {
    id: 'exclusivo',
    name: 'Acesso Exclusivo',
    basePrice: 97,
    description: 'Ideal para quem está começando a digitalizar suas vendas.',
    features: [
      { text: '1 Empresa Cadastrada', icon: Building2 },
      { text: 'Mapa e CRM Básico', icon: MapIcon },
      { text: 'Lançamento Manual', icon: Check },
      { text: 'Relatórios Mensais', icon: Check }
    ],
    buttonText: 'Escolher Exclusivo',
    color: 'slate',
    icon: Trophy
  },
  {
    id: 'premium',
    name: 'Acesso Premium',
    basePrice: 147,
    description: 'A ferramenta completa para o representante de alto volume.',
    features: [
      { text: 'Até 3 Empresas', icon: Building2 },
      { text: 'Busca CNPJ Automática', icon: Zap },
      { text: 'Lançamento via IA Gemini', icon: Sparkles },
      { text: 'Suporte Prioritário', icon: Star },
      { text: 'Exportação completa', icon: Check }
    ],
    buttonText: 'Escolher Premium',
    featured: true,
    color: 'emerald',
    icon: Gem
  },
  {
    id: 'master',
    name: 'Acesso Master',
    basePrice: 197,
    description: 'Gestão ilimitada para grandes operações e agências.',
    features: [
      { text: 'Empresas Ilimitadas', icon: Infinity },
      { text: 'Tudo do Premium', icon: Shield },
      { text: 'Business Intelligence Pro', icon: Zap },
      { text: 'Gestão de Múltiplas Contas', icon: Users2 },
      { text: 'White-label (Logo Própria)', icon: Check }
    ],
    buttonText: 'Escolher Master',
    color: 'amber',
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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans text-slate-900 dark:text-zinc-100 overflow-x-hidden">
      {/* Premium Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-b border-slate-100 dark:border-zinc-800 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-all text-slate-400 active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
             <Shield className="w-4 h-4" /> Garantia de 7 dias
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-32 lg:py-48">
        {/* Sleek Header */}
        <div className="text-center space-y-8 mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-2xl"
          >
            Investimento Agentic
          </motion.div>
          
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] max-w-4xl mx-auto">
            Escolha o seu nível de <span className="text-emerald-600">performance</span>
          </h1>
          
          <p className="text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-widest max-w-xl mx-auto leading-relaxed">
            Planos escaláveis para cada etapa do seu crescimento comercial.
          </p>

          {/* Premium Period Switcher */}
          <div className="flex flex-col items-center gap-6 pt-12">
            <div className="p-1.5 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-2xl flex items-center">
              {planPeriods.map((period) => (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  className={cn(
                    "px-10 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all relative",
                    selectedPeriod === period.id 
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                  )}
                >
                  {period.label}
                  {period.id === 'ANNUAL' && (
                    <span className="absolute -top-2 -right-2 px-2 py-1 bg-emerald-500 text-white rounded-lg text-[7px] font-black shadow-lg">PROMO</span>
                  )}
                </button>
              ))}
            </div>
            {activePeriod.discount && (
               <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                  <Percent className="w-4 h-4" /> {activePeriod.discount} ativo
               </div>
            )}
          </div>
        </div>

        {/* Premium Plan Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => {
            const currentPrice = plan.basePrice + activePeriod.priceMod;
            const isPremium = plan.id === 'premium';
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "relative p-10 rounded-[48px] border transition-all duration-500 flex flex-col group",
                  isPremium 
                    ? "bg-white dark:bg-zinc-900 border-emerald-500/20 shadow-[0_64px_96px_-32px_rgba(16,185,129,0.15)] scale-105 z-10" 
                    : "bg-white/50 dark:bg-zinc-900/50 border-slate-100 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900"
                )}
              >
                {isPremium && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg">
                    Recomendado
                  </div>
                )}

                <div className="space-y-8 flex-1">
                  <div className="flex items-center justify-between">
                    <div className={cn("p-4 rounded-3xl", isPremium ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-slate-50 dark:bg-zinc-800 text-slate-400")}>
                      <plan.icon className="w-8 h-8" />
                    </div>
                    {settings.plan_id === plan.id && (
                       <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Seu Plano Atual</span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="pt-8 border-t border-slate-100 dark:border-zinc-800">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">R$</span>
                      <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{currentPrice}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">/mês</span>
                    </div>
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                       {activePeriod.installments}x de R$ {currentPrice}
                    </p>
                  </div>

                  <div className="space-y-4 pt-4">
                    {plan.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-4 group/item">
                        <div className="w-5 h-5 rounded-full bg-slate-50 dark:bg-zinc-800 flex items-center justify-center group-hover/item:bg-emerald-500 transition-colors">
                           <Check className="w-2.5 h-2.5 text-emerald-500 group-hover/item:text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight text-slate-600 dark:text-zinc-400">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-10">
                  <button 
                    onClick={() => handlePlanSelection(plan.id)}
                    disabled={settings.plan_id === plan.id}
                    className={cn(
                      "w-full py-6 rounded-[32px] font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-4 group active:scale-95 disabled:opacity-50",
                      isPremium 
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-500/20" 
                        : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90"
                    )}
                  >
                    {settings.plan_id === plan.id ? "Plano Ativo" : plan.buttonText}
                    {settings.plan_id !== plan.id && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Support Section */}
        <div className="mt-32 flex flex-col items-center gap-8">
           <div className="p-8 md:p-12 bg-white dark:bg-zinc-900 rounded-[48px] border border-slate-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-12 w-full max-w-5xl shadow-2xl">
              <div className="flex items-center gap-8">
                <div className="p-5 bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl text-emerald-600">
                  <MessageCircle className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Precisa de Ajuda?</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nossos especialistas estão prontos para te ajudar.</p>
                </div>
              </div>
              <button className="px-12 py-6 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-[28px] font-black uppercase tracking-[0.2em] text-[10px] hover:scale-105 transition-all shadow-xl active:scale-95">
                Falar com Consultor
              </button>
           </div>

           <button 
             onClick={() => {
               const whatsappNumber = "5515997472785";
               const msg = encodeURIComponent(`Olá! Gostaria de solicitar o cancelamento da minha assinatura no Represente-Me. Meu e-mail é: ${user?.email}`);
               window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
             }}
             className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-[0.3em] transition-colors flex items-center gap-2"
           >
             <X className="w-3 h-3" /> Desejo cancelar minha assinatura
           </button>
        </div>
      </main>
    </div>
  );
}
