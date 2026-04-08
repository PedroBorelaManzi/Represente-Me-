import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, MapPin, Building2, Phone, Plus, X, Loader2, Navigation, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';

// Fix for default marker icons in Leaflet with Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

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
  }, [center, zoom]);
  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([-23.5505, -46.6333]);
  const [zoom, setZoom] = useState(13);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  
  // New Client Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    cnpj: '',
    phone: '',
    email: '',
    address: '',
    city: '', // ADICIONADO
    state: '',
    latitude: 0,
    longitude: 0
  });
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadClients = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .not('latitude', 'is', null);

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Load Map Clients Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // HIGH ACCURACY GEOLOCATION
  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          setZoom(15);
        },
        (error) => {
          console.error("Geolocation error:", error);
          // Fallback via IP if GPS fails
          fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => {
              if (data.latitude && data.longitude) {
                setUserLocation([data.latitude, data.longitude]);
                setMapCenter([data.latitude, data.longitude]);
              }
            });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  useEffect(() => {
    loadClients();
    handleGetCurrentLocation();
  }, [user]);

  const handleCnpjLookup = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setIsLookupLoading(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (response.ok) {
        const data = await response.json();
        
        // Geocoding the address from BrasilAPI
        const addr = `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio} - ${data.uf}`;
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`);
        const geoData = await geoRes.json();

        setNewClient(prev => ({
          ...prev,
          cnpj: cleanCnpj,
          name: data.razao_social || data.nome_fantasia,
          address: addr,
          city: data.municipio, // SALVANDO CIDADE
          state: data.uf,
          latitude: geoData[0] ? parseFloat(geoData[0].lat) : 0,
          longitude: geoData[0] ? parseFloat(geoData[0].lon) : 0
        }));
      }
    } catch (err) {
      console.error("CNPJ Lookup Error:", err);
    } finally {
      setIsLookupLoading(false);
    }
  };

  const handleCreateLocation = async () => {
    if (!user || !newClient.name || !newClient.latitude) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('clients').insert([{
        user_id: user.id,
        ...newClient,
        status: 'Ativo',
        last_contact: new Date().toISOString().split('T')[0]
      }]);

      if (error) throw error;
      
      setIsModalOpen(false);
      setNewClient({ name: '', cnpj: '', phone: '', email: '', address: '', city: '', state: '', latitude: 0, longitude: 0 });
      loadClients();
    } catch (err) {
      console.error("Save Client Error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.cnpj?.includes(searchQuery) ||
    c.city?.toLowerCase().includes(searchQuery.toLowerCase()) // BUSCA POR CIDADE NO MAPA TAMBÉM
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4 relative">
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
        <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <ChangeView center={mapCenter} zoom={zoom} />
          
          {userLocation && (
            <Marker position={userLocation} icon={myLocationIcon}>
              <Popup className="custom-popup">
                <p className="font-black text-[10px] uppercase italic text-indigo-600">Você está aqui</p>
              </Popup>
            </Marker>
          )}

          {filteredClients.map(client => (
            <Marker 
              key={client.id} 
              position={[client.latitude, client.longitude]}
              eventHandlers={{
                click: () => {
                  setMapCenter([client.latitude, client.longitude]);
                  setZoom(16);
                }
              }}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[200px]">
                  <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2 border-b pb-2">{client.name}</h4>
                  <div className="space-y-2">
                    <p className="text-[10px] flex items-center gap-2 text-slate-500 font-bold"><Building2 className="w-3 h-3"/> {client.cnpj}</p>
                    <p className="text-[10px] flex items-center gap-2 text-slate-500 font-bold"><MapPin className="w-3 h-3"/> {client.city || 'Cidade não inf.'}</p>
                    {client.phone && <p className="text-[10px] flex items-center gap-2 text-slate-500 font-bold"><Phone className="w-3 h-3"/> {client.phone}</p>}
                  </div>
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${client.latitude},${client.longitude}`, '_blank')}
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
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-2xl p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8 pb-4 border-b dark:border-zinc-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Novo Cliente no Mapa</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-2xl transition-colors"><X className="w-6 h-6"/></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Consulta de CNPJ (Auto-preencher)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="00.000.000/0000-00"
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      onChange={(e) => e.target.value.length >= 14 && handleCnpjLookup(e.target.value)}
                    />
                    {isLookupLoading && <div className="flex items-center px-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" /></div>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Razão Social</label>
                    <input 
                      type="text"
                      value={newClient.name}
                      onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850 rounded-2xl text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">CNPJ</label>
                    <input 
                      type="text"
                      value={newClient.cnpj}
                      onChange={(e) => setNewClient({...newClient, cnpj: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850 rounded-2xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Endereço Completo</label>
                  <input 
                    type="text"
                    value={newClient.address}
                    readOnly
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-zinc-900 border border-transparent rounded-2xl text-xs font-bold text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Cidade</label>
                     <input 
                       type="text"
                       value={newClient.city}
                       readOnly
                       className="w-full px-4 py-3 bg-slate-100 dark:bg-zinc-900 border border-transparent rounded-2xl text-xs font-bold text-slate-400"
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Estado</label>
                     <input 
                       type="text"
                       value={newClient.state}
                       readOnly
                       className="w-full px-4 py-3 bg-slate-100 dark:bg-zinc-900 border border-transparent rounded-2xl text-xs font-bold text-slate-400"
                     />
                   </div>
                </div>
              </div>

              <div className="flex gap-4 mt-12">
                 <button 
                   onClick={handleCreateLocation}
                   disabled={isSaving || !newClient.latitude}
                   className="flex-1 py-4 bg-indigo-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 disabled:opacity-50 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                 >
                   {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
                   Confirmar e Salvar no Mapa
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container { font-family: inherit; }
        .custom-popup .leaflet-popup-content-wrapper { 
          border-radius: 20px; 
          padding: 8px; 
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        }
        .custom-popup .leaflet-popup-tip { border-radius: 4px; }
      `}} />
    </div>
  );
}

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  );
}
