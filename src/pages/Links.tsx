import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Link as LinkIcon, Plus, ExternalLink, MoreVertical, Search, MessageSquare, Mail, FileText, Briefcase, X, Trash2, HardDrive, Calendar, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

const initialLinks = [
  { id: "1", title: "WhatsApp Web", url: "https://web.whatsapp.com", icon: "MessageSquare", color: "bg-emerald-500" },
  { id: "2", title: "Gmail", url: "https://mail.google.com", icon: "Mail", color: "bg-red-500" },
  { id: "3", title: "Google Drive", url: "https://drive.google.com", icon: "HardDrive", color: "bg-blue-500" },
  { id: "4", title: "Google Agenda", url: "https://calendar.google.com", icon: "Calendar", color: "bg-orange-500" },
];

const iconMap: Record<string, any> = {
  MessageSquare,
  Mail,
  FileText,
  Briefcase,
  LinkIcon,
  HardDrive,
  Calendar
};

const colorOptions = [
  { name: "Verde", value: "bg-emerald-500" },
  { name: "Vermelho", value: "bg-red-500" },
  { name: "Azul", value: "bg-blue-500" },
  { name: "Indigo", value: "bg-indigo-500" },
  { name: "Roxo", value: "bg-purple-500" },
  { name: "Laranja", value: "bg-orange-500" },
];

export default function LinksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeLinkId = searchParams.get("id");
  const [links, setLinks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("bg-indigo-500");
  const [icon, setIcon] = useState("LinkIcon");
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("crm_shortcut_links");
    if (saved) {
      setLinks(JSON.parse(saved));
    } else {
      setLinks(initialLinks);
      localStorage.setItem("crm_shortcut_links", JSON.stringify(initialLinks));
    }
  }, []);

  const saveToStorage = (updatedLinks: any[]) => {
    setLinks(updatedLinks);
    localStorage.setItem("crm_shortcut_links", JSON.stringify(updatedLinks));
    window.dispatchEvent(new Event('crm_shortcut_links_updated'));
  };

  const handleAddLink = () => {
    if (!title || !url) return;

    let formattedUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      formattedUrl = `https://${url}`;
    }

    const newLink = {
      id: crypto.randomUUID(),
      title,
      url: formattedUrl,
      icon,
      color
    };

    const updated = [...links, newLink];
    saveToStorage(updated);
    resetForm();
  };

  const handleDeleteLink = (id: string) => {
    if (!window.confirm("Deseja realmente excluir este atalho?")) return;
    const updated = links.filter(l => l.id !== id);
    saveToStorage(updated);
    setActiveMenuId(null);
  };

  const resetForm = () => {
    setTitle("");
    setUrl("");
    setColor("bg-indigo-500");
    setIcon("LinkIcon");
    setIsModalOpen(false);
  };

  const filteredLinks = links.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const activeLink = links.find(l => l.id === activeLinkId);

  if (activeLink) {
    const isBlockedIframe = 
      activeLink.url.includes("web.whatsapp.com") || 
      activeLink.url.includes("mail.google.com") || 
      activeLink.url.includes("docs.google.com") ||
      activeLink.url.includes("drive.google.com") ||
      activeLink.url.includes("calendar.google.com");

    const IconComponent = iconMap[activeLink.icon] || LinkIcon;

    return (
      <div className={cn(
        "flex flex-col space-y-4 transition-all duration-300",
        isFullScreen 
          ? "h-[calc(100vh-4rem)] bg-slate-50 dark:bg-zinc-950 z-10" 
          : "h-[calc(100vh-10rem)]"
      )}>
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSearchParams({})}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <X className="w-5 h-5" /> Voltar para o Hub
            </button>
            <div className="w-1 h-6 bg-slate-200" />
            <h1 className="text-lg font-bold text-slate-900">{activeLink.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title={isFullScreen ? "Sair da Expandir" : "Expandir"}
            >
              {isFullScreen ? (
                <><Minimize2 className="w-4 h-4" /> Contrair</>
              ) : (
                <><Maximize2 className="w-4 h-4" /> Expandir</>
              )}
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-zinc-800 mx-1" />
            <a 
            href={activeLink.url} 
            target="_blank" 
            rel="noreferrer" 
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 text-xs"
          >
            Abrir original <ExternalLink className="w-4 h-4" />
          </a>
          </div>
        </div>
        
        {isBlockedIframe ? (
          <div className="flex-1 border border-slate-200 rounded-2xl shadow-sm bg-white flex flex-col items-center justify-center p-8 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md mb-4 ${activeLink.color || 'bg-indigo-500'}`}>
               <IconComponent className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Este aplicativo não permite exibição interna</h2>
            <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
              Por motivos de segurança (bloqueio do Google/WhatsApp), este serviço precisa ser aberto em uma nova aba para funcionar corretamente.
            </p>
            <a 
              href={activeLink.url} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-medium text-sm transition-all gap-2"
            >
               Abrir {activeLink.title} <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <iframe 
            src={activeLink.url} 
            className="w-full flex-1 border border-slate-200 rounded-2xl shadow-sm bg-white" 
            title={activeLink.title}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Painel Atalho Hub</h1>
          <p className="text-sm text-slate-500 mt-1">Acesse todas as suas ferramentas em um só lugar.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white shadow-sm transition-colors"
              placeholder="Buscar atalho..."
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Atalho
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredLinks.map((link, i) => {
          const IconComponent = iconMap[link.icon] || LinkIcon;
          const isMenuOpen = activeMenuId === link.id;

          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group relative overflow-visible"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm ${link.color}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuId(isMenuOpen ? null : link.id)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                      {isMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                          <motion.div 
                            initial={{ opacity: 0, y: -5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.95 }}
                            className="absolute right-0 mt-1 w-36 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1 overflow-hidden"
                          >
                            <button 
                              onClick={() => handleDeleteLink(link.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                            >
                              <Trash2 className="w-4 h-4" /> Excluir
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">{link.title}</h3>
                <p className="text-sm text-slate-500 truncate mb-6">{link.url}</p>
                
                <button 
                  onClick={() => setSearchParams({ id: link.id })}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-xl text-slate-700 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-200"
                >
                  Acessar <ExternalLink className="ml-2 w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )
        })}
        
        {/* Add New Card */}
        <motion.button
          onClick={() => setIsModalOpen(true)}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: filteredLinks.length * 0.05, duration: 0.3 }}
          className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center p-6 min-h-[200px] text-slate-500 hover:text-indigo-600 group"
        >
          <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-4 group-hover:border-indigo-200 group-hover:bg-indigo-100 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">Adicionar novo atalho</span>
        </motion.button>
      </div>

      {/* Modal Novo Atalho */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-slate-900">Novo Atalho</h2>
                <button onClick={resetForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5"/></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Título</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Meu Portal"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">URL / Link</label>
                  <input 
                    type="text" 
                    value={url} 
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Ex: portal.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Cor do Card</label>
                  <div className="grid grid-cols-6 gap-2 mt-1">
                    {colorOptions.map((opt) => (
                      <button 
                        key={opt.value}
                        onClick={() => setColor(opt.value)}
                        className={`w-8 h-8 rounded-full ${opt.value} border-2 ${color === opt.value ? 'border-slate-800' : 'border-transparent'} shadow-sm`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-slate-100">
                <button 
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddLink}
                  disabled={!title || !url}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 font-medium text-sm disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
