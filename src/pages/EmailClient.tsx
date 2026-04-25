import React, { useState, useEffect, useMemo, useRef } from "react";
import { Mail, Search, ChevronLeft, ChevronRight, Inbox, Send, Edit, Trash2, Plus, Sparkles, AlertCircle, ArrowLeft, Star, Reply, Forward, CheckCircle2, X, Minimize2, Maximize2, Loader2, RefreshCw, Clock, Info, ShieldAlert, Layers, Bookmark, PartyPopper, Users, Zap, Paperclip, Download, FileText } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getGoogleEmailAuthUrl, getMicrosoftEmailAuthUrl, fetchEmailsFromApi, sendEmailViaApi, EmailMessage, EmailProvider, downloadAttachmentFromApi, fetchGoogleContacts } from "../lib/emailSync";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

type ConnectedAccount = {
  id: string;
  provider: EmailProvider;
  email: string;
};

type EmailFolder = "inbox" | "sent" | "drafts" | "trash" | "starred" | "important" | "spam" | "snoozed" | "all";
type GmailCategory = "" | "CATEGORY_PERSONAL" | "CATEGORY_SOCIAL" | "CATEGORY_PROMOTIONS" | "CATEGORY_UPDATES";

interface Contact {
  name: string;
  email: string;
}

