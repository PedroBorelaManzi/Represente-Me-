import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function getHighPrecisionCoordinates(address: string, clientName?: string, cnpj?: string): Promise<{ lat: number; lng: number } | null> {
  // First, try Nominatim (OpenStreetMap) -> Free, accurate for formatted addresses
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
      console.warn("Nominatim Geocoding Fallback Error, dropping to Gemini...", err);
    }
  }

  // Backup: Use Gemini to guess coordinates given Name, CNPJ, and raw City/Address string
  if (!apiKey || !genAI) {
    console.error("VITE_GEMINI_API_KEY não configurada e busca primária falhou.");
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });
    
    const prompt = `Atue como um especialista em geolocalização no Brasil. 
      Encontre as coordenadas exatas (Latitude e Longitude) para este cliente:
      Nome: ${clientName || "Não informado"}
      CNPJ: ${cnpj || "Não informado"}
      Endereço Sugerido: ${address || "Não informado"}

      Retorne APENAS um objeto JSON no formato:
      {"lat": -00.00000, "lng": -00.00000}
      
      Não responda nada além do JSON puro. Se não encontrar com exatidão aceitável, retorne um ponto central do município se souber, senão retorne null.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Safety matching for JSON
    let cleanJson = responseText;
    if (responseText.includes("{")) {
       cleanJson = responseText.substring(responseText.indexOf("{"), responseText.lastIndexOf("}") + 1);
    }
    
    const coords = JSON.parse(cleanJson);
    
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      // Prevent Gemini from making up Praça da Sé as defaults when it doesn't know
      if (Math.abs(coords.lat - (-23.5505)) < 0.001 && Math.abs(coords.lng - (-46.6333)) < 0.001) {
          return null;
      }
      return coords;
    }
    
    return null;
  } catch (error) {
    console.error("Gemini Geocoding Error:", error);
    return null;
  }
}
