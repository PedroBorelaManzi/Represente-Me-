import React, { useState, useEffect } from "react";
import { 
  motion, 
  AnimatePresence,
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
  ShieldCheck,
  Store
} from "lucide-react";
import { Logo } from '../components/Logo';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const industries = [
  { 
    name: "Materiais de ConstruÃ§Ã£o", 
    icon: Building2, 
    color: "bg-orange-50 text-orange-600",
    image: "/assets/setor_materiais.png"
  },
  { 
    name: "Supermercados", 
    icon: ShoppingCart, 
    color: "bg-emerald-50 text-emerald-600",
    image: "/assets/setor_supermercado.png"
  },
  { 
    name: "FarmÃ¡cias", 
    icon: PlusIcon, 
    color: "bg-red-50 text-red-600",
    image: "/assets/setor_farmacia.png",
    objectPosition: "50% 20%"
  },
  { 
    name: "Distribuidoras", 
    icon: Store, 
    color: "bg-blue-50 text-blue-600",
    image: "/assets/setor_distribuidora.png"
  },
  { 
    name: "ServiÃ§os", 
    icon: Briefcase, 
    color: "bg-emerald-50 text-emerald-600",
    image: "/assets/setor_servicos.png",
    objectPosition: "50% 15%"
  },
  { 
    name: "Outros", 
    icon: Zap, 
    color: "bg-slate-50 text-slate-600",
    image: "/assets/setor_outros.png"
  },
];

const plans = [
  {
    name: "Exclusivo",
    price: 97,
    description: "Para quem estÃ¡ comeÃ§ando.",
    features: ["1 Empresa", "Mapa BÃ¡sico", "CRM BÃ¡sico", "Suporte Email"],
    buttonText: "Assinar Agora",
    popular: false,
  },
  {
    name: "Profissional",
    price: 147,
    description: "Ideal para equipes em crescimento.",
    features: ["5 Empresas", "Busca CNPJ AutomÃ¡tica", "Dashboard de Faturamento", "Suporte WhatsApp"],
    buttonText: "Teste GrÃ¡tis",
    popular: true,
  },
  {
    name: "Corporativo",
    price: 197,
    description: "Para grandes volumes e IA.",
    features: ["Empresas Ilimitadas", "LanÃ§amento via Gemini (IA)", "Radar Territorial AvanÃ§ado", "AutomaÃ§Ã£o de Pedidos"],
    buttonText: "Falar com Time",
    popular: false,
  },
  {
    name: "Ultimate",
    price: 247,
    description: "A soluÃ§Ã£o completa definitiva.",
    features: ["Tudo do Corporativo", "BI & Analytics AvanÃ§ado", "PersonalizaÃ§Ã£o White-label", "Inbox Integrada"],
    buttonText: "Assinar VIP",
    popular: false,
  },
];

