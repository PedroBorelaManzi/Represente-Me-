import { useState, useEffect } from "react";
import React from "react";
import { Users, Search, Plus, Phone, Mail, AlertCircle, Trash2, ExternalLink, Loader2, Building2, Info, X, Edit, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSettings } from "../contexts/SettingsContext"; // Added
import { useAuth } from "../contexts/AuthContext"; // Added

export interface Client {
  id: string;
  name: string;
  cnpj?: string;
  status: string;
  phone?: string;
  email?: string;
  city?: string;
  last_contact: string;
  created_at?: string;
}

export default function CRMPage() {
  const { user } = useAuth(); // Added
  const { settings } = useSettings(); // Added
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"Todos" | "Alerta" | "Critico" | "Perda">("Todos");
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [loading, setLoading] = useState(true);

  // Novos estados para o Modal
    // Novos estados para o Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estados para Filtros
  const [filterName, setFilterName] = useState("");
  const [filterCnpj, setFilterCnpj] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterCity, setFilterCity] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, 'id' | 'created_at'>>({
    name: "",
    cnpj: "",
    address: "",
    phone: "",
    email: "",
    city: "",
    last_contact: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

    // Estados para Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({
    name: "", cnpj: "", address: "", phone: "", email: "", city: "", last_contact: ""
  });

  const loadClients = async () => {
    if (!user) return;
    setLoading(true);
    const { data: clientsData, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && clientsData) {
      // 1. Fetch All files via RPC 
      const { data: files } = await supabase.rpc("list_user_files", { u_id: user.id });

      // Group in memory
      const filesByClient: any = {};
      if (files) {
          files.forEach((f: any) => {
              const cId = f.client_id;
              if (!filesByClient[cId]) filesByClient[cId] = [];
              filesByClient[cId].push({ file_name: f.file_name, created_at: f.created_at });
          });
      }

      const clientsWithAlerts = clientsData.map((client: any) => {
         const clientFiles = filesByClient[client.id] || [];
         const lastDates: any = {};
         
         clientFiles.forEach((f: any) => {
             const parts = f.file_name.split("___");
             if (parts.length > 1) {
                 const cat = parts[0];
                 const date = new Date(f.created_at).getTime();
                 if (!lastDates[cat] || date > lastDates[cat]) {
                      lastDates[cat] = date;
                 }
             }
         });
         
         const alerts: any[] = [];
         const today = new Date().getTime();

         for (const [cat, date] of Object.entries(lastDates)) {
             const diffTime = today - (date as number);
             const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
             
             if (days >= settings.perda_days) {
                  alerts.push({ company: cat, type: "Perda", days });
             } else if (days >= settings.critico_days) {
                  alerts.push({ company: cat, type: "Critico", days });
             } else if (days >= settings.alerta_days) {
                  alerts.push({ company: cat, type: "Alerta", days });
             }
         }

         return { ...client, alerts: alerts.sort((a, b) => b.days - a.days) };
      });
      setClients(clientsWithAlerts);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user]);

  const getInactivityDays = (lastContactStr: string) => {
    if (!lastContactStr) return 0;
    const lastContact = new Date(lastContactStr).getTime();
    const today = new Date().getTime();
    const diffTime = today - lastContact;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getAlertStatus = (days: number) => {
    if (days >= settings.perda_days) return { label: `Perda (${settings.perda_days}D+)`, color: "bg-red-50 text-red-700 border-red-100", type: "Perda" };
    if (days >= settings.critico_days) return { label: `Crítico (${settings.critico_days}D)`, color: "bg-orange-50 text-orange-700 border-orange-100", type: "Critico" };
    if (days >= settings.alerta_days) return { label: `Alerta (${settings.alerta_days}D)`, color: "bg-amber-50 text-amber-700 border-amber-100", type: "Alerta" };
    return { label: "Sem Atraso", color: "bg-emerald-50 text-emerald-700 border-emerald-100", type: "Normal" };
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja realmente excluir este cliente? Ele também será removido do Mapa.")) {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (!error) {
        setClients(clients.filter(c => c.id !== id));
      } else {
        alert("Erro ao excluir: " + error.message);
      }
    }
  };

  const handleCnpjLookup = async () => {
    const cleanedCnpj = newClient.cnpj ? newClient.cnpj.replace(/\D/g, "") : "";
    if (!cleanedCnpj || cleanedCnpj.length !== 14) {
      alert("Por favor, insira um CNPJ válido com 14 dígitos.");
      return;
    }

    setIsSearchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanedCnpj}`);
      if (!response.ok) throw new Error("CNPJ não encontrado");
      
      const data = await response.json();
      
      setNewClient(prev => ({
        ...prev,
        name: data.razao_social || data.nome_fantasia || prev.name,
        address: `${data.logradouro || ""}, ${data.numero || "S/N"} - ${data.bairro || ""}`.trim(),
        city: data.municipio || prev.city
      }));
    } catch (err) {
      alert("Não foi poss\u00EDvel buscar os dados do CNPJ. Preencha manualmente.");
    } finally {
      setIsSearchingCnpj(false);
    }
  };

    const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name || !editingClient) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("clients")
      .update({
         name: editFormData.name,
         cnpj: editFormData.cnpj,
         address: editFormData.address,
         phone: editFormData.phone,
         email: editFormData.email,
         city: editFormData.city
      })
      .eq("id", editingClient.id);

    if (!error) {
      loadClients();
      setIsEditModalOpen(false);
    } else {
      alert("Erro ao editar: " + error.message);
    }
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;
    setSubmitting(true);

    let lat = null;
    let lng = null;
    try {
      const addressQuery = newClient.address ? `${newClient.address}, ${newClient.city || ""}, Brasil` : `${newClient.city || ""}, Brasil`;
      let geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
      let geoData = await geoResponse.json();
      
      if (geoData && geoData.length > 0) {
        lat = parseFloat(geoData[0].lat);
        lng = parseFloat(geoData[0].lon);
      } else if (newClient.city) {
        // Fallback to City Only
        const cityQuery = `${newClient.city}, Brasil`;
        const cityRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}`);
        const cityData = await cityRes.json();
        if (cityData && cityData.length > 0) {
          lat = parseFloat(cityData[0].lat);
          lng = parseFloat(cityData[0].lon);
        }
      }
    } catch (err) { }

    const { error } = await supabase
      .from("clients")
      .insert([{ ...newClient, lat, lng, status: "Ativo" }]);

    if (!error) {
      loadClients();
      setIsModalOpen(false);
      setNewClient({ name: "", cnpj: "",
    address: "",
    phone: "", email: "", city: "", last_contact: new Date().toISOString().split('T')[0] });
    } else {
      alert("Erro ao cadastrar: " + error.message);
    }
    setSubmitting(false);
  };

    const filteredClients = clients.filter(c => {
    // Structured Filters
    const matchesName = !filterName || c.name.toLowerCase().includes(filterName.toLowerCase());
    const matchesCnpj = !filterCnpj || (c.cnpj && c.cnpj.includes(filterCnpj));
    const matchesCity = !filterCity || (c.city && c.city.toLowerCase().includes(filterCity.toLowerCase()));
    const days = getInactivityDays(c.last_contact);
    const computedStatus = days >= 365 ? "Inativo" : "Ativo";
    const matchesStatus = filterStatus === "Todos" || computedStatus === filterStatus;
    
    // Top-right general Searchbar Match (kept for backwards-comp or general search)
    const matchesSearch = !searchQuery.trim() || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.cnpj && c.cnpj.includes(searchQuery));
    
    if (!(matchesName && matchesCnpj && matchesCity && matchesStatus && matchesSearch)) return false;

    const alertTypes = ((c as any).alerts || []).map((a: any) => a.type);

    if (activeTab === "Todos") return true;
    return alertTypes.includes(activeTab);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ativo": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "Em Negociação": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Inativo": return "bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-slate-100 dark:border-zinc-900";
      case "Prospect": return "bg-purple-50 text-purple-700 border-purple-100";
      default: return "bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-slate-100 dark:border-zinc-900";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Gestão de Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Monitore sua carteira e alertas de inatividade.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 shadow-sm dark:shadow-none sm:text-sm"
              placeholder="Buscar cliente..."
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${showFilters ? 'bg-slate-100 dark:bg-zinc-800 border-indigo-200 dark:border-indigo-900 text-indigo-600' : 'bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none'}`}
            title="Filtrar Clientes"
          >
            <Filter className={`w-4 h-4 ${showFilters ? 'animate-pulse' : ''}`} />
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm dark:shadow-none hover:bg-indigo-700 font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </button>
        </div>
      </div>

      {loading ? (
         <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : (
        <>
                    {/* Barra de Filtros */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: "auto", opacity: 1, marginBottom: 16 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm dark:shadow-none flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">Nome</label>
                    <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900" placeholder="Filtrar por nome" />
                  </div>
                  <div className="w-full sm:w-40">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">CNPJ</label>
                    <input type="text" value={filterCnpj} onChange={e => setFilterCnpj(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900" placeholder="00000..." />
                  </div>
                  <div className="w-full sm:w-40">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">Status</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900">
                      <option value="Todos">Todos</option>
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-40">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">Cidade</label>
                    <input type="text" value={filterCity} onChange={e => setFilterCity(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900" placeholder="Filtrar por cidade" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-px">
            {(["Todos", "Alerta", "Critico", "Perda"] as const).map((tab) => {
              const count = clients.filter(c => {
                const alertTypes = ((c as any).alerts || []).map((a: any) => a.type);
                return tab === "Todos" ? true : alertTypes.includes(tab);
              }).length;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:text-zinc-300"}`}
                >
                  {tab === "Todos" ? "Todos os Clientes" : tab === "Critico" ? `Crítico (${settings.critico_days}D)` : tab === "Alerta" ? `Alerta (${settings.alerta_days}D)` : `Perda (${settings.perda_days}D+)`}
                  <span className={`ml-2 px-1.5 py-0.5 rounded-md text-xs font-bold ${activeTab === tab ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600 dark:text-zinc-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm dark:shadow-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 dark:bg-zinc-950">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase">Contato</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase">Status</th>
                                        <th className="relative px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-slate-200">
                  {filteredClients.map((client, i) => {
                    const days = getInactivityDays(client.last_contact);
                    const alert = getAlertStatus(days);

                    return (
                      <motion.tr 
                        key={client.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="hover:bg-slate-50 dark:bg-zinc-950 transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                           <Link to={`/dashboard/clientes/${client.id}`} className="flex items-center hover:opacity-80 transition-opacity">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                              {client.name.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">{client.name}</div>
                              <div className="text-sm text-slate-500 dark:text-zinc-400">{client.cnpj}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-1.5 mb-1"><Phone className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" /> {client.phone || "N/A"}</div>
                          <div className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" /> {client.email || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {((client as any).alerts || []).map((a: any, idx: number) => (
                               <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${a.type === "Perda" ? "bg-red-50 text-red-700 border-red-100" : a.type === "Critico" ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                                  {a.company} ({a.days}D)
                               
                               </span>
                            ))}
                            {((client as any).alerts || []).length === 0 && <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">Sem Atrasos</span>}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link 
                              to={`/dashboard/clientes/${client.id}`}
                              className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-indigo-600 rounded-lg hover:bg-white dark:bg-zinc-900 border border-transparent hover:border-slate-100 dark:border-zinc-900 transition-all"
                              title="Ver Ficha"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button 
                              onClick={() => {
                                setEditingClient(client);
                                setEditFormData({
                                  name: client.name || "",
                                  cnpj: client.cnpj || "",
                                  address: client.address || "",
                                  phone: client.phone || "",
                                  email: client.email || "",
                                  city: client.city || "",
                                  last_contact: client.last_contact || ""
                                });
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-indigo-600 rounded-lg hover:bg-white dark:bg-zinc-900 border border-transparent hover:border-slate-100 dark:border-zinc-900 transition-all"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(client.id)}
                              className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-red-600 rounded-lg hover:bg-white dark:bg-zinc-900 border border-transparent hover:border-slate-100 dark:border-zinc-900 transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visão Mobile (Cards) */}
          <div className="md:hidden space-y-3">
            {filteredClients.map((client: any, i: number) => {
              return (
                <motion.div 
                  key={client.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                     <Link to={`/dashboard/clientes/${client.id}`} className="flex items-center hover:opacity-80 transition-opacity overflow-hidden flex-1 mr-2">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                          {client.name.charAt(0)}
                        </div>
                        <div className="ml-3 overflow-hidden">
                          <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate max-w-[200px]">{client.name}</div>
                          <div className="text-xs text-slate-500 dark:text-zinc-400 truncate">{client.cnpj}</div>
                        </div>
                     </Link>
                     
                     <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Link to={`/dashboard/clientes/${client.id}`} className="p-1 text-slate-400 dark:text-zinc-500 hover:text-indigo-600"><ExternalLink className="w-3.5 h-3.5" /></Link>
                        <button onClick={() => { setEditingClient(client); setEditFormData({ ...client }); setIsEditModalOpen(true); }} className="p-1 text-slate-400 dark:text-zinc-500 hover:text-indigo-600"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(client.id)} className="p-1 text-slate-400 dark:text-zinc-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                     </div>
                  </div>

                  {/* Status/Alertas */}
                  <div className="flex flex-wrap gap-1">
                    {(client.alerts || []).map((a: any, idx: number) => (
                       <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${a.type === "Perda" ? "bg-red-50 text-red-700 border-red-100" : a.type === "Critico" ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                          {a.company} ({a.days}D)
                       </span>
                    ))}
                    {(client.alerts || []).length === 0 && <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">Sem Atrasos</span>}
                  </div>

                  {/* Informações Extras */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-zinc-400 pt-2 border-t border-slate-100 dark:border-zinc-800">
                     <div className="flex items-center gap-1.5 truncate"><Phone className="w-3 h-3 text-slate-400" /> {client.phone || "N/A"}</div>
                     <div className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 text-slate-400" /> {client.email || "N/A"}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal de Cadastro */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl p-6 w-full max-w-md space-y-4"
            >
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Cadastrar Novo Cliente</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">CNPJ</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newClient.cnpj} 
                      onChange={e => setNewClient({...newClient, cnpj: e.target.value})}
                      className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm flex-1"
                      placeholder="00.000.000/0001-00"
                    />
                    <button 
                      type="button" 
                      onClick={handleCnpjLookup} 
                      disabled={isSearchingCnpj} 
                      className="p-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-center min-w-[38px]"
                    >
                      {isSearchingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
                  </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Nome *</label>
                  <input 
                    type="text" 
                    required 
                    value={newClient.name} 
                    onChange={e => setNewClient({...newClient, name: e.target.value})}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Nome da Empresa/Cliente"
                  />
                </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Telefone</label>
                    <input 
                      type="text" 
                      value={newClient.phone} 
                      onChange={e => setNewClient({...newClient, phone: e.target.value})}
                      className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Cidade</label>
                    <input 
                      type="text" 
                      value={newClient.city} 
                      onChange={e => setNewClient({...newClient, city: e.target.value})}
                      className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Cidade"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">E-mail</label>
                  <input 
                    type="email" 
                    value={newClient.email} 
                    onChange={e => setNewClient({...newClient, email: e.target.value})}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="email@exemplo.com"
                  />
                </div>
                
                                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Endereço Completo</label>
                  <input 
                    type="text" 
                    value={newClient.address || ""} 
                    onChange={e => setNewClient({...newClient, address: e.target.value})}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Rua Exemplo, 123"
                  />
                </div>
                
                <div className="flex items-center gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 font-medium text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm dark:shadow-none hover:bg-indigo-700 font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      
      {/* Modal de Edição */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl p-6 w-full max-w-md space-y-4"
            >
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Editar Cliente</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">CNPJ</label>
                  <input 
                    type="text" 
                    value={editFormData.cnpj || ""} 
                    onChange={e => setEditFormData({...editFormData, cnpj: e.target.value})}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Nome *</label>
                  <input 
                    type="text" 
                    required 
                    value={editFormData.name || ""} 
                    onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Nome da Empresa/Cliente"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Telefone</label>
                    <input 
                      type="text" 
                      value={editFormData.phone || ""} 
                      onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                      className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Cidade</label>
                    <input 
                      type="text" 
                      value={editFormData.city || ""} 
                      onChange={e => setEditFormData({...editFormData, city: e.target.value})}
                      className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Cidade"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">E-mail</label>
                  <input 
                    type="email" 
                    value={editFormData.email || ""} 
                    onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Endereço Completo</label>
                  <input 
                    type="text" 
                    value={editFormData.address || ""} 
                    onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                    className="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Rua Exemplo, 123"
                  />
                </div>
                
                <div className="flex items-center gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-950 font-medium text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm dark:shadow-none hover:bg-indigo-700 font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
</AnimatePresence>
    </div>
  );
}
