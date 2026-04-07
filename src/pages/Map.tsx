import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, MapPin, Building2, Phone, Mail, Plus, X, Info, Loader2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [center, setCenter] = useState<[number, number]>([-23.550520, -46.633308]);
  const [zoom, setZoom] = useState(13);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);

  const [newLocation, setNewLocation] = useState({
    cnpj: "", name: "",  contact: "", address: "", lat: -23.5500, lng: -46.6340
  });

  const loadClients = async () => {
    const { data, error } = await supabase.from("clients").select("*");
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
    } else {
      alert("Erro ao salvar localização: " + error.message);
    }
  };

  const handleCnpjLookup = async () => {
    const cleanedCnpj = newLocation.cnpj.replace(/\D/g, "");
    if (!cleanedCnpj || cleanedCnpj.length !== 14) {
      alert("Por favor, insira um CNPJ válido com 14 dÃ­gitos.");
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
          // Fallback 1: Try without CEP for strict matching
          const fallbackStr = `${streetType}${data.logradouro || ""}, ${data.numero || ""}, ${data.municipio || ""}, ${data.uf || ""}, Brasil`;
          const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackStr)}`);
          const fallbackData = await fallbackRes.json();
          
          if (fallbackData && fallbackData.length > 0) {
             lat = parseFloat(fallbackData[0].lat);
             lng = parseFloat(fallbackData[0].lon);
          } else {
             // Fallback 2: City + State only
             const cityQuery = `${data.municipio || ""}, ${data.uf || ""}, Brasil`;
             const cityRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}`);
             const cityData = await cityRes.json();
             if (cityData && cityData.length > 0) {
                lat = parseFloat(cityData[0].lat);
                lng = parseFloat(cityData[0].lon);
             }
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
      alert("Não foi possÃ­vel buscar os dados do CNPJ. Preencha manualmente.");
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  
  const handleMapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if we have an exact or partial match in existing clients first
    const match = companies.find(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.cnpj && c.cnpj.includes(searchQuery))
    );

    if (match && match.lat && match.lng) {
      setCenter([match.lat, match.lng]);
      setZoom(16);
      return;
    }

    // If no client format match, search Nominatim to pan to new city/address
    setIsSearchingMap(true);
    try {
      const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const geoData = await geoResponse.json();
      
      if (geoData && geoData.length > 0) {
        const result = geoData[0];
        setCenter([parseFloat(result.lat), parseFloat(result.lon)]);
        // Zoom closer for specific addresses, wider for cities/states
        setZoom(result.class === "place" && (result.type === "city" || result.type === "state") ? 12 : 15);
      } else {
         console.log("Local não encontrado na base do mapa.");
      }
    } catch (err) {
      console.error("Erro ao buscar local no mapa", err);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("clients").insert([{
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
    } else {
       alert("Erro ao cadastrar: " + error.message);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.cnpj && c.cnpj.includes(searchQuery))
  );

  const getOffsetPositions = (list: any[]) => {
    const locCounts: Record<string, number> = {};
    const OFFSET_LAT = 0.0008; // Maior distanciamento (aprox 90m)
    const OFFSET_LNG = 0.0008;
    
    return list.map(c => {
      const lat = c.lat || center[0];
      const lng = c.lng || center[1];
      
      // Agrupamos clientes num raio de aprox 250m com a chave de arredondamento
      const keyLat = Math.round(lat * 400); 
      const keyLng = Math.round(lng * 400);
      const key = `${keyLat},${keyLng}`;
      
      const count = locCounts[key] || 0;
      locCounts[key] = count + 1;
      
      if (count === 0) return { ...c, displayLat: lat, displayLng: lng };
      
      // Espiral circular (espalha para os lados antes de ir mais longe)
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Radar Territorial</h1>
          <p className="text-sm text-slate-500 mt-1">Encontre clientes e os seus arquivos privados.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <form onSubmit={handleMapSearch} className="relative w-full sm:w-80 group">
            <button 
              type="submit" 
              className="absolute inset-y-0 left-0 pl-3 flex items-center hover:text-indigo-600 transition-colors cursor-pointer"
            >
              {isSearchingMap ? <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" /> : <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />}
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
              placeholder="Buscar Cliente ou Endereço..."
            />
          </form>
          <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 font-medium text-sm transition-colors whitespace-nowrap">
            <Plus className="w-4 h-4 mr-1.5" /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative z-0">
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
                <span className="font-bold text-slate-900 text-xs">{company.name}</span>
              </Tooltip>
              <Popup className="rounded-xl overflow-hidden">
                <div className="p-1 min-w-[210px]">
                  <h3 className="font-bold text-slate-900 text-base mb-0">{company.name}</h3>
                  <p className="text-[9px] text-indigo-600 font-medium mb-1 flex items-center gap-1">?? Arraste o pin para ajustar</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-2"><Building2 className="w-3.5 h-3.5" /><span>{company.cnpj || "N/A"}</span></div>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-semibold mb-3 inline-block border ${company.status === "Ativo" || company.status === "Cliente" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-indigo-50 text-indigo-700 border-indigo-100"}`}>{company.status}</span>
                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2 pb-2">
                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /><span>{company.phone || "N/A"}</span></div>
                    <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /><span className="truncate">{company.email || "N/A"}</span></div>
                  </div>
                  <Link 
                    to={`/dashboard/clientes/${company.id}`}
                    className="w-full inline-flex items-center justify-center px-3 py-1.5 border border-indigo-600 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors mt-1"
                  >
                    Ver Ficha <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md relative z-10 overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">Adicionar Novo Cliente no Mapa</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateLocation} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ</label>
                  <div className="flex gap-2">
                    <input required type="text" value={newLocation.cnpj} onChange={e => setNewLocation({...newLocation, cnpj: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm" placeholder="00000000000000" />
                    <button type="button" onClick={handleCnpjLookup} disabled={isSearchingCnpj} className="p-2 border border-slate-200 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-center min-w-[38px]">{isSearchingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-5 h-5" />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Local / Razão Social</label>
                  <input required type="text" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm" placeholder="Nome Fantasia" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome de Contato</label>
                  <input type="text" value={newLocation.contact} onChange={e => setNewLocation({...newLocation, contact: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Observações / Endereço</label>
                  <textarea value={newLocation.address} onChange={e => setNewLocation({...newLocation, address: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm resize-none h-16" placeholder="Rua exemplo, 123..." />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-600 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-normal">O pin será posicionado no mapa com base no endereço encontrado.</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-medium">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium">Adicionar Cliente</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}