export default function EmailClient() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<ConnectedAccount | null>(null);
  
  // Navigation State
  const [currentFolder, setCurrentFolder] = useState<EmailFolder>("inbox");
  const [currentCategory, setCurrentCategory] = useState<GmailCategory>("CATEGORY_PERSONAL");
  
  // Messages State
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Rich Contacts for autocomplete
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Pagination
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // Compose State
  const [isComposing, setIsComposing] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Load Connected Accounts
  useEffect(() => {
    if (!user) return;
    loadAccounts();
  }, [user]);

  async function loadAccounts() {
    const { data } = await supabase
      .from('user_email_tokens')
      .select('id, provider, email_address')
      .eq('user_id', user?.id);

    if (data) {
      setAccounts(data.map(d => ({
        id: d.id,
        provider: d.provider,
        email: d.email_address || "Conectado"
      })));
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm("Tem certeza que deseja remover esta conta de e-mail?")) return;
    
    const { error } = await supabase
      .from('user_email_tokens')
      .delete()
      .eq('id', id);

    if (!error) {
       setAccounts(prev => prev.filter(acc => acc.id !== id));
    } else {
       alert("Erro ao remover: " + error.message);
    }
  }

  
  // 3. Fetch Global Contacts
  useEffect(() => {
    if (selectedAccount && user && selectedAccount.provider === 'google') {
      fetchGoogleContacts(user.id, selectedAccount.email).then(newContacts => {
        if (newContacts.length > 0) {
          setContacts(prev => {
            const map = new Map<string, string>();
            prev.forEach(c => map.set(c.email, c.name));
            newContacts.forEach(c => map.set(c.email, c.name));
            return Array.from(map.entries()).map(([email, name]) => ({ name, email }));
          });
        }
      });
    }
  }, [selectedAccount, user]);

  // 2. Fetch Emails
  useEffect(() => {
    if (selectedAccount && user) {
      setEmails([]); 
      setNextPageToken(null);
      setErrorStatus(null);
      fetchEmails();
    }
  }, [selectedAccount, currentFolder, currentCategory]);

    async function handleDownloadAttachment(attachmentId: string, filename: string) {
    if (!user || !selectedAccount || !selectedEmail) return;
    
    try {
      const res = await downloadAttachmentFromApi(user.id, selectedAccount.provider, selectedEmail.id, attachmentId, selectedAccount.email);
      if (res.success && res.data) {
        // Create a blob from the base64 data
        const base64Data = res.data.replace(/-/g, '+').replace(/_/g, '/');
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Erro ao baixar anexo: " + res.error);
      }
    } catch (err: any) {
      alert("Falha no download: " + err.message);
    }
  }

  async function fetchEmails(pageToken?: string) {
    if (!user || !selectedAccount) return;
    
    setIsLoading(true);
    setErrorStatus(null);
    try {
      const activeCategory = currentFolder === 'inbox' ? currentCategory : "";
      const result = await fetchEmailsFromApi(user.id, selectedAccount.provider, currentFolder, pageToken, activeCategory, selectedAccount.email, searchQuery);
      
      if (result.success) {
        const newEmails = result.emails || [];
        
        if (pageToken) {
          setEmails(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const filtered = newEmails.filter(e => !existingIds.has(e.id));
            return [...prev, ...filtered];
          });
        } else {
          setEmails(newEmails);
        }
        
        // Populate rich contacts
        setContacts(prev => {
           const map = new Map<string, string>();
           prev.forEach(c => map.set(c.email, c.name));
           
           newEmails.forEach(e => {
             if (e.fromEmail) map.set(e.fromEmail, e.from);
             if (e.toEmail) map.set(e.toEmail, e.to || e.toEmail);
           });
           
           return Array.from(map.entries()).map(([email, name]) => ({ name, email }));
        });

        setNextPageToken(result.nextPageToken || null);
      } else {
        setErrorStatus(result.error || "Erro ao carregar mensagens.");
      }
    } catch (err: any) {
      setErrorStatus(err.message || "Falha na conexão.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleConnectProvider = (provider: EmailProvider) => {
    if (provider === 'google') window.location.href = getGoogleEmailAuthUrl();
    else window.location.href = getMicrosoftEmailAuthUrl();
  };

  const getFolderIcon = (folder: EmailFolder) => {
    switch(folder) {
      case 'inbox': return <Inbox className="w-4 h-4" />;
      case 'starred': return <Star className="w-4 h-4" />;
      case 'snoozed': return <Clock className="w-4 h-4" />;
      case 'important': return <Bookmark className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      case 'drafts': return <Edit className="w-4 h-4" />;
      case 'spam': return <ShieldAlert className="w-4 h-4" />;
      case 'trash': return <Trash2 className="w-4 h-4" />;
      case 'all': return <Layers className="w-4 h-4" />;
    }
  };

  const folderLabels: Record<EmailFolder, string> = {
    inbox: "Caixa de Entrada",
    starred: "Com Estrela",
    snoozed: "Adiados",
    important: "Importante",
    sent: "Enviados",
    drafts: "Rascunhos",
    spam: "Spam",
    trash: "Lixeira",
    all: "Todos os e-mails"
  };

  if (!selectedAccount) {
    return (
      <div className="h-full flex flex-col items-center justify-center -mt-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full text-center space-y-6 px-4">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/10">
            <Mail className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">
            E-mail <span className="text-emerald-600">Represente-se</span>
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 font-medium text-lg max-w-xl mx-auto leading-relaxed">
            Selecione uma conta para gerenciar suas mensagens com o poder do Gmail.
          </p>
          {accounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 text-left">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc)}
                  className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all group flex items-start gap-4 text-left relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <div className="w-6 h-6 flex items-center justify-center">
                      {acc.provider === 'google' ? (
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-5 h-5"/>
                      ) : (
                        <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="w-5 h-5"/>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Gmail</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">{acc.email}</p>
                  </div>
                  
                  {/* Botão de Exclusão (X vermelho) no Hover */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); deleteAccount(acc.id); }}
                    className="absolute top-4 right-4 p-2.5 bg-red-50 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white shadow-sm z-10 scale-90 group-hover:scale-100"
                    title="Remover conta"
                  >
                    <X className="w-4 h-4" />
                  </div>

                  <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center absolute right-6 top-12 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
             <button onClick={() => handleConnectProvider('google')} className="px-8 py-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-700 dark:text-zinc-300 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-3 shadow-sm active:scale-95">
               <Plus className="w-4 h-4" /> Nova Conta Gmail
             </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4 lg:p-6 relative overflow-hidden">
      <div className="px-4 sm:px-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <button onClick={() => { setSelectedAccount(null); setSelectedEmail(null); }} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors mb-4">
             <ArrowLeft className="w-3 h-3" /> Voltar
           </button>
           <h1 className="text-3xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-3 uppercase tracking-tight">
             <div className="p-2 bg-emerald-600 rounded-[16px]">
               {getFolderIcon(currentFolder)}
             </div>
             {folderLabels[currentFolder]}
           </h1>
           <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-2 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {selectedAccount.email}
           </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => { setEmails([]); fetchEmails(); }} className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[20px] text-slate-500 hover:text-emerald-600 transition-all hover:border-emerald-500 shadow-sm" title="Sincronizar">
            <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>
          <button onClick={() => setIsComposing(true)} className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all shadow-md flex items-center justify-center gap-2">
            <Edit className="w-4 h-4" /> Escrever
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-2 sm:gap-6 px-2 sm:px-0 bg-slate-50 dark:bg-zinc-950 overflow-hidden relative">
        <div className="hidden lg:flex w-64 flex-col gap-2">
           <div className="h-fit bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] p-4 flex flex-col shadow-sm">
              <nav className="space-y-1">
                 {(Object.keys(folderLabels) as EmailFolder[]).map(folder => (
                    <button 
                      key={folder}
                      onClick={() => { 
                        setCurrentFolder(folder); 
                        setSelectedEmail(null); 
                        if (folder !== 'inbox') setCurrentCategory("");
                        else setCurrentCategory("CATEGORY_PERSONAL");
                      }} 
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all", 
                        currentFolder === folder ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      {getFolderIcon(folder)} {folderLabels[folder]}
                    </button>
                 ))}
              </nav>
           </div>
        </div>

        <div className={cn(
          "w-full md:w-[420px] lg:w-[480px] flex-shrink-0 flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm",
          selectedEmail && "hidden md:flex" 
        )}>
          {currentFolder === 'inbox' && (
            <div className="px-4 pt-4 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-50 dark:border-zinc-800 pb-2">
              {[
                { id: "CATEGORY_PERSONAL", label: "Principal", icon: <Inbox className="w-3.5 h-3.5" /> },
                { id: "CATEGORY_PROMOTIONS", label: "Promoções", icon: <Zap className="w-3.5 h-3.5" /> },
                { id: "CATEGORY_SOCIAL", label: "Social", icon: <Users className="w-3.5 h-3.5" /> },
                { id: "CATEGORY_UPDATES", label: "Atualizações", icon: <Info className="w-3.5 h-3.5" /> }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCurrentCategory(cat.id as GmailCategory)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-full whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all",
                    currentCategory === cat.id 
                      ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg" 
                      : "bg-slate-50 dark:bg-zinc-800 text-slate-400 hover:bg-slate-100"
                  )}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-4 flex items-center gap-3 relative">
             <Search className="w-4 h-4 text-slate-400 absolute left-8" />
             <input 
               type="text" 
               placeholder="Pesquisar..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') { setEmails([]); fetchEmails(); } }}
               className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[20px] py-3 pl-10 pr-12 text-xs font-bold text-slate-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/10" 
             />
             <button 
               onClick={() => { setEmails([]); fetchEmails(); }}
               className="absolute right-8 p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
               title="Buscar"
             >
               <Search className="w-3.5 h-3.5" />
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
             {isLoading && emails.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-50">
                   <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</p>
                </div>
             ) : errorStatus ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center text-red-500">
                   <AlertCircle className="w-12 h-12" />
                   <p className="text-xs font-medium text-slate-500">{errorStatus}</p>
                   <button onClick={() => fetchEmails()} className="px-6 py-2 bg-red-50 text-red-600 rounded-full font-black uppercase text-[10px] border">Tentar Novamente</button>
                </div>
             ) : emails.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-40 p-12 text-center">
                   <div className="w-16 h-16 bg-slate-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-2">
                     <Mail className="w-8 h-8 text-slate-300" />
                   </div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Tudo limpo por aqui!</h3>
                </div>
             ) : (
                <>
                  {emails.map(email => (
                    <button 
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={cn(
                        "w-full text-left p-5 border-b border-slate-50 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/20 transition-colors flex gap-4 relative",
                        selectedEmail?.id === email.id && "bg-emerald-50/50 dark:bg-emerald-500/5 border-l-4 border-l-emerald-500"
                      )}
                    >
                      {email.unread && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />}
                      <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center font-black text-emerald-600 shrink-0 text-sm border border-emerald-200 dark:border-emerald-800/50">
                        {email.from.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                           <span className={cn("text-xs font-black truncate pr-2", email.unread ? "text-slate-900 dark:text-zinc-100" : "text-slate-500 italic")}>
                             {currentFolder === 'sent' ? `Para: ${email.to}` : email.from}
                           </span>
                           <span className="text-[10px] font-black text-slate-400 shrink-0">{email.time}</span>
                        </div>
                        <p className={cn("text-xs truncate mb-1", email.unread ? "font-bold text-slate-800 dark:text-zinc-200" : "text-slate-600 dark:text-zinc-400")}>{email.subject}</p>
                        <p className="text-[11px] text-slate-400 truncate leading-snug">{email.preview}</p>
                      </div>
                    </button>
                  ))}
                  {nextPageToken && (
                    <button 
                      onClick={() => fetchEmails(nextPageToken)}
                      disabled={isLoading}
                      className="w-full py-8 text-[11px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-3"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                      {isLoading ? "Buscando..." : "Carregar mais mensagens"}
                    </button>
                  )}
                </>
             )}
          </div>
        </div>

        {selectedEmail ? (
          <div className={cn(
            "flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] overflow-hidden flex flex-col z-10",
            "absolute inset-0 md:relative shadow-xl" 
          )}>
             <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950">
                <div className="flex items-center gap-4">
                   <button onClick={() => setSelectedEmail(null)} className="md:hidden p-2.5 bg-slate-100 rounded-full"><ChevronLeft className="w-5 h-5"/></button>
                   <div className="flex gap-2">
                     <button className="p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-500 transition-colors border border-slate-100 dark:border-zinc-800"><Reply className="w-4 h-4" /></button>
                     <button className="p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-500 transition-colors border border-slate-100 dark:border-zinc-800"><Forward className="w-4 h-4" /></button>
                   </div>
                </div>
                <button className="p-3 rounded-2xl hover:bg-red-50 text-red-500 transition-colors border border-red-100 dark:border-red-900/10"><Trash2 className="w-4 h-4" /></button>
             </div>

             <div className="flex-1 overflow-y-auto p-4 sm:p-14 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100 mb-10 leading-tight">{selectedEmail.subject}</h2>
                  <div className="flex items-center justify-between mb-12">
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center font-black text-emerald-600 text-xl border-2 border-white dark:border-zinc-800 shadow-sm">
                          {selectedEmail.from.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-zinc-100 text-base">{selectedEmail.from}</p>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Para: {selectedEmail.to || 'mim'}</p>
                        </div>
                     </div>
                     <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-2.5 rounded-full uppercase tracking-widest">{selectedEmail.time}</span>
                  </div>
                  <div className="space-y-8">
                    {selectedEmail.isHtml ? (
                      <div className="bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 min-h-[400px]">
                        <iframe
                          srcDoc={selectedEmail.fullBody || selectedEmail.preview}
                          title="Email Content"
                          className="w-full min-h-[600px] border-none"
                          sandbox="allow-popups allow-popups-to-escape-sandbox"
                          onLoad={(e) => {
                             const iframe = e.currentTarget;
                             if (iframe.contentWindow) {
                               iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
                             }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-zinc-300 text-base leading-relaxed space-y-6 whitespace-pre-wrap font-medium bg-slate-50 dark:bg-zinc-900/50 p-8 rounded-3xl border border-slate-100 dark:border-zinc-800">
                        {selectedEmail.fullBody || selectedEmail.preview}
                      </div>
                    )}

                    {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                      <div className="mt-12 pt-8 border-t border-slate-100 dark:border-zinc-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                          <Paperclip className="w-4 h-4" /> Anexos ({selectedEmail.attachments.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedEmail.attachments.map(att => (
                            <div key={att.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-2xl group hover:border-emerald-500/30 transition-all">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center text-slate-400">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate pr-2">{att.filename}</p>
                                  <p className="text-[10px] font-medium text-slate-400 uppercase">{(att.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleDownloadAttachment(att.id, att.filename)}
                                className="p-2.5 bg-white dark:bg-zinc-900 text-slate-400 hover:text-emerald-600 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-transparent border-2 border-dashed border-slate-200 dark:border-zinc-800/50 rounded-[32px]">
             <div className="text-center p-12 max-w-sm">
               <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-[40px] flex items-center justify-center mx-auto mb-8 border border-slate-100 dark:border-zinc-800 shadow-card">
                 <Mail className="w-10 h-10 text-emerald-300" />
               </div>
               <p className="text-sm font-black uppercase tracking-widest text-slate-400">Selecione uma mensagem</p>
             </div>
          </div>
        )}
      </div>

      <ComposeBalloon 
        isOpen={isComposing} 
        onClose={() => setIsComposing(false)} 
        userId={user?.id || ""} 
        provider={selectedAccount?.provider} emailAccount={selectedAccount?.email}
        contacts={contacts}
      />
    </div>
  );
}

function ComposeBalloon({ isOpen, onClose, userId, provider, contacts, emailAccount }: { isOpen: boolean, onClose: () => void, userId: string, provider?: EmailProvider, contacts: Contact[], emailAccount?: string }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredContacts = useMemo(() => {
    if (!to) return [];
    const search = to.toLowerCase();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.email.toLowerCase().includes(search)
    ).slice(0, 8);
  }, [to, contacts]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSend() {
    if (!to) { alert("Por favor, preencha o destinatário."); return; }
    // Assunto opcional conforme solicitado
    if (!body) { alert("Por favor, preencha a mensagem."); return; }
    if (!provider) { alert("Conta de e-mail não disponível."); return; }

    setIsSending(true);
    try {
      const res = await sendEmailViaApi(userId, provider, to, subject, body, emailAccount);
      if (res.success) {
        onClose();
        setTo(""); setSubject(""); setBody("");
      } else {
        alert("Erro no envio: " + res.error);
      }
    } catch (err: any) {
      alert("Falha técnica: " + err.message);
    } finally {
      setIsSending(false);
    }
  }

  const avatarColors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-red-500"];
  const getAvatarColor = (name: string) => {
    const charCode = name.charCodeAt(0) || 0;
    return avatarColors[charCode % avatarColors.length];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          ref={containerRef}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: isMinimized ? "calc(100% - 80px)" : 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className={cn(
            "fixed bottom-0 right-0 sm:right-10 w-full sm:w-[550px] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl sm:rounded-t-[40px] z-[100] flex flex-col",
            isMinimized ? "h-[80px]" : "h-[100dvh] sm:h-[650px]"
          )}
        >
          <div className="bg-slate-900 p-6 sm:rounded-t-[40px] flex items-center justify-between shrink-0">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white pl-2">Nova Mensagem</h3>
             <div className="flex items-center gap-3">
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors">
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"><X className="w-4 h-4" /></button>
             </div>
          </div>

          <div className={cn("flex-1 p-6 sm:p-10 flex flex-col gap-4 sm:gap-6 overflow-y-auto custom-scrollbar", isMinimized && "hidden")}>
             <div className="space-y-1 relative">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Para</p>
               <input 
                 type="text" 
                 placeholder="Destinatário" 
                 value={to} 
                 onChange={(e) => { setTo(e.target.value); setShowSuggestions(true); }}
                 onFocus={() => setShowSuggestions(true)}
                 className="w-full bg-transparent border-b border-slate-100 dark:border-zinc-800 py-3 text-sm font-bold outline-none focus:border-emerald-500 transition-colors dark:text-zinc-100 placeholder:text-slate-300"
               />
               
               <AnimatePresence>
                {showSuggestions && filteredContacts.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-3xl z-[120] mt-2 overflow-hidden py-2"
                  >
                      {filteredContacts.map(contact => (
                        <button 
                          key={contact.email}
                          onClick={() => { setTo(contact.email); setShowSuggestions(false); }}
                          className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors group"
                        >
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm uppercase shadow-sm", getAvatarColor(contact.name))}>
                            {contact.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 transition-colors">
                              {contact.name}
                            </p>
                            <p className="text-xs font-medium text-slate-400 truncate">
                              {contact.email}
                            </p>
                          </div>
                        </button>
                      ))}
                  </motion.div>
                )}
               </AnimatePresence>
             </div>

             <div className="space-y-1">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Assunto</p>
               <input type="text" placeholder="Qual o assunto hoje? (Opcional)" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-transparent border-b border-slate-100 dark:border-zinc-800 py-3 text-sm font-bold outline-none focus:border-emerald-500 transition-colors dark:text-zinc-100 placeholder:text-slate-300"/>
             </div>

             <div className="flex-1 space-y-1">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Mensagem</p>
               <textarea placeholder="Sua história começa aqui..." value={body} onChange={(e) => setBody(e.target.value)} className="w-full h-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed dark:text-zinc-200 placeholder:text-slate-300 focus:ring-0 shadow-none"/>
             </div>

             <div className="pt-4 sm:pt-6 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0 pb-6 sm:pb-0">
                <div className="flex items-center gap-2">
                   <button className="p-4 text-emerald-600 bg-emerald-50 rounded-2xl hover:bg-emerald-100 transition-colors"><Sparkles className="w-5 h-5" /></button>
                </div>
                <button 
                  disabled={isSending}
                  onClick={handleSend}
                  className="flex-1 sm:flex-none justify-center px-8 sm:px-12 py-4 sm:py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl sm:rounded-[24px] font-black uppercase text-[10px] sm:text-[11px] tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center gap-3"
                >
                  {isSending ? "Enviando..." : "Enviar E-mail"} <Send className="w-4 h-4" />
                </button>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
