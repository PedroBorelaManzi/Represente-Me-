import React, { useState } from "react";
import { 
  Crown, 
  Star, 
  Gem, 
  Check, 
  ArrowRight, 
  Sparkles, 
  Home, 
  Ticket, 
  ArrowLeft, 
  Building2, 
  ShieldCheck,
  CheckCircle2,
  Clock,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../contexts/SettingsContext";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const planDetails = {
  exclusivo: {
    name: "Exclusivo",
    price: 117,
    icon: Building2,
    color: "text-slate-500",
    bg: "bg-slate-50 dark:bg-zinc-800/50",
    border: "border-slate-100 dark:border-zinc-700/50",
    features: ["1 Empresa Cadastrada", "Mapa de Clientes Básico", "CRM Básico", "Suporte via E-mail"]
  },
  profissional: {
    name: "Profissional",
    price: 167,
    icon: Gem,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/30",
    features: [
      "Até 3 Empresas Cadastradas",
      "Busca Automática por CNPJ",
      "Dashboard de Faturamento Avançado",
      "IA Gemini Pro 1.5 Integrada",
      "Suporte via WhatsApp Prioritário"
    ]
  },
  master: {
    name: "Master",
    price: 217,
    icon: Crown,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/30",
    features: [
      "Empresas Cadastradas Ilimitadas",
      "IA Gemini Pro 1.5 Avançada",
      "BI & Analytics Completo de Vendas",
      "Relatórios de Exportação White-label",
      "Inbox e E-mails Integrados",
      "Suporte Ultra Prioritário e Mentor"
    ]
  }
};

