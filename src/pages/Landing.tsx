import React from "react";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";
import { MapPin, Link as LinkIcon, Users, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-24 items-center">
            <img src={logo} alt="Represente-Me!" className="h-28 w-auto object-contain" />
            <div className="hidden md:flex items-center gap-8">
              <a href="#funcionalidades" className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors">Funcionalidades</a>
              <a href="#planos" className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors">Planos</a>
              <Link to="/login" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">Login</Link>
              <Link to="/login" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
                ComeÃ§ar Agora
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/map/1920/1080?blur=10')] bg-cover bg-center opacity-5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold mb-6 border border-indigo-200">
              Centralize tudo em um Ãºnico lugar.
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
              Domine as suas <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">VENDAS!</span>
            </h1>
            <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Tenha acesso a um mapa inteligente para ter um controle mais eficiente de suas vendas, melhore a gestÃ£o de seus clientes, tenha seu prÃ³prio painel de integraÃ§Ãµes, conecte tudo em um sÃ³ lugar e tenha uma base de prospecÃ§Ã£o implacÃ¡vel para o seu negÃ³cio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5">
                ComeÃ§ar Gratuitamente <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <a href="#planos" className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all hover:border-slate-300">
                ConheÃ§a nossos planos
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Funcionalidades</h2>
            <p className="mt-4 text-lg text-slate-600">Tudo que vocÃª precisa para acelerar suas vendas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <FeatureCard 
              icon={<MapPin className="w-8 h-8 text-indigo-600" />}
              title="Radar Territorial"
              description="GeolocalizaÃ§Ã£o focada em vendas. Identifique potenciais clientes diretamente no mapa da sua regiÃ£o. Busca integrada e auto-preenchimento via CNPJ."
            />
            <FeatureCard 
              icon={<LinkIcon className="w-8 h-8 text-indigo-600" />}
              title="Painel Atalho Hub"
              description="Integre todos os seus sistemas, sites essenciais, WhatsApp e links de uso recorrente em nossa interface principal. Acesso em um clique a tudo do negÃ³cio."
            />
            <FeatureCard 
              icon={<Users className="w-8 h-8 text-indigo-600" />}
              title="Mini CRM Dedicado"
              description="Cadastros rÃ¡pidos e dinÃƒÂ¢micos para organizar a carteira e acompanhar as relaÃ§Ãµes por meio de anotaÃ§Ãµes prÃ¡ticas para cada um de seus contatos."
            />
            <FeatureCard 
              icon={<Clock className="w-8 h-8 text-indigo-600" />}
              title="Tempo e EficiÃªncia"
              description="Desenvolvido para priorizar agilidade. Pare de perder tempo trocando entre vÃ¡rias abas/aplicativos, tenha mais tempo para focar em VENDER!"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Planos e PreÃ§os</h2>
            <p className="mt-4 text-lg text-slate-600">Escolha o plano ideal para o seu momento.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <PricingCard 
              title="Acesso Exclusivo"
              description="Ideal para prospectadores e representaÃ§Ãµes locais que estÃ£o comeÃ§ando a criar a carteira de vendas."
              price="R$ 99,90"
              features={[
                "AtÃ© 2 empresas cadastradas",
                "Acesso ao Mapa e CRM BÃ¡sico",
                "Suporte por email"
              ]}
              buttonText="Assinar"
            />
            <PricingCard 
              title="Profissional"
              description="Desenvolvido para agÃªncias, vendedores e distribuidores de mÃ©dio e grande volume."
              price="R$ 149,90/mÃªs"
              features={[
                "AtÃ© 5 empresas cadastradas",
                "Pesquisa AutomÃ¡tica de CNPJ",
                "Suporte PrioritÃ¡rio (WhatsApp)"
              ]}
              buttonText="Assinar Agora"
              popular
            />
            <PricingCard 
              title="Master"
              description="Projetado para escritÃ³rios de representaÃ§Ã£o master, holding de vendas e franquias atacadistas."
              price="R$ 199,90/mÃªs"
              features={[
                "Lojas + Links Ilimitados",
                "Mapeamento AvanÃ§ado",
                "Mentoria EstratÃ©gica Inclusa"
              ]}
              buttonText="Assinar"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img src={logo} alt="Represente-Me!" className="h-40 w-auto mx-auto mb-6 object-contain" />
          <p className="text-slate-400 text-sm">
            Ã‚Â© 2026 Represente-Me!. Conectando Vendas, Agilizando Processos.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all group">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function PricingCard({ title, description, price, features, buttonText, popular }: { title: string, description: string, price: string, features: string[], buttonText: string, popular?: boolean }) {
  return (
    <div className={`bg-white rounded-3xl p-8 border ${popular ? 'border-indigo-500 shadow-xl shadow-indigo-100 relative' : 'border-slate-200 shadow-sm'}`}>
      {popular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          Mais Popular
        </div>
      )}
      <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm mb-6 h-10">{description}</p>
      <div className="mb-8">
        <span className="text-4xl font-extrabold text-slate-900">{price}</span>
      </div>
      <ul className="space-y-4 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <span className="text-slate-600 text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      <Link to="/login" className={`block w-full py-3 px-4 rounded-xl text-center font-semibold transition-colors ${popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
        {buttonText}
      </Link>
    </div>
  );
}


