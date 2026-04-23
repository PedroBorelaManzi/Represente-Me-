import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function getHighPrecisionCoordinates(address: string, clientName?: string, cnpj?: string): Promise<{ lat: number; lng: number } | null> {
  // Tier 1: Nominatim with Full Address
  if (address) {
    try {
      const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        if (geoData && geoData.length > 0) {
          return {
            lat: parseFloat(geoData[0].lat),
            lng: parseFloat(geoData[0].lon)
          };
        }
      }
    } catch (err) {
      console.warn("Nominatim Full Address failed:", err);
    }
  }

  // Tier 2: Gemini with Full Context
  if (apiKey && genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });
      
      const prompt = `Atue como um especialista em geolocalização no Brasil. 
        Encontre as coordenadas exatas (Latitude e Longitude) para este cliente:
        Nome: ${clientName || "Não informado"}
        CNPJ: ${cnpj || "Não informado"}
        Endereço Sugerido: ${address || "Não informado"}

        Instruções Críticas:
        1. Pesquise se necessário (conhecimento interno) a localização desta empresa pelo nome/CNPJ.
        2. Se não encontrar o prédio exato, use o centro da rua ou o centro do bairro.
        3. Se ainda assim não encontrar, use o centro da cidade informada no endereço.
        
        Retorne APENAS um objeto JSON no formato:
        {"lat": -00.00000, "lng": -00.00000}
        
        Não responda nada além do JSON puro. Se for impossível determinar até a cidade, retorne null.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      let cleanJson = responseText;
      if (responseText.includes("{")) {
         cleanJson = responseText.substring(responseText.indexOf("{"), responseText.lastIndexOf("}") + 1);
      }
      
      const coords = JSON.parse(cleanJson);
      if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
        const isSpDefault = Math.abs(coords.lat - (-23.5505)) < 0.01 && Math.abs(coords.lng - (-46.6333)) < 0.01;
        if (!isSpDefault) return coords;
      }
    } catch (error) {
      console.error("Gemini Geocoding Error:", error);
    }
  }

  // Tier 3: Nominatim with just City/State
  if (address && (address.includes(",") || address.includes("-"))) {
     try {
        const parts = address.split(",");
        const lastPart = parts[parts.length - 1].trim(); 
        const citySearch = lastPart.includes("Brasil") ? lastPart : `${lastPart}, Brasil`;
        
        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&limit=1`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData && geoData.length > 0) {
            return {
              lat: parseFloat(geoData[0].lat),
              lng: parseFloat(geoData[0].lon)
            };
          }
        }
     } catch (err) {
        console.warn("Nominatim City Fallback failed:", err);
     }
  }

  return null;
}
