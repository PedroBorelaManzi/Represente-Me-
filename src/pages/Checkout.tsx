import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, CreditCard, QrCode, FileText, Lock, CheckCircle2, 
  ArrowLeft, ChevronRight, Info, Zap, Shield, Plus, Loader2, Ticket, Eye, EyeOff,
  AlertCircle, XCircle, CheckCircle, Percent, Calendar, ShieldAlert, Star
} from "lucide-react";
import { cn } from '../lib/utils';
import { Logo } from '../components/Logo';
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const plans = {
  exclusivo: { id: 'exclusivo', name: 'Exclusivo', base: 0 },
  premium: { id: 'premium', name: 'Premium', base: 147 },
  master: { id: 'master', name: 'Master', base: 297 }
};

function Requirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-4 h-4 rounded-full flex items-center justify-center transition-colors",
        met ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-300"
      )}>
        <CheckCircle2 className="w-3 h-3" />
      </div>
      <span className={cn(
        "text-[9px] font-bold uppercase tracking-tight transition-colors",
        met ? "text-emerald-600" : "text-slate-400"
      )}>{label}</span>
    </div>
  );
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get("plan") || "premium";
  const periodParam = searchParams.get("period") || "ANNUAL";
  const [selectedPlan] = useState<any>(plans[planId as keyof typeof plans] || plans.premium);
  
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

  // Lógica de Preços (Gym-style: Annual=Base, Semiannual=+10, Monthly=+20)
  const getMonthlyRate = () => {
    if (selectedPlan.base === 0) return 0;
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
      if (couponCode.toUpperCase() === "TESTE99") {
        setAppliedCoupon({ code: "TESTE99", discount: 95 });
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
          userId: authData.user?.id,
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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans text-slate-900 dark:text-zinc-100 selection:bg-emerald-500/30">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Logo size="sm" showText />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-500/20">
            <Lock className="w-3 h-3" />
            Ambiente Seguro
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-7 space-y-8">
            {/* Seletor de Modelo de Compra */}
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-zinc-900 p-2 rounded-[24px] border border-slate-100 dark:border-zinc-800 flex shadow-sm">
                {['ANNUAL', 'SEMIANNUAL', 'MONTHLY'].map((cycle) => (
                  <button 
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle as any)}
                    className={cn(
                      "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 relative overflow-hidden",
                      billingCycle === cycle ? (cycle === 'MONTHLY' ? "bg-slate-900 text-white shadow-lg" : "bg-emerald-600 text-white shadow-lg") : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {cycle === 'ANNUAL' ? <Zap className="w-4 h-4" /> : (cycle === 'SEMIANNUAL' ? <Zap className="w-4 h-4 opacity-50" /> : <Calendar className="w-4 h-4" />)}
                    {cycle === 'ANNUAL' ? 'Anual' : (cycle === 'SEMIANNUAL' ? '6 Meses' : 'Mensal')}
                    <span className="text-[8px] opacity-60">
                      R$ {selectedPlan.base + (cycle === 'MONTHLY' ? 20 : (cycle === 'SEMIANNUAL' ? 10 : 0))}/mês
                    </span>
                    {cycle === 'ANNUAL' && (
                      <div className="absolute top-0 right-0 p-1">
                        <Star className={cn("w-2 h-2 fill-current", billingCycle === 'ANNUAL' ? "text-white" : "text-emerald-500")} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              {billingCycle === 'ANNUAL' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-2 bg-amber-50 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-500/10 text-center"
                >
                  Economia de R$ 240,00 por ano ativada!
                </motion.div>
              )}
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-8">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-xl"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Dados Pessoais</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Crie sua conta para acessar o painel
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">E-mail de Acesso</label>
                        <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="seuemail@empresa.com" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Sua Senha</label>
                        <div className="relative">
                          <input required type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Confirme sua Senha</label>
                        <div className="relative">
                          <input required type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800">
                        <Requirement label="8+ caracteres" met={passwordRequirements.length} />
                        <Requirement label="Maiúscula" met={passwordRequirements.upper} />
                        <Requirement label="Minúscula" met={passwordRequirements.lower} />
                        <Requirement label="Número" met={passwordRequirements.number} />
                        <Requirement label="Especial" met={passwordRequirements.special} />
                        <Requirement label="Iguais" met={passwordRequirements.match} />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Nome Completo</label>
                        <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Digite seu nome" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">CPF / CNPJ</label>
                        <input required type="text" value={formData.cpfCnpj} onChange={(e) => setFormData({...formData, cpfCnpj: e.target.value})} placeholder="000.000.000-00" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Celular</label>
                        <input required type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="(00) 00000-0000" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                      </div>
                    </div>

                    <button 
                      type="button"
                      disabled={!isPasswordValid}
                      onClick={() => setStep(2)}
                      className={cn(
                        "w-full py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-3",
                        isPasswordValid ? "bg-slate-900 text-white hover:bg-slate-800 shadow-xl" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      {isPasswordValid ? "Próximo Passo" : "Complete os dados"}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-xl space-y-6">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Pagamento</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Escolha a melhor forma de investir no seu negócio
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-50 dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800">
                        <button type="button" onClick={() => setPaymentMethod('CREDIT_CARD')} className={cn("flex flex-col items-center gap-2 py-4 rounded-2xl transition-all", paymentMethod === 'CREDIT_CARD' ? "bg-white dark:bg-zinc-900 shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600")}><CreditCard className="w-5 h-5" /><span className="text-[9px] font-black uppercase tracking-widest">Cartão</span></button>
                        <button type="button" onClick={() => setPaymentMethod('PIX')} className={cn("flex flex-col items-center gap-2 py-4 rounded-2xl transition-all", paymentMethod === 'PIX' ? "bg-white dark:bg-zinc-900 shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600")}><QrCode className="w-5 h-5" /><span className="text-[9px] font-black uppercase tracking-widest">Pix</span></button>
                        <button type="button" onClick={() => setPaymentMethod('BOLETO')} className={cn("flex flex-col items-center gap-2 py-4 rounded-2xl transition-all", paymentMethod === 'BOLETO' ? "bg-white dark:bg-zinc-900 shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600")}><FileText className="w-5 h-5" /><span className="text-[9px] font-black uppercase tracking-widest">Boleto</span></button>
                      </div>

                      {paymentMethod === 'CREDIT_CARD' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                          <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Número do Cartão</label><input type="text" value={formData.cardNumber} onChange={(e) => setFormData({...formData, cardNumber: e.target.value})} placeholder="0000 0000 0000 0000" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none" /></div>
                          <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Validade</label><input type="text" value={formData.expiry} onChange={(e) => setFormData({...formData, expiry: e.target.value})} placeholder="MM/AA" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none" /></div>
                          <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">CVC</label><input type="text" value={formData.ccv} onChange={(e) => setFormData({...formData, ccv: e.target.value})} placeholder="123" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none" /></div>
                          <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Nome no Cartão</label><input type="text" value={formData.holderName} onChange={(e) => setFormData({...formData, holderName: e.target.value})} placeholder="COMO IMPRESSO NO CARTÃO" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none uppercase" /></div>
                        </div>
                      )}
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-4 disabled:opacity-50">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" />Finalizar Compra</>}
                    </button>
                    <div className="text-center"><button type="button" onClick={() => setStep(1)} className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600">Voltar</button></div>
                    
                    <div className="pt-8 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap justify-center gap-6 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                       <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                       <img src="https://www.asaas.com/assets/img/logo-asaas.svg" alt="Asaas" className="h-4" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-28 space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-8 border border-slate-100 dark:border-zinc-800 shadow-2xl space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Resumo</h3>
                  <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                    {billingCycle === 'ANNUAL' ? 'Plano Anual' : (billingCycle === 'SEMIANNUAL' ? 'Plano Semestral' : 'Plano Mensal')}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-zinc-100">
                        Acesso {selectedPlan.name}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                         {billingCycle === 'ANNUAL' ? '12 meses de acesso' : (billingCycle === 'SEMIANNUAL' ? '6 meses de acesso' : 'Recorrência Mensal')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900 dark:text-zinc-100">R$ {baseValue.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-zinc-950 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center gap-2"><Ticket className="w-3.5 h-3.5 text-emerald-600" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Cupom</span></div>
                    <div className="flex gap-2"><input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="CÓDIGO" className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-[10px] font-black outline-none" /><button type="button" onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode} className="bg-slate-900 text-white px-4 rounded-lg text-[9px] font-black uppercase tracking-widest">{isApplyingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}</button></div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-zinc-800/50 space-y-3">
                    {appliedCoupon && (
                      <div className="flex items-center justify-between text-emerald-600">
                        <p className="text-[10px] font-black uppercase tracking-widest">Desconto Cupom</p>
                        <p className="text-xs font-bold">- R$ {couponDiscount.toFixed(2).replace('.', ',')}</p>
                      </div>
                    )}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                          {billingCycle === 'ANNUAL' ? '12x de' : (billingCycle === 'SEMIANNUAL' ? '6x de' : 'Valor Único')}
                        </p>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                           R$ {(finalPrice / (billingCycle === 'ANNUAL' ? 12 : (billingCycle === 'SEMIANNUAL' ? 6 : 1))).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                           Total: R$ {finalPrice.toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-[9px] font-medium text-slate-400 leading-tight">
                           Pagamento Processado via Asaas
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex gap-4">
                  <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-[9px] font-medium text-blue-900 dark:text-blue-300 leading-relaxed">
                    Sua satisfação é nossa prioridade. Oferecemos 7 dias de garantia incondicional conforme o Código de Defesa do Consumidor.
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
