import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function getHighPrecisionCoordinates(address: string, clientName?: string, cnpj?: string): Promise<{ lat: number; lng: number } | null> {
  if (!apiKey || !genAI) {
    console.error("VITE_GEMINI_API_KEY no configurada.");
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = \
      Atue como um especialista em geolocalizao no Brasil. 
      Encontre as coordenadas exatas (Latitude e Longitude) para este cliente:
      Nome: \
      CNPJ: \
      Endereo Sugerido: \

      Retorne APENAS um objeto JSON no formato:
      {"lat": -00.00000, "lng": -00.00000}
      
      No responda nada alm do JSON puro. Se no encontrar, retorne null.\;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/\\\\\\\\\json/g, "").replace(/\\\\\\\\\/g, "").trim();
    
    const coords = JSON.parse(cleanJson);
    
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      return coords;
    }
    
    return null;
  } catch (error) {
    console.error("Gemini Geocoding Error:", error);
    return null;
  }
}
