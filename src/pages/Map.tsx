import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, MapPin, Building2, Phone, Mail, Plus, X, Info, Loader2, ExternalLink, AlertCircle, Navigation, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [center, setCenter] = useState<[number, number]>([-23.1675, -47.7419]); // Cerquilho as default
  const [zoom, setZoom] = useState(13);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [newLocation, setNewLocation] = useState({
    cnpj: "", name: "",  contact: "", address: "", lat: -23.1675, lng: -47.7419
  });

  const loadClients = async () => {
    if (!user) return;
    const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id);
    
    if (!error && data) {
      setCompanies(data);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCenter([latitude, longitude]);
        setZoom(16);
        setIsLocating(false);
      },
      (error) => {
        console.error("Erro ao obter localização:", error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    loadClients();
    handleGetCurrentLocation();
  }, [user]);

  const handleMarkerDrag = async (id: string, latlng: { lat: number, lng: number }) => {
    const { error } = await supabase
      .from("clients")
      .update({ lat: latlng.lat, lng: latlng.lng })
      .eq("id", id)
      .eq("user_id", user?.id);

    if (!error) {
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, lat: latlng.lat, lng: latlng.lng } : c));
      toast.success("Localização atualizada.");
    } else {
      toast.error("Erro ao salvar localização.");
    }
  };

  const handleCnpjLookup = async () => {
    const cleanedCnpj = newLocation.cnpj.replace(/\D/g, "");
    if (!cleanedCnpj || cleanedCnpj.length !== 14) {
      toast.error("CNPJ inválido.");
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
        } else {
          const fallbackStr = `${streetType}${data.logradouro || ""}, ${data.numero || ""}, ${data.municipio || ""}, ${data.uf || ""}, Brasil`;
          const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackStr)}`);
          const fallbackData = await fallbackRes.json();
          
          if (fallbackData && fallbackData.length > 0) {
             lat = parseFloat(fallbackData[0].lat);
             lng = parseFloat(fallbackData[0].lon);
          }
        }
      } catch {}

      setNewLocation(prev => ({
        ...prev,
        name: data.razao_social || data.nome_fantasia || prev.name,
        address: `${data.logradouro || ""}, ${data.numero || "S/N"} - ${data.bairro || ""}, ${data.municipio || ""} - ${data.uf || ""}`.trim(),
        lat,
        lng
      }));
    } catch (err) {
      toast.error("Não foi possível buscar os dados do CNPJ.");
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
        setZoom(15);
      }
    } catch (err) {
      console.error("Erro ao buscar local no mapa", err);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    
    try {
        const cleanCnpj = newLocation.cnpj.replace(/\D/g, "");
        
        // Verificação de Duplicidade
        const { data: existing } = await supabase.from("clients").select("id, name").eq("user_id", user.id).eq("cnpj", cleanCnpj).maybeSingle();
        if (existing) {
            toast.error(`Cliente já existe: ${existing.name}`);
            setSubmitting(false);
            return;
        }

        const { error } = await supabase.from("clients").insert([{
           name: newLocation.name.trim(),
           cnpj: cleanCnpj || null,
           address: newLocation.address,
           lat: newLocation.lat,
           lng: newLocation.lng,
           user_id: user.id,
           status: "Ativo",
           last_contact: new Date().toISOString().split('T')[0]
        }]);

        if (error) throw error;

        toast.success("Cliente cadastrado no mapa!");
        loadClients();
        setIsModalOpen(false);
        setCenter([newLocation.lat, newLocation.lng]);
        setZoom(16);
        setNewLocation({ cnpj: "", name: "",  contact: "", address: "", lat: -23.1675, lng: -47.7419 });
    } catch (err: any) {
        toast.error("Erro ao cadastrar: " + err.message);
    } finally {
        setSubmitting(false);
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
      
      return {
        ...c,
        displayLat: lat + (Math.cos(angle) * radiusLat),
        displayLng: lng + (Math.sin(angle) * radiusLng)
      };
    });
  };

  const mapCompanies = getOffsetPositions(filteredCompanies);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header com Tipografia Corrigida */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">Mapa de Clientes</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Visão panorâmica da sua base instalada de clientes.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <form onSubmit={handleMapSearch} className="relative w-full sm:w-80 group">
            <button type="submit" className="absolute inset-y-0 left-0 pl-3 flex items-center hover:text-indigo-600 transition-colors">
              {isSearchingMap ? <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" /> : <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500" />}
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl shadow-sm text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
              placeholder="Buscar Cliente ou Endereço..."
            />
          </form>

          <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-950 rounded-[32px] border dark:border-zinc-800 shadow-xl overflow-hidden relative z-0">
        <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
          <ChangeView center={center} zoom={zoom} />
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          {mapCompanies.map((company) => (
            <Marker 
              key={company.id} 
              position={[company.displayLat, company.displayLng]}
              draggable={true}
              eventHandlers={{
                dragend: (e: any) => handleMarkerDrag(company.id, e.target.getLatLng())
              }}
            >
              <Tooltip direction="top" offset={[0, -25]} opacity={1}>
                <span className="font-black text-slate-900 text-[10px] uppercase">{company.name}</span>
              </Tooltip>
              <Popup className="rounded-2xl overflow-hidden">
                <div className="p-2 min-w-[210px] space-y-3">
                  <h3 className="font-black text-slate-900 text-base uppercase tracking-tight italic leading-tight">{company.name}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     <Building2 className="w-3.5 h-3.5 opacity-50" />
                     <span>{company.cnpj || "S/ CNPJ"}</span>
                  </div>
                  
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter inline-block border ${company.status === "Ativo" || company.status === "Cliente" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-indigo-50 text-indigo-700 border-indigo-100"}`}>
                    {company.status}
                  </span>
                  
                  <div className="space-y-1 text-xs text-slate-600 border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-2 font-bold"><Phone className="w-3.5 h-3.5 text-slate-400 opacity-50" /><span>{company.phone || "---"}</span></div>
                    <div className="flex items-center gap-2 font-bold"><Mail className="w-3.5 h-3.5 text-slate-400 opacity-50" /><span className="truncate">{company.email || "---"}</span></div>
                  </div>
                  
                  <Link 
                    to={`/dashboard/clientes/${company.id}`}
                    className="w-full inline-flex items-center justify-center p-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all mt-1"
                  >
                    ACESSAR FICHA <ExternalLink className="w-3 h-3 ml-2" />
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[40px] p-10 shadow-2xl border border-white/10 overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-slate-900 dark:text-zinc-100 text-2xl uppercase tracking-tighter italic">Novo Registro</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <form onSubmit={handleCreateLocation} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic ml-1">Documento Oficial (CNPJ)</label>
                  <div className="flex gap-2 p-2 bg-slate-50 dark:bg-zinc-950 rounded-2xl border dark:border-zinc-850">
                    <input required type="text" value={newLocation.cnpj} onChange={e => setNewLocation({...newLocation, cnpj: e.target.value})} className="w-full px-3 bg-transparent text-sm font-black outline-none placeholder:text-slate-300" placeholder="Apenas números" />
                    <button type="button" onClick={handleCnpjLookup} disabled={isSearchingCnpj} className="p-3 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-md">{isSearchingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic ml-1">Razão Social</label>
                  <input required type="text" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 transition-colors" placeholder="Nome Fantasia ou Grupo" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic ml-1">Observações de Endereço</label>
                  <textarea required value={newLocation.address} onChange={e => setNewLocation({...newLocation, address: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-850 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 transition-colors resize-none h-24" placeholder="Rua, número, bairro..." />
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold leading-tight uppercase">O sistema buscará as coordenadas automaticamente. Se preferir, arraste o pin após o cadastro.</p>
                </div>

                <div className="flex flex-col gap-3 pt-6 border-t dark:border-zinc-850">
                  <button type="submit" disabled={submitting} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>CADASTRAR NO RADAR <ChevronRight className="w-4 h-4"/></>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