export default function OrderBump() {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [activeCoupon, setActiveCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const currentTier = settings.plan_id ? (settings.plan_id === 'premium' ? 'profissional' : settings.plan_id) : 'exclusivo';

  // Master is index 2, if they are already on Master, handle gracefully
  if (currentTier === 'master') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-slate-100 dark:border-zinc-800 text-center space-y-6 shadow-xl">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500">
            <Crown className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider">Você é Nível Master!</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
            Sua assinatura já está no nível máximo com todos os recursos premium, IA avançada e suporte ultra priorizado habilitados.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full py-5 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Ir para o Início
          </button>
        </div>
      </div>
    );
  }

  const nextTier = currentTier === 'exclusivo' ? 'profissional' : 'master';
  
  const currentPlan = planDetails[currentTier as keyof typeof planDetails];
  const nextPlan = planDetails[nextTier as keyof typeof planDetails];
  
  const standardDiff = nextPlan.price - currentPlan.price; // R$ 50
  
  // Calculate discount
  let discountAmount = 0;
  if (activeCoupon === 'UPGRADE20') {
    discountAmount = 10; // 20% off the diff
  } else if (activeCoupon === 'REPRESENTE50') {
    discountAmount = 25; // 50% off the diff
  }

  const finalDiff = standardDiff - discountAmount;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    const normalized = couponCode.toUpperCase().trim();
    
    if (normalized === 'UPGRADE20') {
      setActiveCoupon('UPGRADE20');
      toast.success("Cupom UPGRADE20 aplicado: 20% de desconto recorrente!");
    } else if (normalized === 'REPRESENTE50') {
      setActiveCoupon('REPRESENTE50');
      toast.success("Cupom REPRESENTE50 aplicado: 50% de desconto na primeira parcela!");
    } else if (couponCode === "") {
      setCouponError("Insira um código válido.");
    } else {
      setCouponError("Cupom inválido ou expirado.");
    }
  };

  const handleRemoveCoupon = () => {
    setActiveCoupon(null);
    setCouponCode("");
    toast.info("Cupom removido.");
  };

  const handleConfirmUpgrade = async () => {
    setLoading(true);
    try {
      // Simulate gateway transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update in local settings context which syncs online and offline cache
      await updateSettings({ plan_id: nextTier });
      
      setIsSuccess(true);
      toast.success(`Parabéns! Seu upgrade para o plano ${nextPlan.name} foi processado!`);
    } catch (e) {
      toast.error("Erro ao processar o seu upgrade de assinatura. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-white dark:bg-zinc-900 rounded-[48px] p-10 border border-slate-100 dark:border-zinc-800 text-center space-y-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-24 h-24 rounded-[36px] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12 animate-pulse" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Upgrade Concluído!</h2>
            <p className="text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
              Assinatura atualizada com sucesso para {nextPlan.name}
            </p>
            <p className="text-slate-400 dark:text-zinc-500 text-xs leading-relaxed font-medium">
              Todos os benefícios e recursos de inteligência do plano **{nextPlan.name}** já estão ativos e liberados em sua conta. Nosso motor neural já reconfigurou seus limites de acesso.
            </p>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-zinc-800/40 rounded-3xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500 text-white rounded-xl">
                <nextPlan.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{nextPlan.name}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Ativo</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">R$ {nextPlan.price}/mês</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase">Faturamento Mensal</p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full py-5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Acessar minha Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-4 lg:p-12 transition-colors duration-300 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Back Link */}
        <button 
          onClick={() => navigate('/dashboard')}
          className="mb-8 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Início
        </button>

        {/* Title Block */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            Upgrade de Assinatura Exclusivo
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-4">
            Desbloqueie o próximo nível com <span className="text-emerald-600">{nextPlan.name}</span>
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 font-medium max-w-xl mx-auto text-sm leading-relaxed">
            Turbine o seu dia a dia de vendas com limites maiores, inteligência artificial integrada e relatórios exclusivos criados para alta conversão.
          </p>
        </div>

        {/* Split Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Compare current and next plan benefits */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Split Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Current Plan Mini Box */}
              <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-slate-400">
                    <currentPlan.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider border border-slate-100 dark:border-zinc-800 px-2 py-0.5 rounded-full">Plano Atual</span>
                </div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-tight leading-none mb-1">{currentPlan.name}</h3>
                <p className="text-lg font-black text-slate-500">R$ {currentPlan.price}<span className="text-[9px] font-bold">/mês</span></p>
              </div>

              {/* Next Plan Upsell Mini Box */}
              <div className="p-6 rounded-3xl bg-emerald-600/5 dark:bg-emerald-500/5 border border-emerald-500/30 text-left relative overflow-hidden ring-2 ring-emerald-500/10">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-emerald-505 text-white rounded-xl shadow-lg shadow-emerald-500/20" style={{ backgroundColor: '#10b981' }}>
                    <nextPlan.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full animate-pulse">Recomendado</span>
                </div>
                <h3 className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight leading-none mb-1">{nextPlan.name}</h3>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">R$ {nextPlan.price}<span className="text-[9px] font-bold">/mês</span></p>
              </div>

            </div>

            {/* Premium Benefits Checklist */}
            <div className="p-8 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-100 dark:border-zinc-800 text-left space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">O que você está desbloqueando:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nextPlan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-50/50 dark:bg-zinc-800/20 p-3 rounded-2xl border border-slate-100/50 dark:border-zinc-800/40">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#10b981' }}>
                      <Check className="w-3 h-3 font-bold" />
                    </div>
                    <span className="text-[10px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-tight leading-tight">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Checkout Summary, Coupon & Confirm Button */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Price Breakdown Box */}
            <div className="p-8 bg-white dark:bg-zinc-900 rounded-[36px] border border-slate-100 dark:border-zinc-800 text-left space-y-6 shadow-lg shadow-slate-100/50 dark:shadow-none">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white pb-3 border-b border-slate-50 dark:border-zinc-800">Resumo da Assinatura</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Novo Plano ({nextPlan.name})</span>
                  <span>R$ {nextPlan.price}/mês</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Crédito do Plano Atual ({currentPlan.name})</span>
                  <span>-R$ {currentPlan.price}/mês</span>
                </div>
                
                {activeCoupon && (
                  <div className="flex justify-between text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                    <div className="flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Cupom {activeCoupon}</span>
                    </div>
                    <span>-R$ {discountAmount}/mês</span>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-50 dark:border-zinc-800 flex justify-between items-baseline">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Diferença Mensal</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Cobrado apenas o delta proporcional</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-400">R$</span>
                    <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{finalDiff}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">/mês</span>
                  </div>
                </div>
              </div>

              {/* Coupon Form */}
              <div className="pt-6 border-t border-slate-50 dark:border-zinc-800 space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Possui um cupom de desconto?</p>
                
                {!activeCoupon ? (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Código do cupom (opcional)" 
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                      className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850 rounded-2xl px-4 py-3.5 text-xs font-bold uppercase tracking-widest outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 transition-all placeholder:text-slate-400 placeholder:normal-case placeholder:tracking-normal"
                    />
                    <button 
                      type="submit"
                      className="px-5 bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shrink-0"
                    >
                      Aplicar
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-zinc-850/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{activeCoupon}</span>
                    </div>
                    <button 
                      onClick={handleRemoveCoupon}
                      className="text-[9px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest"
                    >
                      Remover
                    </button>
                  </div>
                )}

                {couponError && (
                  <p className="text-[9px] font-bold text-red-500 uppercase tracking-wide text-left pl-1">{couponError}</p>
                )}
              </div>

              {/* Confirm Upgrade Button */}
              <button 
                onClick={handleConfirmUpgrade}
                disabled={loading}
                className="w-full py-5 rounded-[24px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-98 disabled:opacity-50 transition-all relative overflow-hidden"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processando Upgrade...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>Confirmar Meu Upgrade</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-zinc-500 pt-2 border-t border-slate-50 dark:border-zinc-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600/30" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Upgrade seguro & Criptografado</span>
              </div>

            </div>

            {/* Satisfaction Banner */}
            <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 rounded-[28px] text-left flex items-start gap-4">
              <Clock className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-900 dark:text-emerald-400">Migração Proporcional</h4>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-500/80 font-medium leading-relaxed mt-1">
                  Seu faturamento é recalculado proporcionalmente aos dias restantes no ciclo de cobrança. Nenhum centavo é desperdiçado.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
