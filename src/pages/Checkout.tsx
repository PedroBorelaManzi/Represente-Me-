import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, CreditCard, QrCode, FileText, Lock, CheckCircle2, 
  ArrowLeft, ChevronRight, Info, Zap, Shield, Plus, Loader2, Ticket, Eye, EyeOff,
  AlertCircle, XCircle, CheckCircle, Percent
} from "lucide-react";
import { cn } from '../lib/utils';
import { Logo } from '../components/Logo';
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const plans = {
  exclusivo: { id: 'exclusivo', name: 'Exclusivo', price: 97, bump: 'profissional', bumpPrice: 50 },
  profissional: { id: 'profissional', name: 'Profissional', price: 147, bump: 'corporativo', bumpPrice: 50 },
  corporativo: { id: 'corporativo', name: 'Corporativo', price: 197, bump: null }
};

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get("plan") || "profissional";
  const [selectedPlan, setSelectedPlan] = useState<any>(plans[planId as keyof typeof plans] || plans.profissional);
  const [isBumpChecked, setIsBumpChecked] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX' | 'BOLETO'>('CREDIT_CARD');
  const [installments, setInstallments] = useState(1);
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

  // Lógica de Preços
  const basePrice = isBumpChecked && selectedPlan.bump 
    ? plans[selectedPlan.bump as keyof typeof plans].price 
    : selectedPlan.price;

  const couponDiscount = appliedCoupon ? (basePrice * appliedCoupon.discount) / 100 : 0;
  const pixDiscount = paymentMethod === 'PIX' ? (basePrice - couponDiscount) * 0.05 : 0;
  
  // Total antes dos juros do cartão
  const subtotal = basePrice - couponDiscount - pixDiscount;
  
  // Cálculo de Juros do Cartão (1% ao mês a partir da 7ª parcela)
  const installmentInterest = (paymentMethod === 'CREDIT_CARD' && installments > 6)
    ? subtotal * (0.01 * (installments - 6))
    : 0;

  const totalPrice = subtotal + installmentInterest;
  const installmentValue = totalPrice / installments;

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
          plan: isBumpChecked ? (selectedPlan.bump || selectedPlan.id) : selectedPlan.id,
          paymentMethod,
          installments,
          coupon: appliedCoupon?.code,
          finalPrice: totalPrice,
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
        toast.success("Conta criada e pagamento gerado!");
        if (data.invoiceUrl) {
          if (paymentMethod === 'PIX') toast.info("Redirecionando para o QR Code do Pix...");
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]" />
      </div>

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
            <div className="flex items-center gap-4 px-2">
              <div className={cn("flex items-center gap-2", step === 1 ? "text-emerald-600" : "text-slate-400")}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", step === 1 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500")}>1</div>
                <span className="text-[10px] font-black uppercase tracking-widest">Identificação</span>
              </div>
              <div className="h-px w-8 bg-slate-200 dark:bg-zinc-800" />
              <div className={cn("flex items-center gap-2", step === 2 ? "text-emerald-600" : "text-slate-400")}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", step === 2 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500")}>2</div>
                <span className="text-[10px] font-black uppercase tracking-widest">Pagamento</span>
              </div>
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
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Crie sua conta para acessar o sistema</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">E-mail de Acesso</label>
                        <input 
                          required
                          type="email" 
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="seuemail@empresa.com"
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Sua Senha</label>
                        <div className="relative">
                          <input 
                            required
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Confirme sua Senha</label>
                        <div className="relative">
                          <input 
                            required
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                          />
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
                        <Requirement label="Especial (!@#)" met={passwordRequirements.special} />
                        <Requirement label="Senhas coincidem" met={passwordRequirements.match} />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Nome Completo</label>
                        <input 
                          required
                          type="text" 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Digite seu nome"
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">CPF / CNPJ</label>
                        <input 
                          required
                          type="text" 
                          value={formData.cpfCnpj}
                          onChange={(e) => setFormData({...formData, cpfCnpj: e.target.value})}
                          placeholder="000.000.000-00"
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Celular</label>
                        <input 
                          required
                          type="text" 
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="(00) 00000-0000"
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button 
                      type="button"
                      disabled={!isPasswordValid}
                      onClick={() => setStep(2)}
                      className={cn(
                        "w-full py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-3",
                        isPasswordValid ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      {isPasswordValid ? "Ir para o Pagamento" : "Complete os requisitos da senha"}
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
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Forma de Pagamento</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escolha como deseja pagar</p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-50 dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800">
                        <button type="button" onClick={() => setPaymentMethod('CREDIT_CARD')} className={cn("flex flex-col items-center gap-2 py-4 rounded-2xl transition-all", paymentMethod === 'CREDIT_CARD' ? "bg-white dark:bg-zinc-900 shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600")}><CreditCard className="w-5 h-5" /><span className="text-[9px] font-black uppercase tracking-widest">Cartão</span></button>
                        <button type="button" onClick={() => setPaymentMethod('PIX')} className={cn("flex flex-col items-center gap-2 py-4 rounded-2xl transition-all", paymentMethod === 'PIX' ? "bg-white dark:bg-zinc-900 shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600")}><QrCode className="w-5 h-5" /><span className="text-[9px] font-black uppercase tracking-widest">Pix</span></button>
                        <button type="button" onClick={() => setPaymentMethod('BOLETO')} className={cn("flex flex-col items-center gap-2 py-4 rounded-2xl transition-all", paymentMethod === 'BOLETO' ? "bg-white dark:bg-zinc-900 shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600")}><FileText className="w-5 h-5" /><span className="text-[9px] font-black uppercase tracking-widest">Boleto</span></button>
                      </div>

                      <div className="space-y-6 pt-4">
                        {paymentMethod === 'CREDIT_CARD' && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Número do Cartão</label><input type="text" value={formData.cardNumber} onChange={(e) => setFormData({...formData, cardNumber: e.target.value})} placeholder="0000 0000 0000 0000" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none" /></div>
                              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Validade</label><input type="text" value={formData.expiry} onChange={(e) => setFormData({...formData, expiry: e.target.value})} placeholder="MM/AA" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none" /></div>
                              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">CVC</label><input type="text" value={formData.ccv} onChange={(e) => setFormData({...formData, ccv: e.target.value})} placeholder="123" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none" /></div>
                              <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Nome no Cartão</label><input type="text" value={formData.holderName} onChange={(e) => setFormData({...formData, holderName: e.target.value})} placeholder="Como impresso no cartão" className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none" /></div>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Opções de Parcelamento</label>
                              <select 
                                value={installments}
                                onChange={(e) => setInstallments(Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none"
                              >
                                {[...Array(12)].map((_, i) => {
                                  const n = i + 1;
                                  const hasInterest = n > 6;
                                  const interestRate = hasInterest ? 0.01 * (n - 6) : 0;
                                  const val = (subtotal * (1 + interestRate)) / n;
                                  return (
                                    <option key={n} value={n}>
                                      {n}x de R$ {val.toFixed(2).replace('.', ',')} {hasInterest ? '(1% juros a.m)' : '(Sem juros)'}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>
                        )}
                        {paymentMethod === 'PIX' && (
                          <div className="text-center p-8 bg-emerald-50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center">
                                <QrCode className="w-6 h-6" />
                              </div>
                              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                                <Percent className="w-6 h-6" />
                              </div>
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-tight text-emerald-900 dark:text-emerald-400 mb-2">Desconto de 5% Aplicado</h4>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-relaxed">Pague à vista via Pix e economize.</p>
                          </div>
                        )}
                        {paymentMethod === 'BOLETO' && (<div className="text-center p-8 bg-slate-50 dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800"><FileText className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4" /><h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-zinc-100 mb-2">Vencimento em 3 dias</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Liberação em até 2 dias úteis.</p></div>)}
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" />Finalizar Compra</>}
                    </button>
                    <div className="text-center"><button type="button" onClick={() => setStep(1)} className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600">Voltar para identificação</button></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-28 space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-8 border border-slate-100 dark:border-zinc-800 shadow-2xl space-y-8">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Seu Pedido</h3>
                <div className="space-y-4">
                  <div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-zinc-100">Assinatura Mensal</p><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Plano {selectedPlan.name}</p></div><p className="text-sm font-black text-slate-900 dark:text-zinc-100">R$ {basePrice.toFixed(2).replace('.', ',')}</p></div>
                  {selectedPlan.bump && (
                    <div className={cn("group p-6 rounded-[28px] border-2 transition-all duration-500 cursor-pointer relative overflow-hidden", isBumpChecked ? "bg-emerald-600 border-emerald-500 shadow-lg" : "bg-slate-50 dark:bg-zinc-950 border-emerald-500/20 hover:border-emerald-500/50")} onClick={() => setIsBumpChecked(!isBumpChecked)}>
                      {!isBumpChecked && <Plus className="absolute top-3 right-3 w-4 h-4 text-emerald-500 animate-pulse" />}
                      <div className="flex items-start gap-4">
                        <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all", isBumpChecked ? "bg-white border-white text-emerald-600" : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800")}>{isBumpChecked && <CheckCircle2 className="w-4 h-4" />}</div>
                        <div className="space-y-1"><p className={cn("text-[9px] font-black uppercase tracking-[0.1em]", isBumpChecked ? "text-white" : "text-emerald-600")}>Upgrade Imperdível</p><h4 className={cn("text-[11px] font-black uppercase tracking-tight", isBumpChecked ? "text-white" : "text-slate-900 dark:text-white")}>Plano {plans[selectedPlan.bump as keyof typeof plans].name}</h4><p className={cn("text-[9px] font-medium leading-relaxed", isBumpChecked ? "text-white/80" : "text-slate-500")}>Leve automação com IA por apenas + R$ {selectedPlan.bumpPrice},00/mês.</p></div>
                      </div>
                    </div>
                  )}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800/50 space-y-4">
                    <div className="bg-slate-50 dark:bg-zinc-950 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center gap-2"><Ticket className="w-3.5 h-3.5 text-emerald-600" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Cupom de Desconto</span></div>
                      <div className="flex gap-2"><input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="CÓDIGO" className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20" /><button type="button" onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode} className="bg-slate-900 text-white px-3 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all">{isApplyingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}</button></div>
                      {appliedCoupon && (<div className="flex items-center justify-between px-2 py-1.5 bg-emerald-500/10 rounded-md border border-emerald-500/20"><span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Ativo: {appliedCoupon.code}</span><button type="button" onClick={() => setAppliedCoupon(null)} className="text-[8px] font-black text-emerald-600 hover:underline">X</button></div>)}
                    </div>
                    {appliedCoupon && (<div className="flex items-center justify-between text-emerald-600"><p className="text-[10px] font-black uppercase tracking-widest">Cupom ({appliedCoupon.discount}%)</p><p className="text-xs font-bold">- R$ {couponDiscount.toFixed(2).replace('.', ',')}</p></div>)}
                    {paymentMethod === 'PIX' && (<div className="flex items-center justify-between text-emerald-600"><p className="text-[10px] font-black uppercase tracking-widest">Desconto Pix (5%)</p><p className="text-xs font-bold">- R$ {pixDiscount.toFixed(2).replace('.', ',')}</p></div>)}
                    {paymentMethod === 'CREDIT_CARD' && installments > 6 && (<div className="flex items-center justify-between text-amber-600"><p className="text-[10px] font-black uppercase tracking-widest">Juros Parcelamento</p><p className="text-xs font-bold">+ R$ {installmentInterest.toFixed(2).replace('.', ',')}</p></div>)}
                    
                    <div className="flex items-center justify-between"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</p><p className="text-xs font-bold text-slate-900 dark:text-zinc-100">R$ {basePrice.toFixed(2).replace('.', ',')}</p></div>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 dark:border-zinc-800/50">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a pagar</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">R$ {totalPrice.toFixed(2).replace('.', ',')}</p>
                      {paymentMethod === 'CREDIT_CARD' && (
                        <p className="text-[10px] font-bold text-emerald-600 mt-1">
                          {installments}x de R$ {installmentValue.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Recorrência Mensal</p>
                      <p className="text-[9px] font-medium text-slate-400 leading-tight">Cancele quando quiser</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-12 text-center border-t border-slate-100 dark:border-zinc-800/50 mt-12">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Pagamentos processados via Asaas</p>
        <img src="https://www.asaas.com/assets/img/brand/asaas-logo-blue.svg" alt="Asaas" className="h-4 mx-auto dark:invert opacity-50" />
      </footer>
    </div>
  );
}

function Requirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={cn("flex items-center gap-1.5 transition-all", met ? "text-emerald-600" : "text-slate-400 opacity-60")}>
      {met ? <CheckCircle className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
      <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </div>
  );
}
