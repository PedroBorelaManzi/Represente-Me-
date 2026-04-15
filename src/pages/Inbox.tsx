import React from "react";
import { motion } from "framer-motion";
import { Mail, Search, User, Star, Trash2, Send, MoreHorizontal, Paperclip, Smile } from "lucide-react";

const mockMessages = [
  {
    id: 1,
    sender: "Carlos - Materiais São João",
    subject: "Dúvida sobre o pedido #4502",
    preview: "Olá, gostaria de confirmar se o prazo de entrega continua o mesmo para os lotes de abril...",
    time: "10:24",
    read: false,
    tag: "Pedido",
    avatar: "C",
    fullMessage: "Olá Pedro, boa tarde!\n\nGostaria de confirmar se o prazo de entrega continua o mesmo para os lotes de abril. Tivemos uma mudança na logística interna e precisamos saber se podemos contar com a entrega no dia 15.\n\nFico no aguardo do seu retorno.\n\nAtenciosamente,\nCarlos"
  },
  {
    id: 2,
    sender: "Ana - Farmácia Central",
    subject: "Novas cotações para Maio",
    preview: "Poderia nos enviar a nova tabela de preços para os medicamentos da linha premium?",
    time: "09:15",
    read: true,
    tag: "Cotação",
    avatar: "A",
    fullMessage: "Bom dia!\n\nPoderia nos enviar a nova tabela de preços para os medicamentos da linha premium? Estamos montando o planejamento de compras para maio e precisamos desses valores atualizados.\n\nObrigada!"
  },
  {
    id: 3,
    sender: "Roberto Pereira",
    subject: "Agendamento de visita",
    preview: "Confirmado para amanhã às 14h na unidade de Joinville. Estarei te esperando.",
    time: "Ontem",
    read: true,
    tag: "Visita",
    avatar: "R",
    fullMessage: "Fala Pedro! Confirmado para amanhã às 14h na unidade de Joinville. Estarei te esperando para discutirmos aquela nova parceria.\n\nAbraço!"
  },
];

export default function InboxPage() {
  const [selected, setSelected] = React.useState(mockMessages[0]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-3 uppercase tracking-tight">
            <Mail className="w-8 h-8 text-indigo-600" /> Mensagens
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Inbox unificada para sua representação comercial.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Contact List */}
        <div className="w-96 bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-sm">
          <div className="p-6 border-b dark:border-zinc-850">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar conversas..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-950 border-none rounded-2xl text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 space-y-1">
            {mockMessages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelected(msg)}
                className={`w-full p-5 rounded-[32px] flex flex-col gap-2 text-left transition-all relative group ${
                  selected.id === msg.id 
                    ? "bg-indigo-50/50 dark:bg-indigo-950/20" 
                    : "hover:bg-slate-50 dark:hover:bg-zinc-850"
                }`}
              >
                {selected.id === msg.id && (
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-indigo-600 rounded-full" />
                )}
                <div className={`flex justify-between items-start ${selected.id === msg.id ? "pl-4" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-black text-sm uppercase">
                      {msg.avatar}
                    </div>
                    <div>
                      <h4 className={`text-xs font-black uppercase tracking-tight ${!msg.read && selected.id !== msg.id ? "text-indigo-600" : "text-slate-900 dark:text-zinc-100"}`}>
                        {msg.sender}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{msg.time}</p>
                    </div>
                  </div>
                  {!msg.read && <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1" />}
                </div>
                <div className={`${selected.id === msg.id ? "pl-4" : ""}`}>
                  <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">{msg.subject}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">{msg.preview}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message View */}
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-sm relative">
          <div className="p-6 border-b dark:border-zinc-850 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[20px] bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 font-black text-lg">
                {selected.avatar}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight">{selected.sender}</h3>
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                  {selected.tag}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2.5 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-2xl transition-all text-slate-400">
                <Star className="w-5 h-5" />
              </button>
              <button className="p-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl transition-all text-slate-400 hover:text-red-500">
                <Trash2 className="w-5 h-5" />
              </button>
              <button className="p-2.5 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-2xl transition-all text-slate-400">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50 dark:bg-zinc-950/20">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-zinc-800 relative">
                <div className="flex justify-between items-start mb-8">
                  <h2 className="text-xl font-black text-slate-900 dark:text-zinc-100 leading-tight">
                    {selected.subject}
                  </h2>
                  <span className="text-xs font-bold text-slate-400">{selected.time}</span>
                </div>
                <div className="text-slate-600 dark:text-zinc-400 leading-relaxed text-sm whitespace-pre-wrap">
                  {selected.fullMessage}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Reply Area */}
          <div className="p-6 border-t dark:border-zinc-850">
            <div className="bg-slate-50 dark:bg-zinc-950 rounded-[32px] p-2 flex flex-col gap-2 border border-slate-100 dark:border-zinc-800 transition-all focus-within:ring-2 focus-within:ring-indigo-500">
              <textarea 
                placeholder="Escreva sua resposta para o cliente..."
                className="w-full bg-transparent border-none focus:ring-0 p-4 text-sm font-bold min-h-[100px] resize-none"
              />
              <div className="flex items-center justify-between p-2">
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all text-slate-400"><Paperclip className="w-4 h-4" /></button>
                  <button className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all text-slate-400"><Smile className="w-4 h-4" /></button>
                </div>
                <button className="px-8 py-3 bg-indigo-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2">
                  Enviar Resposta <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
