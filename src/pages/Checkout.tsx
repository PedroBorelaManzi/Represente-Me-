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
  exclusivo: {
    id: 'exclusivo',
    name: 'Exclusivo',
    icon: Trophy,
    color: 'text-slate-400',
    prices: {
      MONTHLY: 97,
      SEMIANNUAL: 77,
      ANNUAL: 67
    }
  },
  profissional: {
    id: 'profissional',
    name: 'Profissional',
    icon: Gem,
    color: 'text-emerald-500',
    prices: {
      MONTHLY: 147,
      SEMIANNUAL: 117,
      ANNUAL: 107
    }
  },
  master: {
    id: 'master',
    name: 'Master',
    icon: Crown,
    color: 'text-amber-500',
    prices: {
      MONTHLY: 197,
      SEMIANNUAL: 157,
      ANNUAL: 137
    }
  }
};


function isValidCPF(value: string): boolean {
  if (!value) return false;
  const clean = value.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;
  
  return true;
}

function isValidCNPJ(value: string): boolean {
  if (!value) return false;
  const clean = value.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;
  
  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

function isValidPhone(value: string): boolean {
  if (!value) return false;
  const clean = value.replace(/\D/g, '');
  if (clean.length !== 10 && clean.length !== 11) return false;
  
  const ddd = parseInt(clean.substring(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  
  if (clean.length === 11 && clean.charAt(2) !== '9') return false;
  
  return true;
}

const formatCpfCnpj = (value: string) => {
  const clean = value.replace(/\D/g, '').slice(0, 14);
  if (clean.length <= 11) {
    return clean
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    return clean
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
};

const formatPhone = (value: string) => {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 10) {
    return clean
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  } else {
    return clean
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }
};

const formatCardNumber = (value: string) => {
  const clean = value.replace(/\D/g, '').slice(0, 16);
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const formatExpiry = (value: string) => {
  const clean = value.replace(/\D/g, '').slice(0, 4);
  if (clean.length <= 2) return clean;
  return `${clean.slice(0, 2)}/${clean.slice(2)}`;
};

const formatCcv = (value: string) => {
  return value.replace(/\D/g, '').slice(0, 4);
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
  const [isCheckingUniqueness, setIsCheckingUniqueness] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [installments, setInstallments] = useState(12);

  useEffect(() => {
    setInstallments(12);
  }, [billingCycle]);

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
  
  const cleanCpfCnpj = formData.cpfCnpj.replace(/\D/g, '');
  const cleanPhone = formData.phone.replace(/\D/g, '');
  
  const isCpf = cleanCpfCnpj.length <= 11;
  const docValid = isCpf ? isValidCPF(cleanCpfCnpj) : isValidCNPJ(cleanCpfCnpj);
  
  const nameWords = formData.name.trim().split(/\s+/).filter(w => w.length > 0);
  const isPersonalName = nameWords.length >= 2;
  const hasCorporateTerms = /ltda|s\/?a|eireli|me|epp|cnpj/i.test(formData.name);
  
  const docNameMatch = isCpf 
    ? (isPersonalName && !hasCorporateTerms)
    : (formData.name.trim().length >= 3);
    
  const phoneValid = isValidPhone(cleanPhone);
  
  const isStep1Valid = formData.name && 
                       formData.email && 
                       formData.cpfCnpj && 
                       docValid && 
                       docNameMatch && 
                       formData.phone && 
                       phoneValid && 
                       isPasswordValid;

  const getMonthlyRate = () => {
    return selectedPlan.prices[billingCycle as keyof typeof selectedPlan.prices] || selectedPlan.prices.ANNUAL;
  };

  const monthlyRate = getMonthlyRate();
  const getTotalPrice = () => {
    if (billingCycle === 'ANNUAL') return monthlyRate * 12;
    if (billingCycle === 'SEMIANNUAL') return monthlyRate * 6;
    return monthlyRate;
  };

  const getCycleSavings = (cycleId: string) => {
    const monthlyPrice = selectedPlan.prices.MONTHLY;
    const currentPrice = selectedPlan.prices[cycleId as keyof typeof selectedPlan.prices] || monthlyPrice;
    if (cycleId === 'ANNUAL') {
      return `Economize R$ ${(monthlyPrice - currentPrice) * 12}`;
    }
    if (cycleId === 'SEMIANNUAL') {
      return `Economize R$ ${(monthlyPrice - currentPrice) * 6}`;
    }
    return "Sem fidelidade";
  };

  const baseValue = getTotalPrice();
  const couponDiscount = appliedCoupon ? (baseValue * appliedCoupon.discount) / 100 : 0;
  const priceAfterCoupon = baseValue - couponDiscount;
  const pixDiscount = paymentMethod === 'PIX' ? (priceAfterCoupon * 5) / 100 : 0;
  const finalPrice = priceAfterCoupon - pixDiscount;

  const handleApplyCoupon = () => {
    setIsApplyingCoupon(true);
    setTimeout(() => {
      const codeUpper = couponCode.trim().toUpperCase();
      if (codeUpper === "REPRESENTE95") {
        setAppliedCoupon({ code: "REPRESENTE95", discount: 95 });
        toast.success("Cupom de 95% aplicado!");
      } else if (codeUpper === "TESTE") {
        setAppliedCoupon({ code: "TESTE", discount: 50 });
        toast.success("Cupom de 50% aplicado!");
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

      if (authError) {
        if (authError.message.toLowerCase().includes("already registered") || authError.message.toLowerCase().includes("already exists") || authError.status === 422) {
          throw new Error("Este e-mail já está cadastrado no sistema. Cada pessoa pode ter apenas uma conta.");
        }
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
            ccv: formData.ccv,
            installments
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
            <div className="space-y-6 relative pb-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Escolha seu Ciclo</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-500/10 rounded-full">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Recomendado</span>
                </div>
              </div>

              {/* Balão de Destaque Premium (Economia do Anual) */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border-l-4 border-amber-500 rounded-r-3xl text-left flex items-center gap-4 relative overflow-hidden group shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none mb-1">
                    Economia Máxima
                  </p>
                  <p className="text-xs font-black text-slate-800 dark:text-zinc-200 uppercase tracking-tight">
                    Ao escolher o Plano Anual, você economiza <span className="text-amber-600 dark:text-amber-500 font-black">R$ {selectedPlan.prices.MONTHLY - selectedPlan.prices.ANNUAL} por mês (R$ {(selectedPlan.prices.MONTHLY - selectedPlan.prices.ANNUAL) * 12}/ano)</span> em relação ao plano Mensal!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'ANNUAL', label: 'Anual', icon: Zap, color: 'bg-emerald-600', monthly: selectedPlan.prices.ANNUAL, save: `Economize R$ ${selectedPlan.prices.MONTHLY - selectedPlan.prices.ANNUAL}/mês` },
                  { id: 'SEMIANNUAL', label: '6 Meses', icon: TrendingUp, color: 'bg-emerald-600', monthly: selectedPlan.prices.SEMIANNUAL, save: `Economize R$ ${selectedPlan.prices.MONTHLY - selectedPlan.prices.SEMIANNUAL}/mês` },
                  { id: 'MONTHLY', label: 'Mensal', icon: Calendar, color: 'bg-emerald-600', monthly: selectedPlan.prices.MONTHLY, save: 'Sem desconto' }
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
                        <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="nome@empresa.com" className="w-full bg-slate-50 border border-slate-100 rounded-[24px] pl-8 pr-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all" />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Senha de Acesso</label>
                        <div className="relative">
                          <input required type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-100 rounded-[24px] pl-8 pr-16 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Confirmação</label>
                        <div className="relative">
                          <input required type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-100 rounded-[24px] pl-8 pr-16 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400">
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4 p-6 bg-slate-50 rounded-[32px] border border-slate-100 shadow-inner">
                        <Requirement label="8+ caracteres" met={passwordRequirements.length} />
                        <Requirement label="Maiúscula" met={passwordRequirements.upper} />
                        <Requirement label="Minúscula" met={passwordRequirements.lower} />
                        <Requirement label="Número" met={passwordRequirements.number} />
                        <Requirement label="Especial" met={passwordRequirements.special} />
                        <Requirement label="Iguais" met={passwordRequirements.match} />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Nome Completo</label>
                        <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Seu nome completo ou Razão Social" className="w-full bg-slate-50 border border-slate-100 rounded-[24px] pl-8 pr-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all" />
                        {formData.name && cleanCpfCnpj.length > 0 && isCpf && !docNameMatch && (
                          <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider px-4 mt-1">
                            {!isPersonalName ? "Informe Nome e Sobrenome para CPF" : "Nome não pode conter termos jurídicos"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">CPF / CNPJ</label>
                        <input required type="text" value={formData.cpfCnpj} onChange={(e) => setFormData({...formData, cpfCnpj: formatCpfCnpj(e.target.value)})} placeholder="000.000.000-00" className="w-full bg-slate-50 border border-slate-100 rounded-[24px] pl-8 pr-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all" />
                        {formData.cpfCnpj && !docValid && (
                          <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider px-4 mt-1">
                            {isCpf ? "CPF inválido (dígitos incorretos)" : "CNPJ inválido (dígitos incorretos)"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">WhatsApp</label>
                        <input required type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})} placeholder="(00) 00000-0000" className="w-full bg-slate-50 border border-slate-100 rounded-[24px] pl-8 pr-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all" />
                        {formData.phone && !phoneValid && (
                          <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider px-4 mt-1">
                            DDD ou número celular inválido
                          </p>
                        )}
                      </div>
                    </div>

                    <button 
                      type="button"
                      disabled={isCheckingUniqueness || !isStep1Valid}
                      onClick={async () => {
                        if (!isStep1Valid) {
                          toast.error("Por favor, preencha todos os campos e siga as regras de senha.");
                          return;
                        }
                        
                        setIsCheckingUniqueness(true);
                        const loadingToast = toast.loading("Verificando se o cadastro já existe...");
                        try {
                          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-checkout`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                            },
                            body: JSON.stringify({
                              action: 'check-uniqueness',
                              customer: {
                                name: formData.name,
                                email: formData.email,
                                cpfCnpj: formData.cpfCnpj,
                                phone: formData.phone
                              }
                            })
                          });
                          const data = await response.json();
                          const error = response.ok ? null : { message: data.message || 'Erro ao validar cadastro' };
                          
                          toast.dismiss(loadingToast);
                          setIsCheckingUniqueness(false);

                          if (error) {
                            toast.error(`Erro ao validar cadastro: ${error.message}`);
                            return;
                          }

                          if (data && !data.success) {
                            toast.error(data.message);
                            return;
                          }

                          setStep(2);
                        } catch (err: any) {
                          toast.dismiss(loadingToast);
                          setIsCheckingUniqueness(false);
                          toast.error(`Erro de conexão: ${err.message}`);
                        }
                      }}
                      className={cn(
                        "w-full py-6 rounded-[32px] font-black uppercase text-xs tracking-[0.3em] transition-all flex items-center justify-center gap-4 group active:scale-95",
                        isStep1Valid && !isCheckingUniqueness ? "bg-slate-900 text-white hover:bg-slate-800 shadow-2xl" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      {isCheckingUniqueness ? "Verificando..." : "Continuar para Pagamento"}
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
                    <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl space-y-10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Pagamento</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Segurança máxima com criptografia bancária
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-[24px] border border-slate-100 shadow-inner">
                          <Lock className="w-6 h-6 text-emerald-600" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 p-2 bg-slate-50 dark:bg-zinc-800/30 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-inner">
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
                                ? "bg-white dark:bg-zinc-900 shadow-xl text-emerald-600 dark:text-emerald-500 scale-[1.05]" 
                                : "text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                            )}
                          >
                            {method.id === 'PIX' && (
                              <span className="absolute top-2 right-2 px-2 py-0.5 bg-teal-500 text-white text-[7px] font-black uppercase tracking-wider rounded-full shadow-md shadow-teal-500/20 animate-bounce">
                                5% OFF
                              </span>
                            )}
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
                            <input type="text" value={formData.cardNumber} onChange={(e) => setFormData({...formData, cardNumber: formatCardNumber(e.target.value)})} placeholder="0000 0000 0000 0000" className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-zinc-900 transition-all" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Validade</label>
                            <input type="text" value={formData.expiry} onChange={(e) => setFormData({...formData, expiry: formatExpiry(e.target.value)})} placeholder="MM/AA" className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-zinc-900 transition-all" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">CVC</label>
                            <input type="text" value={formData.ccv} onChange={(e) => setFormData({...formData, ccv: formatCcv(e.target.value)})} placeholder="123" className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-zinc-900 transition-all" />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Titular do Cartão</label>
                            <input type="text" value={formData.holderName} onChange={(e) => setFormData({...formData, holderName: e.target.value})} placeholder="NOME COMO NO CARTÃO" className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-zinc-900 transition-all uppercase" />
                          </div>
                          <div className="md:col-span-2 space-y-2 relative">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Opções de Parcelamento</label>
                            <div className="relative">
                              <select 
                                value={installments} 
                                onChange={(e) => setInstallments(Number(e.target.value))} 
                                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-[24px] px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-zinc-900 transition-all appearance-none cursor-pointer pr-12 font-black uppercase text-[10px] tracking-wider"
                              >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => {
                                  const installmentValue = finalPrice / num;
                                  return (
                                    <option key={num} value={num} className="font-bold text-slate-700 dark:text-zinc-300">
                                      {num}x de R$ {installmentValue.toFixed(2).replace('.', ',')} Sem Juros
                                    </option>
                                  );
                                })}
                              </select>
                              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-zinc-500">
                                <ChevronRight className="w-4 h-4 rotate-90" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'PIX' && (
                        <div className="space-y-4 pt-4 text-left">
                          <div className="p-6 bg-gradient-to-r from-teal-500/5 to-emerald-500/5 dark:from-teal-500/10 dark:to-emerald-500/10 border border-teal-500/20 dark:border-teal-500/30 rounded-[32px] flex items-start gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center shrink-0">
                              <QrCode className="w-5 h-5 text-teal-600" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-zinc-200">Pagamento Instantâneo</h4>
                              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold leading-normal">
                                Ao clicar em <strong>Ativar Minha Assinatura</strong>, um código Copia e Cola e o QR Code do PIX serão gerados para você efetuar o pagamento imediatamente.
                              </p>
                            </div>
                          </div>
                          
                          <div className="p-4 bg-teal-50 dark:bg-teal-500/5 border border-teal-100 dark:border-teal-500/10 rounded-2xl flex items-center gap-3">
                            <Percent className="w-4 h-4 text-teal-600 shrink-0 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-400">
                              Você economizou R$ {pixDiscount.toFixed(2).replace('.', ',')} ao escolher pagar via PIX!
                            </span>
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'BOLETO' && (
                        <div className="space-y-4 pt-4 text-left">
                          <div className="p-6 bg-slate-50 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-800 rounded-[32px] flex items-start gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-slate-500" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-zinc-200">Boleto Bancário</h4>
                              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold leading-normal">
                                O boleto será gerado ao prosseguir. Note que boletos levam até 3 dias úteis para compensação bancária e liberação do acesso.
                              </p>
                            </div>
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
              <div className="bg-white rounded-[64px] p-10 border border-slate-100 shadow-2xl space-y-10 relative overflow-hidden text-center">
                <div className="flex items-center justify-between relative z-10">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Resumo</h3>
                  <div className="px-4 py-2 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20">
                    {billingCycle === 'ANNUAL' ? 'Plano Anual' : (billingCycle === 'SEMIANNUAL' ? 'Plano Semestral' : 'Plano Mensal')}
                  </div>
                </div>

                <div className="space-y-8 relative z-10">
                  <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100 shadow-inner text-left">
                    <div className={cn("w-16 h-16 rounded-[24px] bg-white flex items-center justify-center shadow-lg transition-transform hover:rotate-6", selectedPlan.color)}>
                      <selectedPlan.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                        Acesso {selectedPlan.name}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">
                         {billingCycle === 'ANNUAL' ? '12 meses renováveis' : (billingCycle === 'SEMIANNUAL' ? '6 meses renováveis' : 'Recorrência Mensal')}
                      </p>
                    </div>
                  </div>

                  {/* Cupom de Desconto Premium Highlighted */}
                  <div className="p-6 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-[32px] shadow-sm text-left space-y-4">
                    <div className="flex items-center gap-3">
                      <Ticket className="w-5 h-5 text-emerald-600 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-zinc-200">Possui um Cupom?</span>
                    </div>
                    
                    {!appliedCoupon ? (
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          value={couponCode} 
                          onChange={(e) => setCouponCode(e.target.value)} 
                          placeholder="Digite o cupom (Ex: REPRESENTE95)" 
                          className="flex-grow bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                        />
                        <button 
                          type="button" 
                          onClick={handleApplyCoupon} 
                          disabled={isApplyingCoupon || !couponCode}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center min-w-[90px]"
                        >
                          {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <Percent className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider leading-none mb-1">Cupom Ativo</p>
                            <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 leading-none">{appliedCoupon.code} (-{appliedCoupon.discount}%)</p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            setAppliedCoupon(null);
                            setCouponCode("");
                            toast.info("Cupom removido");
                          }}
                          className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-600 transition-all hover:underline"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Resumo de Preços Detalhado */}
                  <div className="py-6 border-y border-slate-100 dark:border-zinc-800 space-y-3 text-left">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <span>Valor do Ciclo</span>
                      <span>R$ {baseValue.toFixed(2).replace('.', ',')}</span>
                    </div>
                    
                    {appliedCoupon && (
                      <div className="flex justify-between text-xs font-bold text-emerald-600 uppercase tracking-widest">
                        <span>Cupom ({appliedCoupon.code})</span>
                        <span>- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}

                    {paymentMethod === 'PIX' && (
                      <div className="flex justify-between text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest animate-pulse">
                        <span>Desconto PIX (5%)</span>
                        <span>- R$ {pixDiscount.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-8 space-y-6">
                    {paymentMethod === 'CREDIT_CARD' ? (
                      <div>
                         <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4">
                            Parcela do Investimento
                         </p>
                         <p className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                            <span className="text-2xl mr-1">R$</span>{(finalPrice / installments).toFixed(2).replace('.', ',')}
                         </p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            No Cartão em {installments} parcelas mensais sem juros
                         </p>
                      </div>
                    ) : (
                      <div>
                         <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4">
                            Total a Investir (Valor Cheio)
                         </p>
                         <p className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                            <span className="text-2xl mr-1">R$</span>{finalPrice.toFixed(2).replace('.', ',')}
                         </p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            {paymentMethod === 'PIX' ? 'Pagamento Único à Vista via PIX' : 'Pagamento Único à Vista via Boleto'}
                         </p>
                      </div>
                    )}
                    
                    {paymentMethod === 'CREDIT_CARD' && (
                      <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-2xl border border-slate-100 dark:border-zinc-800">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Total a Investir (Valor Cheio)</p>
                         <p className="text-xs font-black text-slate-400 dark:text-zinc-300">R$ {finalPrice.toFixed(2).replace('.', ',')}</p>
                      </div>
                    )}
                  </div>                </div>

                <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 flex gap-6 shadow-sm text-left">
                  <ShieldAlert className="w-6 h-6 text-blue-600 shrink-0" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-900 leading-relaxed">
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
