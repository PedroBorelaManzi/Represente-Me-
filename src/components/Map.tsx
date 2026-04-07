import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Building2, Phone, Mail, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

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

interface MapProps {
    clients: any[];
    onClientSelect?: (client: any) => void;
    selectedClientId?: string;
}

export default function Map({ clients, onClientSelect, selectedClientId }: MapProps) {
  const center: [number, number] = [-23.550520, -46.633308];
  const zoom = 13;

  const getOffsetPositions = (list: any[]) => {
    const locCounts: Record<string, number> = {};
    const OFFSET_LAT = 0.0008;
    const OFFSET_LNG = 0.0008;
    
    return list.map(c => {
      const lat = c.latitude || c.lat || center[0];
      const lng = c.longitude || c.lng || center[1];
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
    }).filter(c => c.displayLat && c.displayLng);
  };

  const mapCompanies = getOffsetPositions(clients);

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <ChangeView center={center} zoom={zoom} />
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        {mapCompanies.map((company) => (
        <Marker 
            key={company.id} 
            position={[company.displayLat, company.displayLng]}
            eventHandlers={{
                click: () => onClientSelect && onClientSelect(company)
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
  );
}