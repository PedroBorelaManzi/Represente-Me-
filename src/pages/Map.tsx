import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, MapPin, Building2, Phone, Mail, Plus, X, Info, Loader2, ExternalLink, Trash2, Navigation2, Target, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="position: relative; width: 25px; height: 41px;"><svg viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
  });
};

const defaultIcon = createCustomIcon('#10b981'); // Emerald
const redIcon = createCustomIcon('#ef4444'); // Red
const inactiveIcon = createCustomIcon('#94a3b8'); // Slate-400 (Gray)

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
    setTimeout(() => map.invalidateSize(), 150);
  }, [center, zoom, map]);
  return null;
}

export default function MapPage() {
  const { settings } = useSettings();
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [center, setCenter] = useState<[number, number]>([-15.793889, -47.882778]); // Brasília - Centro do Brasil
  const [zoom, setZoom] = useState(13);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);

  const [newLocation, setNewLocation] = useState({
    cnpj: "", name: "",  contact: "", address: "", lat: -23.5500, lng: -46.6340
  });

  const loadClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from("clients").select("*").eq("user_id", user.id);
    if (!error && data) {
      setCompanies(data);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter([position.coords.latitude, position.coords.longitude]);
          setZoom(14);
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
        }
      );
    }
  }, []);

  const handleMarkerDrag = async (id: string, latlng: { lat: number, lng: number }) => {
    const { error } = await supabase
      .from("clients")
      .update({ lat: latlng.lat, lng: latlng.lng })
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

    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
       toast.error(error.code === "23503" ? "Cliente vinculado a pedidos/compromissos." : "Erro ao excluir.");
       return;
    }
    setCompanies(prev => prev.filter(c => c.id !== id));
    toast.success("Cliente removido.");
  };

  const handleCnpjLookup = async () => {
    const cleanedCnpj = newLocation.cnpj.replace(/\D/g, "");
    if (!cleanedCnpj || cleanedCnpj.length !== 14) {
      toast.error("Insira um CNPJ válido.");
      return;
    }

    setIsSearchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanedCnpj}`);
      if (!response.ok) throw new Error("CNPJ não encontrado");
      
      const data = await response.json();
      const streetType = data.tipo_logradouro ? `${data.tipo_logradouro} ` : "";
      const addressStr = `${data.cep || ""} ${streetType}${data.logradouro || ""}, ${data.numero || ""}, ${data.municipio || ""}, ${data.uf || ""}, Brasil`;
      
      let lat = center[0];
      let lng = center[1];
      
      try {
        let geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr)}`);
        let geoData = await geoResponse.json();
        
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch {}

      setNewLocation(prev => ({
        ...prev,
        name: data.razao_social || data.nome_fantasia || prev.name,
        address: `${data.logradouro || ""}, ${data.numero || "S/N"} - ${data.bairro || ""}, ${data.municipio || ""} - ${data.uf || ""}`.trim(),
        lat,
        lng
      }));
      toast.success("Dados recuperados com sucesso!");
    } catch (err) {
      toast.error("CNPJ não encontrado. Preencha manualmente.");
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const handleMapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const match = companies.find(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.cnpj && c.cnpj.includes(searchQuery))
    );

    if (match && match.lat && match.lng) {
      setCenter([match.lat, match.lng]);
      setZoom(16);
      return;
    }

    setIsSearchingMap(true);
    try {
      const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const geoData = await geoResponse.json();
      if (geoData && geoData.length > 0) {
        const result = geoData[0];
        setCenter([parseFloat(result.lat), parseFloat(result.lon)]);
        setZoom(result.class === "place" && (result.type === "city" || result.type === "state") ? 12 : 15);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("clients").insert([{
       user_id: user.id,
       name: newLocation.name,
       cnpj: newLocation.cnpj,
       address: newLocation.address,
       lat: newLocation.lat,
       lng: newLocation.lng,
       phone: "(11) 90000-0000",
       email: "contato@exemplo.com",
       last_contact: new Date().toISOString().split('T')[0]
    }]);

    if (!error) {
       loadClients();
       setIsModalOpen(false);
       setCenter([newLocation.lat, newLocation.lng]);
       setZoom(15);
       setNewLocation({ cnpj: "", name: "",  contact: "", address: "", lat: -23.5500, lng: -46.6340 });
       toast.success("Ponto registrado no radar!");
    } else {
       toast.error("Erro ao cadastrar.");
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.cnpj && c.cnpj.includes(searchQuery))
  );

  const getOffsetPositions = (list: any[]) => {
    const locCounts: Record<string, number> = {};
    const OFFSET_LAT = 0.0008;
    const OFFSET_LNG = 0.0008;
    
    return list.map(c => {
      const lat = c.lat || center[0];
      const lng = c.lng || center[1];
      const keyLat = Math.round(lat * 400); 
      const keyLng = Math.round(lng * 400);
      const key = `${keyLat},${keyLng}`;
      const count = locCounts[key] || 0;
      locCounts[key] = count + 1;
      if (count === 0) return { ...c, displayLat: lat, displayLng: lng };
      const angle = count * (Math.PI / 3); 
      const radiusLat = OFFSET_LAT * Math.ceil(count / 6);
      const radiusLng = OFFSET_LNG * Math.ceil(count / 6);
      return { ...c, displayLat: lat + (Math.cos(angle) * radiusLat), displayLng: lng + (Math.sin(angle) * radiusLng) };
    });
  };

  const mapCompanies = getOffsetPositions(filteredCompanies);

  return (
    <div className="h-full flex flex-col gap-8 md:gap-10 pb-4">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-4 uppercase tracking-tight">
            <div className="p-3 bg-emerald-600 rounded-[20px]">
              <Navigation2 className="w-8 h-8 text-white" />
            </div>
            Radar <span className="text-slate-200 dark:text-zinc-800 ml-2">/</span> <span className="text-emerald-600">Territorial</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 font-medium">Visualização geo-estratégica da sua carteira de clientes.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <form onSubmit={handleMapSearch} className="relative w-full sm:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              {isSearchingMap ? <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" /> : <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-14 pr-6 py-4 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[24px] shadow-sm focus:ring-8 focus:ring-emerald-500/10 text-xs font-black uppercase tracking-widest transition-all placeholder:text-slate-300"
              placeholder="Buscar Cliente ou Endereço..."
            />
          </form>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[24px] font-black uppercase text-[11px] tracking-widest transition-all shadow-[0_20px_40px_-10px_rgba(99,102,241,0.4)] active:scale-95 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Expandir Radar
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-950 rounded-[48px] border border-slate-100 dark:border-zinc-850 shadow-sm overflow-hidden relative z-0 min-h-[700px]">
        {/* Floating Mini Stats Overlay */}
        <div className="absolute top-8 right-8 z-[1000] hidden lg:flex items-center gap-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-4 rounded-[32px] border border-white/40 dark:border-zinc-800 shadow-2xl">
           <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <Target className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">{mapCompanies.length} Pontos</span>
           </div>
           <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <Users className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">Ativos</span>
           </div>
        </div>

        <MapContainer center={center} zoom={zoom} style={{ height: 'calc(100vh - 280px)', width: '100%' }} scrollWheelZoom={true}>
          <ChangeView center={center} zoom={zoom} />
          <TileLayer 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          />
          {mapCompanies.filter(c => c.lat && c.lng).map((company) => (
            <Marker 
              key={company.id} 
              position={[company.displayLat, company.displayLng]}
              icon={(!company.lat || !company.lng) ? redIcon : (company.status === 'Inativo' ? inactiveIcon : defaultIcon)}
              draggable={true}
              eventHandlers={{
                dragend: (e: any) => handleMarkerDrag(company.id, e.target.getLatLng())
              }}
            >
              <Tooltip direction="top" offset={[0, -25]} opacity={1}>
                <span className="font-black uppercase tracking-tight text-[10px] px-2 py-1 text-slate-900">{company.name}</span>
              </Tooltip>
              <Popup className="premium-popup">
                <div className="p-4 min-w-[280px] bg-white dark:bg-zinc-900">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl">
                        <Building2 className="w-6 h-6 text-emerald-600" />
                     </div>
                     <div>
                        <h3 className="font-black text-slate-900 dark:text-zinc-100 text-lg uppercase tracking-tighter leading-none mb-1">{company.name}</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{company.cnpj || "Sem CNPJ"}</p>
                     </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-2xl">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{company.address || "Endereço não informado"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <Link 
                      to={`/dashboard/clientes/${company.id}`}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg  active:scale-95"
                    >
                      Perfil
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button 
                      onClick={() => handleDeleteClient(company.id, company.name)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 dark:bg-zinc-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95"
                    >
                      Remover
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 justify-center py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-amber-700 dark:text-amber-500">Arraste para ajustar posição exata</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* New Location Modal - Premium */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 40 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.9, y: 40 }} 
               className="bg-white dark:bg-zinc-900 rounded-[56px] border border-slate-200 dark:border-zinc-800 w-full max-w-xl relative z-[10001] overflow-hidden shadow-[0_64px_128px_-32px_rgba(0,0,0,0.5)]"
            >
               <div className="p-12 border-b dark:border-zinc-850 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/20">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-zinc-100 text-3xl uppercase tracking-tighter">Expandir Radar</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sincronização com o Ecossistema Territorial</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-5 bg-white dark:bg-zinc-800 rounded-[24px] shadow-sm text-slate-400 hover:text-red-500 transition-all"><X className="w-8 h-8" /></button>
              </div>

              <form onSubmit={handleCreateLocation} className="p-12 space-y-10">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Assinatura Digital (CNPJ)</label>
                  <div className="flex gap-4">
                    <input 
                      required 
                      type="text" 
                      value={newLocation.cnpj} 
                      onChange={e => setNewLocation({...newLocation, cnpj: e.target.value})} 
                      className="w-full px-8 py-5 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[32px] text-sm font-black text-slate-900 dark:text-zinc-100 outline-none focus:ring-8 focus:ring-emerald-500/10 transition-all" 
                      placeholder="00.000.000/0000-00" 
                    />
                    <button 
                      type="button" 
                      onClick={handleCnpjLookup} 
                      disabled={isSearchingCnpj} 
                      className="p-5 bg-emerald-600 text-white rounded-[24px]  active:scale-95 transition-all flex items-center justify-center min-w-[70px]"
                    >
                      {isSearchingCnpj ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                    </button>
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

                <div className="flex justify-end gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-6 bg-slate-50 dark:bg-zinc-800 rounded-[32px] text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-zinc-300 hover:bg-slate-100 transition-all">Cancelar</button>
                  <button type="submit" className="px-10 py-6 bg-emerald-600 text-white rounded-[32px] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all">Ativar no Radar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

