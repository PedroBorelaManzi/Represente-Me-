import React, { useState } from "react";
import { Mail, Search, ChevronLeft, ChevronRight, Inbox, Send, Edit, Trash2, Plus, Sparkles, AlertCircle, ArrowLeft, Star, Reply, Forward, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type EmailProvider = "google" | "microsoft";

type ConnectedAccount = {
  id: string;
  provider: EmailProvider;
  email: string;
};

// Mock Data
const MOCK_ACCOUNTS: ConnectedAccount[] = [
  { id: "1", provider: "google", email: "pedroborelamanzi@gmail.com" },
  { id: "2", provider: "microsoft", email: "pedro.comercial@outlook.com" }
];

const MOCK_EMAILS = [
  { id: "101", from: "João Silva", subject: "Dúvida sobre o Pedido #8482", preview: "Olá Pedro, gostaria de saber se o meu pedido já foi faturado e se temos...", time: "10:30", unread: true },
  { id: "102", from: "Carlos Distribuidora", subject: "Nova Tabela de Preços", preview: "Segue em anexo a nova tabela de preços acordada...", time: "09:15", unread: false },
  { id: "103", from: "Maria Souza", subject: "Reagendamento de Visita", preview: "Podemos remarcar nossa visita para a próxima quarta-feira?", time: "Ontem", unread: false },
  { id: "104", from: "Sistema Represente", subject: "Relatório Semanal", preview: "Aqui estão os seus números da semana passada. Faturado: R$ 45.000", time: "Seg", unread: false }
];

export default function EmailClient() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(MOCK_ACCOUNTS);
  const [selectedAccount, setSelectedAccount] = useState<ConnectedAccount | null>(null);
  
  // Inbox State
  const [currentFolder, setCurrentFolder] = useState<"inbox"|"sent"|"drafts"|"trash">("inbox");
  const [selectedEmail, setSelectedEmail] = useState<typeof MOCK_EMAILS[0] | null>(null);

  // Authentication Mock Handler
  const handleConnectProvider = (provider: EmailProvider) => {
    alert(\Redirecionando para o login seguro do \... (Escopos de e-mail ativados)\);
  };

  // 1. SELECT ACCOUNT SCREEN
  if (!selectedAccount) {
    return (
      <div className="h-full flex flex-col items-center justify-center -mt-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full text-center space-y-6 px-4">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/10">
            <Mail className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">
            Caixa de Entrada <span className="text-emerald-600">Universal</span>
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 font-medium text-lg max-w-xl mx-auto leading-relaxed">
            Centralize sua comunicação com clientes. Selecione uma conta vinculada ou conecte um novo provedor.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 text-left">
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all group flex items-start gap-4 text-left relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  {acc.provider === 'google' 
                    ? <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-5 h-5"/>
                    : <svg viewBox="0 0 23 23" className="w-5 h-5"><path fill="#f35325" d="M0 0h11v11H0z"/><path fill="#81bc06" d="M12 0h11v11H12z"/><path fill="#05a6f0" d="M0 12h11v11H0z"/><path fill="#ffba08" d="M12 12h11v11H12z"/></svg>
                  }
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{acc.provider === 'google' ? "Gmail" : "Outlook"}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">{acc.email}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center absolute right-6 top-1/2 -translate-y-1/2 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          <div className="my-10 flex items-center gap-4 max-w-md mx-auto opacity-50">
             <div className="h-px bg-slate-300 dark:bg-zinc-700 flex-1" />
             <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Ou conecte outra conta</span>
             <div className="h-px bg-slate-300 dark:bg-zinc-700 flex-1" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <button onClick={() => handleConnectProvider('google')} className="px-6 py-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-700 dark:text-zinc-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-3">
               <Plus className="w-4 h-4" /> Conectar Gmail
             </button>
             <button onClick={() => handleConnectProvider('microsoft')} className="px-6 py-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-700 dark:text-zinc-300 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center gap-3">
               <Plus className="w-4 h-4" /> Conectar Outlook
             </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. MAIN INBOX SCREEN
  return (
    <div className="h-full flex flex-col gap-6 -mx-4 sm:mx-0">
      
      {/* Header Premium */}
      <div className="px-4 sm:px-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <button onClick={() => { setSelectedAccount(null); setSelectedEmail(null); }} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors mb-4">
             <ArrowLeft className="w-3 h-3" /> Trocar Conta
           </button>
           <h1 className="text-3xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-3 uppercase tracking-tight">
             <div className="p-2 bg-emerald-600 rounded-[16px]">
               <Mail className="w-6 h-6 text-white" />
             </div>
             Caixa de Entrada
           </h1>
           <div className="flex items-center gap-2 mt-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
               Conectado como <strong className="text-slate-700 dark:text-zinc-200">{selectedAccount.email}</strong>
             </p>
           </div>
        </div>
        
        <button className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] active:scale-95 flex items-center justify-center gap-2">
          <Edit className="w-4 h-4" /> Novo E-mail
        </button>
      </div>

      {/* 3-Column Interface Shell */}
      <div className="flex-1 min-h-[600px] flex gap-2 sm:gap-6 px-2 sm:px-0 bg-slate-50 dark:bg-zinc-950 overflow-hidden relative">
        
        {/* Column 1: Folders Sidebar */}
        <div className="hidden lg:flex w-56 flex-col gap-2">
           <div className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] p-4 flex flex-col">
              <nav className="space-y-1">
                 <button onClick={() => setCurrentFolder('inbox')} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all", currentFolder === 'inbox' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-zinc-800/50")}>
                   <div className="flex items-center gap-3"><Inbox className="w-4 h-4" /> P. Entrada</div>
                   <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[9px]">4</span>
                 </button>
                 <button onClick={() => setCurrentFolder('sent')} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all", currentFolder === 'sent' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-zinc-800/50")}>
                   <div className="flex items-center gap-3"><Send className="w-4 h-4" /> Enviados</div>
                 </button>
                 <button onClick={() => setCurrentFolder('drafts')} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all", currentFolder === 'drafts' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-zinc-800/50")}>
                   <div className="flex items-center gap-3"><Edit className="w-4 h-4" /> Rascunhos</div>
                 </button>
                 <button onClick={() => setCurrentFolder('trash')} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all", currentFolder === 'trash' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-zinc-800/50")}>
                   <div className="flex items-center gap-3"><Trash2 className="w-4 h-4" /> Lixeira</div>
                 </button>
              </nav>

              <div className="mt-auto pt-6 border-t border-slate-100 dark:border-zinc-800/50">
                 <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-[24px] flex items-center gap-3 border border-slate-100 dark:border-zinc-800">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500">Status</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Sincronizado</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Column 2: Email List */}
        <div className={cn(
          "w-full md:w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] overflow-hidden",
          selectedEmail && "hidden md:flex" 
        )}>
          {/* List Header */}
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-3 relative">
             <Search className="w-4 h-4 text-slate-400 absolute left-8" />
             <input type="text" placeholder="Pesquisar..." className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[20px] py-3 pl-10 pr-4 text-xs font-bold text-slate-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
          
          {/* The List (Mocked) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
             {MOCK_EMAILS.map(email => (
               <button 
                 key={email.id}
                 onClick={() => setSelectedEmail(email)}
                 className={cn(
                   "w-full text-left p-4 border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors flex gap-3 relative",
                   selectedEmail?.id === email.id && "bg-emerald-50/50 dark:bg-emerald-900/10 border-l-4 border-l-emerald-500",
                   email.unread && "bg-white dark:bg-zinc-900"
                 )}
               >
                 {email.unread && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                 <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-slate-600 dark:text-zinc-400 shrink-0">
                   {email.from.charAt(0)}
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-baseline mb-1">
                      <span className={cn("text-xs font-bold truncate pr-2", email.unread ? "text-slate-900 dark:text-zinc-100" : "text-slate-600 dark:text-zinc-400")}>{email.from}</span>
                      <span className="text-[10px] font-black text-slate-400 shrink-0">{email.time}</span>
                   </div>
                   <p className={cn("text-xs truncate mb-1", email.unread ? "font-bold text-slate-800 dark:text-zinc-200" : "text-slate-600 dark:text-zinc-400")}>{email.subject}</p>
                   <p className="text-[11px] text-slate-400 truncate leading-snug">{email.preview}</p>
                 </div>
               </button>
             ))}
          </div>
        </div>

        {/* Column 3: Email Reader Pane */}
        {selectedEmail ? (
          <div className={cn(
            "flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] overflow-hidden flex flex-col z-10",
            "absolute inset-0 md:relative" 
          )}>
             {/* Reader Header */}
             <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/50">
                <div className="flex items-center gap-3">
                   <button onClick={() => setSelectedEmail(null)} className="md:hidden p-2 bg-white dark:bg-zinc-800 rounded-full shadow-sm text-slate-500"><ChevronLeft className="w-5 h-5"/></button>
                   <div className="flex gap-2">
                     <button className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 transition-colors" title="Responder"><Reply className="w-4 h-4" /></button>
                     <button className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 transition-colors" title="Encaminhar"><Forward className="w-4 h-4" /></button>
                     <button className="p-2.5 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <button className="p-2.5 rounded-xl hover:text-amber-500 transition-colors text-slate-400"><Star className="w-4 h-4" /></button>
                </div>
             </div>

             {/* Reader Content Skeleton */}
             <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                <h2 className="text-2xl font-black text-slate-900 dark:text-zinc-100 mb-6">{selectedEmail.subject}</h2>
                
                <div className="flex items-center justify-between mb-10">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-slate-600 dark:text-zinc-400 text-lg">
                        {selectedEmail.from.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-zinc-100">{selectedEmail.from} <span className="text-slate-400 text-xs font-normal ml-1">&lt;cliente@empresa.com&gt;</span></p>
                        <p className="text-xs text-slate-500">Para: mim</p>
                      </div>
                   </div>
                   <span className="text-xs font-bold text-slate-400">{selectedEmail.time}</span>
                </div>

                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-zinc-300 text-sm leading-relaxed space-y-4">
                   <p>{selectedEmail.preview}</p>
                   <p>Abaixo temos um editor pronto para respondermos com assinatura automática.</p>
                   <div className="my-6 p-4 border border-slate-200 dark:border-zinc-800 rounded-[16px] bg-slate-50 dark:bg-zinc-950 font-mono text-xs text-slate-500">
                     [Anexos vão renderizar aqui se existirem]
                   </div>
                </div>
             </div>

             {/* Reader Reply Box */}
             <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
                <div className="border border-slate-200 dark:border-zinc-800 rounded-[24px] p-2 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                  <textarea 
                    placeholder="Escreva sua resposta..." 
                    className="w-full bg-transparent border-none outline-none resize-none p-3 text-sm text-slate-800 dark:text-zinc-200 min-h-[80px]"
                  />
                  <div className="flex items-center justify-between mt-2 px-2 pb-2">
                     <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"><Sparkles className="w-4 h-4" /></button>
                     <button className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[16px] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all active:scale-95">
                        Enviar Resposta <Send className="w-3 h-3" />
                     </button>
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-transparent border-2 border-dashed border-slate-200 dark:border-zinc-800/50 rounded-[32px]">
             <div className="text-center">
               <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-zinc-800 shadow-sm">
                 <Mail className="w-6 h-6 text-slate-300" />
               </div>
               <p className="text-sm font-bold text-slate-500">Nenhum e-mail selecionado</p>
               <p className="text-xs text-slate-400 mt-1">Selecione uma mensagem ao lado para ler.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}