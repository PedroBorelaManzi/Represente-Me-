import React from "react";
import { Shield, Lock, Eye, FileText, ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Voltar para o Início
        </Link>
        
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[40px] p-12 sm:p-20 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <Shield className="w-40 h-40" />
          </div>

          <h1 className="text-4xl font-black text-slate-900 dark:text-zinc-100 mb-8 uppercase tracking-tighter">Política de Privacidade</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-12">Atualizado em 21 de Abril de 2026</p>

          <div className="space-y-10 text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600"><Eye className="w-4 h-4" /></div>
                1. Introdução
              </h2>
              <p>O Represente-se está comprometido em proteger sua privacidade. Esta Política de Privacidade explica como coletamos, usamos e protegemos suas informações ao utilizar nosso CRM e serviços integrados.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600"><Mail className="w-4 h-4" /></div>
                2. Integração com Google Gmail API
              </h2>
              <p>Nosso aplicativo utiliza os serviços de API do Google para permitir que você gerencie seus e-mails diretamente de dentro do CRM. Ao conectar sua conta do Gmail, você nos concede permissão para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Ler suas mensagens e configurações (Escopo: <code className="bg-slate-100 p-1 rounded">gmail.readonly</code>).</li>
                <li>Enviar e-mails em seu nome (Escopo: <code className="bg-slate-100 p-1 rounded">gmail.send</code>).</li>
              </ul>
              <p className="bg-slate-100 dark:bg-zinc-800 p-6 rounded-2xl border-l-4 border-emerald-500 font-bold text-slate-900 dark:text-zinc-100">
                Uso de Dados: O uso de informações recebidas das APIs do Google pelo Represente-se seguirá a <a href="https://developers.google.com/terms/api-services-user-data-policy#limited-use-policy" className="text-emerald-600 underline">Política de Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de "Uso Limitado".
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600"><Lock className="w-4 h-4" /></div>
                3. Como Protegemos seus Dados
              </h2>
              <p>Não armazenamos o conteúdo bruto de seus e-mails em nossos servidores permanentes. O acesso é feito via tokens seguros e apenas para exibição imediata no seu painel. Seus tokens de acesso são criptografados e armazenados no Supabase com politicas de segurança rigorosas (RLS).</p>
              <p>O Represente-se **NUNCA** compartilhará, venderá ou usará seus dados de e-mail para fins publicitários ou de marketing de terceiros.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600"><FileText className="w-4 h-4" /></div>
                4. Retenção de Dados
              </h2>
              <p>Você pode revogar o acesso do Represente-se aos seus dados do Google a qualquer momento através das configurações da sua Conta do Google ou excluindo sua conta em nosso CRM.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