export default function LandingPitch() {
  const { scrollY } = useScroll();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndustry, setHoveredIndustry] = useState<number | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-2 md:gap-4">
          <Link to={user ? "/dashboard" : "/"} className="flex-shrink-0 flex items-center gap-3">
            <Logo size={typeof window !== "undefined" && window.innerWidth < 768 ? "md" : "lg"} showText={true} />
          </Link>
          
          <div className="hidden lg:flex items-center gap-10">
            <a href="#industrias" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Setores</a>
            <a href="#inbox" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Tecnologia</a>
            <Link to="/register" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Planos</Link>
            <a href="#faq" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">DÃºvidas</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-slate-900 text-white hover-emerald-glow text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200">
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
              âœ¨ A revoluÃ§Ã£o tecnolÃ³gica do representante
            </span>
            <h1 className="text-4xl md:text-8xl font-black tracking-tight text-slate-900 mb-6 md:mb-8 leading-[1.1] md:leading-[0.9] text-balance">
              Venda mais com <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400">Menos EsforÃ§o.</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto mb-12">
              Domine sua carteira de clientes e recupere horas preciosas do seu dia. Nossa inteligÃªncia avanÃ§ada gerencia a memÃ³ria da sua operaÃ§Ã£o, antecipando necessidades e garantindo controle total para que nenhum pedido ou cliente fique para trÃ¡s â€” alÃ©m de diversas outras ferramentas que te ajudarÃ£o a vender mais e vender melhor!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link to="/register" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all  hover:-translate-y-1 flex items-center justify-center">
                Teste grÃ¡tis por 7 dias
              </Link>
              <button className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:border-slate-300 transition-all">
                Ver VÃ­deo Explicativo
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
      <section id="industrias" className="min-h-[80vh] py-32 bg-white border-y border-slate-100 relative overflow-hidden transition-all duration-700 flex items-center">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.03),transparent)] pointer-events-none z-10" />
        
        {/* Background Photo Overlay */}
        <AnimatePresence>
          {hoveredIndustry !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute inset-0 z-0"
            >
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-10 transition-all" />
              <motion.img 
                key={industries[hoveredIndustry].image}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                src={industries[hoveredIndustry].image} 
                alt="" 
                className="w-full h-full object-cover"
                style={{ objectPosition: (industries[hoveredIndustry] as any).objectPosition || "center" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto px-6 relative z-20 w-full">
          <div className="text-center mb-16">
            <h2 className={`text-4xl md:text-7xl font-black uppercase tracking-tighter mb-4 transition-all duration-500 ${hoveredIndustry !== null ? "text-white drop-shadow-lg" : "text-slate-900"}`}>
              AdaptÃ¡vel Ã  sua realidade
            </h2>
            <p className={`font-bold uppercase text-[10px] md:text-sm tracking-[0.3em] transition-all duration-500 ${hoveredIndustry !== null ? "text-white/80" : "text-slate-400"}`}>
              Interface customizada por setor de atuaÃ§Ã£o
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-8 max-w-7xl mx-auto">
            {industries.map((item, idx) => (
              <motion.button
                key={idx}
                onMouseEnter={() => setHoveredIndustry(idx)}
                onMouseLeave={() => setHoveredIndustry(null)}
                whileHover={{ y: -12, scale: 1.15 }}
                className={`p-6 md:p-12 rounded-[32px] md:rounded-[56px] border-2 flex flex-col items-center gap-6 transition-all duration-500 group shadow-lg ${
                  hoveredIndustry === null 
                    ? "bg-white border-slate-50 hover:shadow-2xl" 
                    : hoveredIndustry === idx
                      ? "bg-white border-white scale-125 z-30 shadow-2xl"
                      : "bg-white/5 border-white/10 opacity-30 blur-sm scale-90 grayscale"
                }`}
              >
                <div className={`p-4 md:p-7 rounded-[28px] ${item.color} group-hover:scale-110 transition-transform shadow-md`}>
                  <item.icon className="w-6 h-6 md:w-9 md:h-9" />
                </div>
                <span className={`text-[9px] md:text-[11px] font-black uppercase tracking-tight text-center leading-tight max-w-[140px] transition-all duration-500 ${
                  hoveredIndustry === idx ? "text-slate-900" : (hoveredIndustry === null ? "text-slate-900" : "text-white/0")
                }`}>
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
                Controle total da sua <span className="text-emerald-600">ComunicaÃ§Ã£o</span>
              </h2>
              <p className="text-lg text-slate-500 font-medium leading-relaxed mb-10">
                O Ãºnico CRM que centraliza sua caixa de entrada e vincula automaticamente cada e-mail ao histÃ³rico do cliente. Chega de perder pedidos enterrados em threads infinitas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left max-w-lg mx-auto lg:mx-0">
                 <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-3">
                       <Check className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 mb-1">IA Integration</p>
                    <p className="text-xs text-slate-400 font-bold leading-tight">Gemini lÃª e categoriza seus e-mails.</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                       <Check className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 mb-1">HistÃ³rico Real</p>
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
      

      {/* FAQ Section */}
      <section id="faq" className="py-32 bg-slate-50/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Perguntas Frequentes</h2>
          </div>
          <div className="space-y-4">
            {[
               { q: "O Gemini (IA) requer configuraÃ§Ã£o?", a: "NÃ£o, jÃ¡ vem integrado com o modelo Pro 1.5 para anÃ¡lise de pedidos." },
               { q: "Posso importar minha lista atual?", a: "Sim, aceitamos planilhas Excel e CSV com busca automÃ¡tica de CNPJ." },
               { q: "Como funciona o Radar Territorial?", a: "Ele mapeia seus clientes e identifica Ã¡reas de baixa atividade automaticamente." }
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
              Junte-se a mais de 2.000 que jÃ¡ alavancaram mais de 150% de suas vendas com a Represente-se
            </p>
            <Link to="/register" className="px-12 py-6 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-2xl shadow-emerald-500/20 inline-block">
              ComeÃ§ar agora mesmo
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo className="opacity-50 h-8 md:h-10" showText={true} />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
            Â© 2026 Represente-se â€” Tecnologia para RepresentaÃ§Ãµes Comerciais
          </p>
          <div className="flex gap-8">
            <Link to="/privacy" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Privacidade</Link>
            <Link to="/terms" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Termos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

