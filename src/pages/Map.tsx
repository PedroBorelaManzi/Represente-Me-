import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, MapPin, Building2, Phone, Plus, X, Loader2, Navigation, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

// Custom Marker for My Location
const myLocationIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="w-4 h-4 bg-indigo-600 border-2 border-white rounded-full shadow-lg animate-pulse"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
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
  const [center, setCenter] = useState<[number, number]>([-23.1675, -47.7419]); 
  const [zoom, setZoom] = useState(13);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newLocation, setNewLocation] = useState({
    cnpj: "", name: "",  address: "", city: "", state: "", lat: -23.1675, lng: -47.7419
  });

  const loadClients = async () => {
    if (!user) return;
    const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .not("latitude", "is", null);
    
    if (!error && data) {
      setCompanies(data.map(c => ({...c, lat: c.latitude, lng: c.longitude})));
    }
  };

  const handleGetCurrentLocation = () => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setCenter([latitude, longitude]);
        setZoom(16);
      },
      (error) => {
        console.error("Erro ao obter localização:", error);
         // Fallback via IP
         fetch('https://ipapi.co/json/')
         .then(res => res.json())
         .then(data => {
           if (data.latitude && data.longitude) {
             setUserLocation([data.latitude, data.longitude]);
             setCenter([data.latitude, data.longitude]);
           }
         });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    loadClients();
    handleGetCurrentLocation();
  }, [user]);

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
      const addr = `${data.logradouro || ""}, ${data.numero || "S/N"} - ${data.bairro || ""}, ${data.municipio || ""} - ${data.uf || ""}`.trim();
      
      let lat = center[0];
      let lng = center[1];
      
      try {
        let geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`);
        let geoData = await geoResponse.json();
        
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch {}

      setNewLocation(prev => ({
        ...prev,
        cnpj: cleanedCnpj,
        name: data.razao_social || data.nome_fantasia || prev.name,
        address: addr,
        city: data.municipio || "",
        state: data.uf || "",
        lat,
        lng
      }));
    } catch (err) {
      toast.error("Não foi possível buscar os dados do CNPJ.");
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newLocation.name) return;
    setSubmitting(true);
    
    try {
        const { error } = await supabase.from("clients").insert([{
           name: newLocation.name,
           cnpj: newLocation.cnpj,
           address: newLocation.address,
           city: newLocation.city,
           latitude: newLocation.lat,
           longitude: newLocation.lng,
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
        setNewLocation({ cnpj: "", name: "", address: "", city: "", state: "", lat: -23.1675, lng: -47.7419 });
    } catch (err: any) {
        toast.error("Erro ao cadastrar: " + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.cnpj && c.cnpj.includes(searchQuery)) ||
    (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4 relative">
      {/* Header / Search Overlay */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col md:flex-row gap-2 pointer-events-none">
        <div className="flex-1 max-w-md pointer-events-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, CNPJ ou cidade..."
              className="w-full pl-12 pr-4 py-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/20 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-black/10 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs uppercase italic tracking-tighter"
            />
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={handleGetCurrentLocation}
            className="p-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/20 dark:border-zinc-800 rounded-2xl shadow-xl hover:bg-slate-50 transition-all text-slate-600 dark:text-zinc-400"
            title="Minha Localização"
          >
            <Target className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-500/20 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 rounded-[40px] overflow-hidden border-4 border-white dark:border-zinc-900 shadow-2xl relative z-0">
        <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <ChangeView center={center} zoom={zoom} />
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {userLocation && (
            <Marker position={userLocation} icon={myLocationIcon}>
              <Popup>
                <p className="font-black text-[10px] uppercase italic text-indigo-600">Sua Posição</p>
              </Popup>
            </Marker>
          )}

          {filteredCompanies.map(company => (
            <Marker 
              key={company.id} 
              position={[company.lat, company.lng]}
              eventHandlers={{
                click: () => {
                  setCenter([company.lat, company.lng]);
                  setZoom(16);
                }
              }}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[200px]">
                  <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2 border-b pb-2">{company.name}</h4>
                  <div className="space-y-2">
                    <p className="text-[10px] flex items-center gap-2 text-slate-500 font-bold"><Building2 className="w-3 h-3"/> {company.cnpj || 'Sem CNPJ'}</p>
                    <p className="text-[10px] flex items-center gap-2 text-slate-500 font-bold"><MapPin className="w-3 h-3"/> {company.city || 'Cidade não inf.'}</p>
                  </div>
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${company.lat},${company.lng}`, '_blank')}
                    className="w-full mt-3 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                  >
                    Traçar Rota
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* New Client Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-2xl p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8 pb-4 border-b dark:border-zinc-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Novo Registro</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-2xl transition-colors"><X className="w-6 h-6"/></button>
              </div>

              <form onSubmit={handleCreateLocation} className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">CNPJ (Auto-Completar)</label>
                   <div className="flex gap-2">
                     <input type="text" value={newLocation.cnpj} onChange={e => setNewLocation({...newLocation, cnpj: e.target.value})} className="flex-1 px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850 rounded-2xl text-xs font-bold" placeholder="Apenas números" />
                     <button type="button" onClick={handleCnpjLookup} className="p-3 bg-indigo-600 text-white rounded-2xl">
                       {isSearchingCnpj ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                     </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Razão Social</label>
                    <input required type="text" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850 rounded-2xl text-xs font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Cidade</label>
                    <input required type="text" value={newLocation.city} onChange={e => setNewLocation({...newLocation, city: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850 rounded-2xl text-xs font-bold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Rua e Número</label>
                  <input required type="text" value={newLocation.address} onChange={e => setNewLocation({...newLocation, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850 rounded-2xl text-xs font-bold" />
                </div>

                <button type="submit" disabled={submitting} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                   {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
                   Cadastrar no Mapa
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container { font-family: inherit; }
        .custom-popup .leaflet-popup-content-wrapper { border-radius: 20px; padding: 8px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
      `}} />
    </div>
  );
}
