import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, ShieldCheck, Zap, Star, LayoutDashboard, Send, Users, Building2, BarChart3, ArrowRight } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const plans = [
  {
    name: 'Acesso Exclusivo',
    price: 'Grátis',
    description: 'Para quem está começando seu território.',
    icon: LayoutDashboard,
    features: [
      'Até 1 Empresa (Representada)',
      'Importe até 50 clientes',
      'Envio de pedidos unitário',
      'Alertas de inatividade',
      'Agenda e Feriados'
    ],
    cta: 'Seu plano atual',
    current: true,
    color: 'slate'
  },
  {
    name: 'Profissional',
    price: 'R$ 79,90',
    period: '/mês',
    description: 'A ferramenta completa para o seu dia a dia.',
    icon: Zap,
    features: [
      'Até 3 Empresas',
      'Importação ilimitada',
      'Envio em lote (até 10 por vez)',
      'Google Agenda Inteligente',
      'Dashboard Completo',
      'Suporte prioritário'
    ],
    cta: 'Assinar Profissional',
    popular: true,
    color: 'indigo'
  },
  {
    name: 'Master',
    price: 'R$ 149,90',
    period: '/mês',
    description: 'Potência máxima e visão estratégica total.',
    icon: Crown,
    features: [
      'Até 10 Empresas',
      'Envio em lote ilimitado',
      'Relatório Comparativo Master',
      'Análise de performance',
      'Visualização de BI',
      'Tudo ilimitado'
    ],
    cta: 'Assinar Master',
    color: 'purple'
  }
];

export default function Planos() {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-8 pt-24 lg:pt-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full mb-4 text-sm font-black uppercase tracking-widest"
          >
            <ShieldCheck className="w-4 h-4" />
            Escolha sua potência
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-zinc-100 mb-4"
          >
            O próximo nível do seu CRM<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">começa agora.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto font-medium"
          >
            Seja um representante de elite com ferramentas avançadas para gerenciar suas empresas e clientes com precisão.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-white dark:bg-zinc-900 rounded-[40px] p-8 shadow-xl ${
                plan.popular ? 'border-2 border-indigo-500 ring-4 ring-indigo-500/10' : 'border border-slate-100 dark:border-zinc-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                  Mais Vendido
                </div>
              )}

              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 bg-${plan.color}-50 dark:bg-${plan.color}-950/30 text-${plan.color}-600`}>
                <plan.icon className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-slate-900 dark:text-zinc-100 mb-2">{plan.name}</h2>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-black text-slate-900 dark:text-zinc-100">{plan.price}</span>
                {plan.period && <span className="text-slate-400 font-bold">{plan.period}</span>}
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8 font-semibold">{plan.description}</p>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="p-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-600 dark:text-zinc-300">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
                  settings.subscription_plan === plan.name
                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-default'
                    : plan.popular
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                    : 'bg-slate-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-lg shadow-slate-200 dark:shadow-none'
                }`}
              >
                {settings.subscription_plan === plan.name ? 'Plano Atual' : plan.cta}
                {settings.subscription_plan !== plan.name && <ArrowRight className="w-4 h-4 ml-1" />}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="text-slate-400 dark:text-zinc-500 text-sm font-bold flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Pagamento Seguro via Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
