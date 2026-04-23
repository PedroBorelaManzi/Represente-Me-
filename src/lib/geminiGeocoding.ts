import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function getHighPrecisionCoordinates(address: string, clientName?: string, cnpj?: string): Promise<{ lat: number; lng: number } | null> {
  // Tier 1: Nominatim with Full Address (Quick lookup)
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
      console.warn("Nominatim failed, falling back to Deep Search...");
    }
  }

  // Tier 2: Gemini 2.0 Flash Deep Search / Web Context
  if (apiKey && genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });
      
      const prompt = `INSTRUTIVO DE PESQUISA PROFUNDA (DEEP SEARCH):
        Você deve localizar as coordenadas geográficas exatas (Latitude e Longitude) para esta empresa brasileira.
        
        DADOS RECEBIDOS:
        Nome: ${clientName || "Não informado"}
        CNPJ: ${cnpj || "Não informado"}
        Endereço Parcial: ${address || "Não informado"}

        SUA MISSÃO:
        1. Use seus recursos internos para pesquisar o endereço oficial desta empresa pelo CNPJ/Nome.
        2. Tente identificar a localização no Google Maps (considere sites oficiais ou de consulta de CNPJ).
        3. Retorne a localização do prédio/sede exata se possível.
        4. Se não encontrar o prédio, use o centro da rua.
        5. Se for impossível determinar a rua, retorne null.

        FORMATO DE RESPOSTA (APENAS JSON):
        {"lat": -00.00000, "lng": -00.00000}
        
        Nota: Não invente coordenadas. Se não tiver certeza mínima da cidade, retorne null.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      let cleanJson = responseText;
      if (responseText.includes("{")) {
         cleanJson = responseText.substring(responseText.indexOf("{"), responseText.lastIndexOf("}") + 1);
      }
      
      const coords = JSON.parse(cleanJson);
      if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
        // Anti-Cerquilho/Anti-SP default protection
        const isSpDefault = Math.abs(coords.lat - (-23.5505)) < 0.001 && Math.abs(coords.lng - (-46.6333)) < 0.001;
        if (!isSpDefault) return coords;
      }
    } catch (error) {
      console.error("Gemini Deep Search Error:", error);
    }
  }

  return null;
}
