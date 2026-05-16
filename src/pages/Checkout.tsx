import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, CreditCard, QrCode, FileText, Lock, CheckCircle2, 
  ArrowLeft, ChevronRight, Info, Zap, Shield, Plus, Loader2, Ticket, Eye, EyeOff,
  AlertCircle, XCircle, CheckCircle, Percent, Calendar, ShieldAlert, Star,
  Crown, Gem, Trophy, Sparkles, TrendingUp, User
} from "lucide-react";
import { cn } from '../lib/utils';
import { Logo } from '../components/Logo';
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const plans = {
  exclusivo: { id: 'exclusivo', name: 'Exclusivo', base: 97, icon: Trophy, color: 'text-slate-400' },
  profissional: { id: 'profissional', name: 'Profissional', base: 147, icon: Gem, color: 'text-emerald-500' },
  master: { id: 'master', name: 'Master', base: 197, icon: Crown, color: 'text-amber-500' }
};

function Requirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-4 h-4 rounded-full flex items-center justify-center transition-all duration-500",
        met ? "bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/20" : "bg-slate-100 dark:bg-zinc-800 text-slate-300"
      )}>
        <CheckCircle2 className="w-3 h-3" />
      </div>
      <span className={cn(
        "text-[9px] font-black uppercase tracking-tight transition-colors",
        met ? "text-emerald-600" : "text-slate-400"
      )}>{label}</span>
    </div>
  );
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawPlanId = searchParams.get("plan")?.toLowerCase() || "profissional";
  const periodParam = searchParams.get("period") || "ANNUAL";
  
  // Normalize planId
  let planId = rawPlanId;
  if (planId === 'premium') planId = 'profissional';
  
  const [selectedPlan] = useState<any>(plans[planId as keyof typeof plans] || plans.profissional);
  
  const [billingCycle, setBillingCycle] = useState<any>(periodParam);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX' | 'BOLETO'>('CREDIT_CARD');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [formData, setFormData] = useState({
    name: "", email: "", cpfCnpj: "", phone: "", password: "", confirmPassword: "",
    cardNumber: "", expiry: "", ccv: "", holderName: ""
  });

  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
    match: false
  });

  useEffect(() => {
    const pass = formData.password;
    setPasswordRequirements({
      length: pass.length >= 8,
      upper: /[A-Z]/.test(pass),
      lower: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
      match: pass !== "" && pass === formData.confirmPassword
    });
  }, [formData.password, formData.confirmPassword]);

  const isPasswordValid = Object.values(passwordRequirements).every(req => req);
  const isStep1Valid = formData.name && formData.email && formData.cpfCnpj && formData.phone && isPasswordValid;

  const getMonthlyRate = () => {
    const mod = billingCycle === 'MONTHLY' ? 20 : (billingCycle === 'SEMIANNUAL' ? 10 : 0);
    return selectedPlan.base + mod;
  };

  const monthlyRate = getMonthlyRate();
  const getTotalPrice = () => {
    if (billingCycle === 'ANNUAL') return monthlyRate * 12;
    if (billingCycle === 'SEMIANNUAL') return monthlyRate * 6;
    return monthlyRate;
  };

  const baseValue = getTotalPrice();
  const couponDiscount = appliedCoupon ? (baseValue * appliedCoupon.discount) / 100 : 0;
  const finalPrice = baseValue - couponDiscount;

  const handleApplyCoupon = () => {
    setIsApplyingCoupon(true);
    setTimeout(() => {
      if (couponCode.toUpperCase() === "REPRESENTE95") {
        setAppliedCoupon({ code: "REPRESENTE95", discount: 95 });
        toast.success("Cupom de 95% aplicado!");
      } else {
        toast.error("Cupom inválido");
      }
      setIsApplyingCoupon(false);
    }, 800);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      toast.error("A senha não atende aos requisitos de segurança.");
      return;
    }
    setLoading(true);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            phone: formData.phone,
            cpf_cnpj: formData.cpfCnpj
          }
        }
      });

      if (authError && authError.message !== "User already registered") {
        throw new Error(`Erro ao criar conta: ${authError.message}`);
      }

      const { data, error } = await supabase.functions.invoke('process-checkout', {
        body: {
          userId: authData?.user?.id,
          planId: selectedPlan.id,
          billingCycle,
          paymentMethod,
          coupon: appliedCoupon?.code,
          finalPrice,
          customer: {
            name: formData.name,
            email: formData.email,
            cpfCnpj: formData.cpfCnpj,
            phone: formData.phone
          },
          creditCard: paymentMethod === 'CREDIT_CARD' ? {
            holderName: formData.holderName,
            number: formData.cardNumber.replace(/\s/g, ''),
            expiryMonth: formData.expiry.split('/')[0],
            expiryYear: '20' + formData.expiry.split('/')[1],
            ccv: formData.ccv
          } : null
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(billingCycle === 'MONTHLY' ? "Assinatura criada com sucesso!" : "Pagamento processado!");
        if (data.invoiceUrl) {
          setTimeout(() => { window.location.href = data.invoiceUrl; }, 1500);
        } else {
          navigate("/login");
        }
      } else {
        toast.error(data.message || "Erro no processamento");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na comunicação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans text-slate-900 dark:text-zinc-100 selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-b border-slate-100 dark:border-zinc-800 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-all text-slate-400 active:scale-90">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Logo size="sm" showText={true} variant="light" />
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            {[
              { step: 1, label: 'Conta' },
              { step: 2, label: 'Pagamento' }
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                  step >= s.step ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"
                )}>
                  {step > s.step ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  step >= s.step ? "text-slate-900 dark:text-white" : "text-slate-400"
                )}>{s.label}</span>
                {s.step === 1 && <div className="w-12 h-[2px] bg-slate-100 dark:bg-zinc-800 rounded-full mx-2" />}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-500/5 px-6 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-500/10 shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            Checkout Seguro
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          <div className="lg:col-span-7 space-y-12">
            
            {/* Cycle Selector (No Gradient) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Escolha seu Ciclo</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-500/10 rounded-full">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Recomendado</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'ANNUAL', label: 'Anual', icon: Zap, save: 'Economize R$ 240', color: 'bg-emerald-600', monthly: selectedPlan.base },
                  { id: 'SEMIANNUAL', label: '6 Meses', icon: TrendingUp, save: 'Economize R$ 60', color: 'bg-emerald-600', monthly: selectedPlan.base + 10 },
                  { id: 'MONTHLY', label: 'Mensal', icon: Calendar, save: 'Sem fidelidade', color: 'bg-emerald-600', monthly: selectedPlan.base + 20 }
                ].map((cycle) => (
                  <button 
                    key={cycle.id}
                    type="button"
                    onClick={() => setBillingCycle(cycle.id)}
                    className={cn(
                      "relative p-6 rounded-[32px] border transition-all duration-500 text-left group overflow-hidden",
                      billingCycle === cycle.id 
                        ? `${cycle.color} border-emerald-700 shadow-2xl shadow-emerald-500/30 scale-[1.02]` 
                        : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 hover:border-emerald-500/50"
                    )}
                  >
                    <div className="relative z-10 flex flex-col h-full gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                        billingCycle === cycle.id ? "bg-white/20 text-white" : "bg-slate-50 dark:bg-zinc-800 text-slate-400 group-hover:scale-110"
                      )}>
                        <cycle.icon className="w-5 h-5" />
                      </div>
                      
                      <div>
                        <p className={cn("text-xs font-black uppercase tracking-widest mb-1", billingCycle === cycle.id ? "text-white" : "text-slate-900 dark:text-white")}>{cycle.label}</p>
                        <p className={cn("text-[9px] font-bold uppercase tracking-tight opacity-70", billingCycle === cycle.id ? "text-white" : "text-slate-400")}>{cycle.save}</p>
                      </div>

                      <div className="mt-auto pt-4 border-t border-current/10">
                        <span className={cn("text-lg font-black", billingCycle === cycle.id ? "text-white" : "text-slate-900 dark:text-white")}>R$ {cycle.monthly}</span>
                        <span className={cn("text-[10px] font-bold opacity-60 ml-1", billingCycle === cycle.id ? "text-white" : "text-slate-400")}>/mês</span>
                      </div>
                    </div>

                    {cycle.id === 'ANNUAL' && (
                      <div className="absolute top-4 right-4">
                        <Star className={cn("w-4 h-4", billingCycle === cycle.id ? "text-amber-300 fill-amber-300" : "text-amber-400 opacity-20")} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-8">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="space-y-8 bg-white dark:bg-zinc-900 p-10 rounded-[48px] border border-slate-100 dark:border-zinc-800 shadow-2xl relative overflow-hidden"
                  >
                    <div className="space-y-2 relative z-10">
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Crie sua Conta</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Acesse seu painel corporativo instantaneamente
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">E-mail Corporativo</label>
                        <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="nome@empresa.com" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Senha de Acesso</label>
                        <div className="relative">
                          <input required type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Confirmação</label>
                        <div className="relative">
                          <input required type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400">
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4 p-6 bg-slate-50 dark:bg-zinc-950 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-inner">
                        <Requirement label="8+ caracteres" met={passwordRequirements.length} />
                        <Requirement label="Maiúscula" met={passwordRequirements.upper} />
                        <Requirement label="Minúscula" met={passwordRequirements.lower} />
                        <Requirement label="Número" met={passwordRequirements.number} />
                        <Requirement label="Especial" met={passwordRequirements.special} />
                        <Requirement label="Iguais" met={passwordRequirements.match} />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Nome Completo</label>
                        <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Seu nome ou Razão Social" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">CPF / CNPJ</label>
                        <input required type="text" value={formData.cpfCnpj} onChange={(e) => setFormData({...formData, cpfCnpj: e.target.value})} placeholder="000.000.000-00" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">WhatsApp</label>
                        <input required type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="(00) 00000-0000" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        if (!isStep1Valid) {
                          toast.error("Por favor, preencha todos os campos e siga as regras de senha.");
                          return;
                        }
                        setStep(2);
                      }}
                      className={cn(
                        "w-full py-6 rounded-[32px] font-black uppercase text-xs tracking-[0.3em] transition-all flex items-center justify-center gap-4 group active:scale-95",
                        isStep1Valid ? "bg-slate-900 text-white hover:bg-slate-800 shadow-2xl" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      Continuar para Pagamento
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    className="space-y-8"
                  >
                    <div className="bg-white dark:bg-zinc-900 p-10 rounded-[48px] border border-slate-100 dark:border-zinc-800 shadow-2xl space-y-10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Pagamento</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Segurança máxima com criptografia bancária
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-[24px] border border-slate-100 dark:border-zinc-800 shadow-inner">
                          <Lock className="w-6 h-6 text-emerald-600" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 p-2 bg-slate-50 dark:bg-zinc-950 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-inner">
                        {[
                          { id: 'CREDIT_CARD', icon: CreditCard, label: 'Cartão' },
                          { id: 'PIX', icon: QrCode, label: 'Pix' },
                          { id: 'BOLETO', icon: FileText, label: 'Boleto' }
                        ].map((method) => (
                          <button 
                            key={method.id}
                            type="button" 
                            onClick={() => setPaymentMethod(method.id as any)} 
                            className={cn(
                              "flex flex-col items-center gap-3 py-6 rounded-[24px] transition-all relative overflow-hidden",
                              paymentMethod === method.id 
                                ? "bg-white dark:bg-zinc-900 shadow-xl text-emerald-600 scale-[1.05]" 
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                            )}
                          >
                            <method.icon className="w-6 h-6" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{method.label}</span>
                            {paymentMethod === method.id && (
                              <motion.div layoutId="method-pill" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500 mb-2" />
                            )}
                          </button>
                        ))}
                      </div>

                      {paymentMethod === 'CREDIT_CARD' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Número do Cartão</label>
                            <input type="text" value={formData.cardNumber} onChange={(e) => setFormData({...formData, cardNumber: e.target.value})} placeholder="0000 0000 0000 0000" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Validade</label>
                            <input type="text" value={formData.expiry} onChange={(e) => setFormData({...formData, expiry: e.target.value})} placeholder="MM/AA" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">CVC</label>
                            <input type="text" value={formData.ccv} onChange={(e) => setFormData({...formData, ccv: e.target.value})} placeholder="123" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Titular do Cartão</label>
                            <input type="text" value={formData.holderName} onChange={(e) => setFormData({...formData, holderName: e.target.value})} placeholder="NOME COMO NO CARTÃO" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all uppercase" />
                          </div>
                        </div>
                      )}
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-8 rounded-[40px] font-black uppercase text-xs tracking-[0.4em] hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_32px_64px_-16px_rgba(16,185,129,0.4)] flex items-center justify-center gap-6 disabled:opacity-50">
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ShieldCheck className="w-6 h-6" />Ativar Minha Assinatura</>}
                    </button>
                    
                    <div className="text-center">
                      <button type="button" onClick={() => setStep(1)} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-600 transition-colors py-4">
                        ← Revisar Dados Cadastrais
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-32 space-y-8">
              <div className="bg-white dark:bg-zinc-900 rounded-[64px] p-10 border border-slate-100 dark:border-zinc-800 shadow-2xl space-y-10 relative overflow-hidden text-center">
                <div className="flex items-center justify-between relative z-10">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Resumo</h3>
                  <div className="px-4 py-2 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20">
                    {billingCycle === 'ANNUAL' ? 'Plano Anual' : (billingCycle === 'SEMIANNUAL' ? 'Plano Semestral' : 'Plano Mensal')}
                  </div>
                </div>

                <div className="space-y-8 relative z-10">
                  <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-zinc-950 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-inner text-left">
                    <div className={cn("w-16 h-16 rounded-[24px] bg-white dark:bg-zinc-900 flex items-center justify-center shadow-lg transition-transform hover:rotate-6", selectedPlan.color)}>
                      <selectedPlan.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">
                        Acesso {selectedPlan.name}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">
                         {billingCycle === 'ANNUAL' ? '12 meses renováveis' : (billingCycle === 'SEMIANNUAL' ? '6 meses renováveis' : 'Recorrência Mensal')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 dark:border-zinc-800/50 space-y-6">
                    <div>
                       <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4">
                          Parcela do Investimento
                       </p>
                       <p className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                          <span className="text-2xl mr-1">R$</span>{(finalPrice / (billingCycle === 'ANNUAL' ? 12 : (billingCycle === 'SEMIANNUAL' ? 6 : 1))).toFixed(2).replace('.', ',')}
                       </p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                          {billingCycle === 'ANNUAL' ? '12 parcelas mensais' : (billingCycle === 'SEMIANNUAL' ? '6 parcelas mensais' : 'Pagamento Mensal')}
                       </p>
                    </div>
                    
                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Total a Investir (Valor Cheio)</p>
                       <p className="text-xs font-black text-slate-400">R$ {finalPrice.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-blue-50 dark:bg-blue-500/5 rounded-[32px] border border-blue-100 dark:border-blue-500/10 flex gap-6 shadow-sm text-left">
                  <ShieldAlert className="w-6 h-6 text-blue-600 shrink-0" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-900 dark:text-blue-300 leading-relaxed">
                    Satisfação Garantida: Experimente por 7 dias com reembolso integral caso não se adapte.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
