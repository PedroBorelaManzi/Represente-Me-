import React, { useState } from "react";
import { 
  motion, 
  useScroll, 
  useMotionValueEvent 
} from "framer-motion";
import { 
  Check, 
  Mail, 
  HelpCircle, 
  Building2, 
  ShoppingCart, 
  Plus as PlusIcon, 
  Stethoscope, 
  Briefcase,
  Zap,
  TrendingUp,
  Layout as LayoutIcon,
  ShieldCheck
} from "lucide-react";
import { Logo } from '../components/Logo';
import { Link } from "react-router-dom";

const industries = [
  { name: "Materiais de Construção", icon: Building2, color: "bg-orange-50 text-orange-600" },
  { name: "Supermercados", icon: ShoppingCart, color: "bg-emerald-50 text-emerald-600" },
  { name: "Farmácias", icon: PlusIcon, color: "bg-red-50 text-red-600" },
  { name: "Saúde", icon: Stethoscope, color: "bg-green-50 text-green-600" },
  { name: "Serviços", icon: Briefcase, color: "bg-emerald-50 text-emerald-600" },
  { name: "Outros", icon: Zap, color: "bg-slate-50 text-slate-600" },
];

const plans = [
  {
    name: "Exclusivo",
    price: 97,
    description: "Para quem está começando.",
    features: ["1 Empresa", "Mapa Básico", "CRM Básico", "Suporte Email"],
    buttonText: "Assinar Agora",
    popular: false,
  },
  {
    name: "Profissional",
    price: 147,
    description: "Ideal para equipes em crescimento.",
    features: ["5 Empresas", "Busca CNPJ Automática", "Dashboard de Faturamento", "Suporte WhatsApp"],
    buttonText: "Teste Grátis",
    popular: true,
  },
  {
    name: "Corporativo",
    price: 197,
    description: "Para grandes volumes e IA.",
    features: ["Empresas Ilimitadas", "Lançamento via Gemini (IA)", "Radar Territorial Avançado", "Automação de Pedidos"],
    buttonText: "Falar com Time",
    popular: false,
  },
  {
    name: "Ultimate",
    price: 247,
    description: "A solução completa definitiva.",
    features: ["Tudo do Corporativo", "BI & Analytics Avançado", "Personalização White-label", "Inbox Integrada"],
    buttonText: "Assinar VIP",
    popular: false,
  },
];

