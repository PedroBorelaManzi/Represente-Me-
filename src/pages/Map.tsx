import React, { useState, useEffect } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  useMap, 
  Circle,
  useMapEvents
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { 
  Search, 
  Filter, 
  Navigation, 
  Layers, 
  Info, 
  Building2, 
  Phone, 
  Mail, 
  Calendar, 
  TrendingUp,
  MapPin,
  ChevronRight,
  Plus,
  X,
  Compass,
  Zap,
  Clock,
  Target,
  Maximize2,
  Trash2
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function Map() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [center, setCenter] = useState<[number, number]>([-15.793889, -47.882778]); // Brasília - Centro do Brasil
  const [zoom, setZoom] = useState(13);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    address: "",
    cnpj: "",
    type: "client"
  });

  useEffect(() => {
    if (user) {
      loadCompanies();
    }
  }, [user]);

  const loadCompanies = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user?.id);

    if (data) {
      const validCompanies = data.filter(c => c.lat && c.lng);
      setCompanies(validCompanies);
      
      if (validCompanies.length > 0) {
        setCenter([validCompanies[0].lat, validCompanies[0].lng]);
      }
    }
  };

  const handleUpdateLocation = async (id: string, latlng: L.LatLng) => {
    const { error } = await supabase
      .from("clients")
      .update({
        lat: latlng.lat,
        lng: latlng.lng
      })
      .eq("id", id);

    if (!error) {
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, lat: latlng.lat, lng: latlng.lng } : c));
      toast.success("Localização atualizada!");
    } else {
      toast.error("Erro ao salvar localização");
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente excluir o cliente "${name}"? Esta ação não pode ser desfeita.`)) return;
    
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (!error) {
      toast.success("Cliente removido com sucesso!");
      loadCompanies();
    } else {
      toast.error("Erro ao remover cliente.");
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedCnpj = newLocation.cnpj.replace(/\D/g, "");
    if (!cleanedCnpj || cleanedCnpj.length !== 14) {
      toast.error("Insira um CNPJ válido.");
      return;
    }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newLocation.address)}`);
      const data = await response.json();

      if (data && data[0]) {
        const { lat, lon } = data[0];
        
        const { error } = await supabase
          .from("clients")
          .insert([{
            user_id: user?.id,
            name: newLocation.name,
            address: newLocation.address,
            cnpj: cleanedCnpj,
            lat: parseFloat(lat),
            lng: parseFloat(lon)
          }]);

        if (!error) {
          toast.success("Localização adicionada ao radar!");
          setShowAddModal(false);
          setNewLocation({ name: "", address: "", cnpj: "", type: "client" });
          loadCompanies();
        } else {
          toast.error("Erro ao cadastrar: " + error.message);
        }
      } else {
        toast.error("Endereço não localizado. Tente ser mais específico.");
      }
    } catch (err) {
      toast.error("Falha na geolocalização.");
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6 relative overflow-hidden">
      {/* Search and Navigation Bar - High Fidelity */}
      <div className="flex flex-col md:flex-row items-center gap-4 z-10">
        <div className="flex-1 relative group w-full">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Rastrear Clientes ou Localidades..."
            className="block w-full pl-14 pr-6 py-5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[32px] text-sm font-black text-slate-900 dark:text-zinc-100 outline-none focus:ring-8 focus:ring-emerald-500/10 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 px-8 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[32px] font-black uppercase text-[11px] tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span>Mapear Novo Ponto</span>
          </button>
          
          <div className="flex bg-white dark:bg-zinc-900 p-2 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm">
            <button className="p-3 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-full transition-all text-slate-400 hover:text-emerald-600">
              <Compass className="w-5 h-5" />
            </button>
            <button className="p-3 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-full transition-all text-slate-400 hover:text-emerald-600">
              <Layers className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Statistics and List Sidebar */}
        <div className="w-full lg:w-96 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-6 lg:pb-0">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Painel Territorial</h3>
              <Zap className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter">{filteredCompanies.length}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos Ativos</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-emerald-600 tracking-tighter">100%</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronia</p>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full w-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-zinc-800">
               <h3 className="text-[11px] font-black text-slate-900 dark:text-zinc-100 uppercase tracking-wider">Lista de Localidades</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredCompanies.map(company => (
                <button
                  key={company.id}
                  onClick={() => {
                    setCenter([company.lat, company.lng]);
                    setSelectedCompany(company);
                  }}
                  className={cn(
                    "w-full text-left p-5 rounded-[28px] border transition-all group relative overflow-hidden",
                    selectedCompany?.id === company.id 
                      ? "bg-slate-900 border-slate-900 text-white shadow-xl translate-x-1" 
                      : "bg-slate-50 dark:bg-zinc-950 border-transparent hover:border-emerald-200"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className={cn("text-xs font-black uppercase tracking-tight truncate pr-4", selectedCompany?.id === company.id ? "text-white" : "text-slate-900 dark:text-zinc-100")}>
                      {company.name}
                    </p>
                    <MapPin className={cn("w-4 h-4 shrink-0", selectedCompany?.id === company.id ? "text-emerald-400" : "text-slate-300")} />
                  </div>
                  <p className={cn("text-[10px] font-medium leading-relaxed truncate", selectedCompany?.id === company.id ? "text-slate-400" : "text-slate-500")}>
                    {company.address}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map Container - Full Screen Feel */}
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[48px] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative group/map">
          <MapContainer
            center={center}
            zoom={zoom}
            className="h-full w-full z-0"
            style={{ background: '#f8fafc' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            
            <MapUpdater center={center} />
            
            {filteredCompanies.map((company) => (
              <Marker
                key={company.id}
                position={[company.lat, company.lng]}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target;
                    handleUpdateLocation(company.id, marker.getLatLng());
                  },
                  click: () => setSelectedCompany(company)
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-4 min-w-[240px] font-sans">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-emerald-600 rounded-xl">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{company.name}</h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cadastro Verificado</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-5">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5" />
                        <p className="text-[10px] font-bold text-slate-600 leading-relaxed">{company.address}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                        <p className="text-[10px] font-bold text-slate-600 leading-relaxed">{company.lat.toFixed(4)}, {company.lng.toFixed(4)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Status</p>
                         <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[9px] font-black text-slate-900 uppercase">Ativo</span>
                         </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Rota</p>
                         <span className="text-[9px] font-black text-slate-900 uppercase">Zona Sul</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        to={`/dashboard/clientes/${company.id}`}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center hover:bg-emerald-600 transition-colors shadow-lg"
                      >
                        Abrir Perfil
                      </Link>
                      <button 
                        onClick={() => handleDeleteClient(company.id, company.name)}
                        className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {selectedCompany && (
              <>
                <Circle
                  center={[selectedCompany.lat, selectedCompany.lng]}
                  radius={500}
                  pathOptions={{
                    fillColor: '#10b981',
                    fillOpacity: 0.1,
                    color: '#10b981',
                    weight: 1,
                    dashArray: '5, 5'
                  }}
                />
                <Marker position={[selectedCompany.lat, selectedCompany.lng]} />
              </>
            )}
          </MapContainer>

          {/* Floating Controls Overlay */}
          <div className="absolute top-8 right-8 z-[500] flex flex-col gap-3">
             <button className="p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/50 rounded-3xl shadow-2xl text-slate-600 dark:text-zinc-300 hover:text-emerald-600 transition-all hover:scale-105 active:scale-95 group">
                <Maximize2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
             </button>
             <button className="p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/50 rounded-3xl shadow-2xl text-slate-600 dark:text-zinc-300 hover:text-emerald-600 transition-all hover:scale-105 active:scale-95 group">
                <Target className="w-5 h-5 group-hover:rotate-90 transition-transform" />
             </button>
          </div>

          <AnimatePresence>
            {selectedCompany && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                className="absolute right-0 top-0 bottom-0 w-80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-l border-slate-200/50 dark:border-zinc-800/50 z-[501] p-8 shadow-2xl"
              >
                <button 
                  onClick={() => setSelectedCompany(null)}
                  className="absolute top-6 left-6 p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mt-12 space-y-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                      <Building2 className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter leading-tight mb-2">{selectedCompany.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Territorial: #{selectedCompany.id.slice(0, 8)}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Localização</p>
                      <p className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 leading-relaxed">{selectedCompany.address}</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Coordenadas</p>
                      <p className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">{selectedCompany.lat.toFixed(6)}, {selectedCompany.lng.toFixed(6)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-center py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-amber-700 dark:text-amber-500">Arraste para ajustar posição exata</span>
                  </div>

                  <Link
                    to={`/dashboard/clientes/${selectedCompany.id}`}
                    className="flex items-center justify-center gap-3 w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[28px] text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white transition-all shadow-xl active:scale-95"
                  >
                    <span>Configurar Acesso</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Location Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[56px] border border-white/20 dark:border-zinc-800 shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden"
            >
              <form onSubmit={handleAddLocation} className="p-12 md:p-16 space-y-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-zinc-100 text-3xl uppercase tracking-tighter">Expandir Radar</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sincronização com o Ecossistema Territorial</p>
                  </div>
                  <button type="button" onClick={() => setShowAddModal(false)} className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-3xl text-slate-400 hover:text-red-500 transition-all shadow-sm">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tipo de Localidade</label>
                      <div className="flex p-2 bg-slate-50 dark:bg-zinc-950 rounded-[28px] border border-slate-100 dark:border-zinc-800">
                        <button type="button" className="flex-1 py-3 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 text-[10px] font-black uppercase rounded-[20px] shadow-sm tracking-widest transition-all">Cliente</button>
                        <button type="button" className="flex-1 py-3 text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all">Prospect</button>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Documento Fiscal</label>
                      <input required type="text" value={newLocation.cnpj} onChange={e => setNewLocation({...newLocation, cnpj: e.target.value})} className="w-full px-8 py-5 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[32px] text-sm font-black text-slate-900 dark:text-zinc-100 outline-none focus:ring-8 focus:ring-emerald-500/10 transition-all" placeholder="CNPJ do Ponto" />
                   </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Identificação do Ponto</label>
                  <input required type="text" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} className="w-full px-8 py-5 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[32px] text-sm font-black text-slate-900 dark:text-zinc-100 outline-none focus:ring-8 focus:ring-emerald-500/10 transition-all" placeholder="Razão Social ou Nome Fantasia" />
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Localização Territorial</label>
                  <textarea 
                    value={newLocation.address} 
                    onChange={e => setNewLocation({...newLocation, address: e.target.value})} 
                    className="w-full px-8 py-5 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[32px] text-sm font-black text-slate-900 dark:text-zinc-100 outline-none focus:ring-8 focus:ring-emerald-500/10 transition-all resize-none h-32" 
                    placeholder="Rua, Número, Bairro, Cidade..." 
                  />
                </div>

                <button type="submit" className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[32px] font-black uppercase text-xs tracking-[0.2em] transition-all shadow-2xl shadow-emerald-500/30 active:scale-95 flex items-center justify-center gap-4">
                  <Compass className="w-6 h-6 animate-pulse" />
                  <span>Geoprocessar e Mapear</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}