export default function LandingPitch() {
  const { scrollY } = useScroll();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [scrolled, setScrolled] = useState(false);

  const calculatePrice = (annualPrice: number) => {
    if (billingCycle === "annual") return annualPrice.toString();
    const withSurcharge = annualPrice * 1.1;
    const roundedUpToTen = Math.ceil(withSurcharge / 10) * 10;
    return (roundedUpToTen - 0.10).toFixed(2).replace(".", ",");
  };

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-emerald-100 selection:text-emerald-900 font-sans cursor-default overflow-x-hidden">
      {/* Navbar Smart */}
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/50 py-3" : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <div className="flex-shrink-0 flex items-center gap-3">
            <Logo size="lg" showText={true} />
          </div>
          
          <div className="hidden lg:flex items-center gap-10">
            <a href="#industrias" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Setores</a>
            <a href="#inbox" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Tecnologia</a>
            <a href="#planos" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Planos</a>
            <a href="#faq" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Dúvidas</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="px-6 py-3 rounded-2xl bg-slate-900 text-white hover-emerald-glow text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200">
              Entrar
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-48 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <span className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-widest border border-emerald-100 mb-8 inline-block shadow-sm">
              ✨ A revolução tecnológica do representante
            </span>
            <h1 className="text-5xl md:text-8xl font-black tracking-tight text-slate-900 mb-8 leading-[0.9] text-balance">
              Venda mais com <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400">Menos Esforço.</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto mb-12">
              Não é apenas um CRM. É o cérebro da sua operação comercial, automatizando o que antes tomava seu dia inteiro.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <a href="#planos" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all  hover:-translate-y-1 flex items-center justify-center">
                Criar conta gratuita
              </a>
              <button className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:border-slate-300 transition-all">
                Ver Vídeo Explicativo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof / Brands (Simplificado) */}
      <div className="max-w-7xl mx-auto px-6 mb-32 opacity-30 grayscale saturate-0 flex flex-wrap justify-center gap-12 md:gap-24">
         <Building2 className="w-8 h-8" />
         <ShoppingCart className="w-8 h-8" />
         <Zap className="w-8 h-8" />
         <LayoutIcon className="w-8 h-8" />
         <ShieldCheck className="w-8 h-8" />
      </div>

      {/* Industry Selection */}
      <section id="industrias" className="py-32 bg-white border-y border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.03),transparent)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Adaptável à sua realidade</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Interface customizada por setor de atuação</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {industries.map((item, idx) => (
              <motion.button
                key={idx}
                whileHover={{ y: -8, scale: 1.02 }}
                className="p-8 rounded-[32px] border border-slate-100 bg-white flex flex-col items-center gap-5 hover:shadow-2xl hover:border-emerald-100 transition-all group shadow-sm"
              >
                <div className={`p-5 rounded-2xl ${item.color} group-hover:scale-110 transition-transform shadow-sm`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tight text-slate-900 text-center leading-tight max-w-[120px]">
                  {item.name}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Inbox Section Refined */}
      <section id="inbox" className="py-32 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="lg:w-[40%] text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-6">
                <TrendingUp className="w-3 h-3" /> Faturamento Inteligente
              </div>
              <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-8 leading-[1.1]">
                Controle total da sua <span className="text-emerald-600">Comunicação</span>
              </h2>
              <p className="text-lg text-slate-500 font-medium leading-relaxed mb-10">
                O único CRM que centraliza sua caixa de entrada e vincula automaticamente cada e-mail ao histórico do cliente. Chega de perder pedidos enterrados em threads infinitas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left max-w-lg mx-auto lg:mx-0">
                 <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-3">
                       <Check className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 mb-1">IA Integration</p>
                    <p className="text-xs text-slate-400 font-bold leading-tight">Gemini lê e categoriza seus e-mails.</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                       <Check className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 mb-1">Histórico Real</p>
                    <p className="text-xs text-slate-400 font-bold leading-tight">Cada resposta vira um evento no CRM.</p>
                 </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="lg:w-[60%] w-full relative group"
            >
              <div className="absolute inset-0 bg-emerald-600/5 blur-[120px] rounded-full group-hover:bg-emerald-600/10 transition-all pointer-events-none" />
              <div className="relative transform lg:rotate-2 hover:rotate-0 transition-transform duration-700">
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="planos" className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-6">Investimento de Alto Retorno</h2>
            <div className="flex items-center justify-center gap-4">
              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${billingCycle === "monthly" ? "text-emerald-600" : "text-slate-400"}`}>Plano Mensal</span>
              <button 
                type="button"
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
                className="w-14 h-7 bg-slate-900 rounded-full p-1.5 cursor-pointer relative transition-all"
              >
                <motion.div 
                  animate={{ x: billingCycle === "annual" ? 28 : 0 }}
                  className="w-4 h-4 bg-emerald-400 rounded-full"
                />
              </button>
              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${billingCycle === "annual" ? "text-emerald-600" : "text-slate-400"}`}>Plano Anual</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plans.map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative p-10 rounded-[48px] border transition-all flex flex-col ${
                  plan.popular 
                    ? "bg-slate-900 border-slate-800 shadow-[0_40px_80px_rgba(0,0,0,0.1)] text-white scale-105 z-10" 
                    : "bg-white border-slate-100 text-slate-900 shadow-xl shadow-slate-100/50 hover:shadow-2xl"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-lg shadow-emerald-500/30">
                    Recomendado
                  </div>
                )}
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">{plan.name}</h3>
                <p className={`text-[10px] font-bold mb-10 uppercase tracking-widest ${plan.popular ? "text-slate-400" : "text-slate-300"}`}>
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1 mb-10">
                  <span className="text-xs font-black opacity-50">R$</span>
                  <span className="text-6xl font-black tracking-tighter">{calculatePrice(plan.price)}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest opacity-50`}>/mês</span>
                </div>
                <div className="space-y-5 mb-12 flex-1">
                  {plan.features.map((feat, fidx) => (
                    <div key={fidx} className="flex items-start gap-4">
                      <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${plan.popular ? "bg-white/10" : "bg-emerald-50"}`}>
                        <Check className={`w-3.5 h-3.5 ${plan.popular ? "text-emerald-400" : "text-emerald-600"}`} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-tight leading-tight opacity-90">{feat}</span>
                    </div>
                  ))}
                </div>
                <button className={`w-full py-5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-95 ${
                  plan.popular 
                    ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow-xl shadow-emerald-500/20" 
                    : "bg-slate-900 text-white hover-emerald-glow hover:bg-slate-800"
                }`}>
                  {plan.buttonText}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 bg-slate-50/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Perguntas Frequentes</h2>
          </div>
          <div className="space-y-4">
            {[
               { q: "O Gemini (IA) requer configuração?", a: "Não, já vem integrado com o modelo Pro 1.5 para análise de pedidos." },
               { q: "Posso importar minha lista atual?", a: "Sim, aceitamos planilhas Excel e CSV com busca automática de CNPJ." },
               { q: "Como funciona o Radar Territorial?", a: "Ele mapeia seus clientes e identifica áreas de baixa atividade automaticamente." }
            ].map((faq, fidx) => (
              <div key={fidx} className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:border-emerald-100 transition-all">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-3 flex items-center gap-3">
                   <HelpCircle className="w-4 h-4 text-emerald-500" />
                   {faq.q}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto rounded-[64px] bg-slate-900 p-12 md:p-24 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-emerald-600/10 blur-[100px] group-hover:bg-emerald-600/20 transition-all" />
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="relative">
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-8 leading-none">
              Pronto para ser um <br /> <span className="text-emerald-400 text-5xl md:text-8xl">SUPER REPRESENTANTE?</span>
            </h2>
            <p className="text-slate-400 font-medium text-lg max-w-xl mx-auto mb-12">
              Junte-se a mais de 2.000 que já alavancaram mais de 150% de suas vendas com a Represente-se
            </p>
            <a href="#planos" className="px-12 py-6 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-2xl shadow-emerald-500/20 inline-block">
              Começar agora mesmo
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo className="opacity-50 h-8 md:h-10" showText={true} />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
            © 2026 Represente-se — Tecnologia para Representações Comerciais
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900">Privacidade</a>
            <a href="#" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900">Termos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
