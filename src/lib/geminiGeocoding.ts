import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export async function getHighPrecisionCoordinates(address: string, clientName?: string, cnpj?: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
      Atue como um especialista em geolocalização no Brasil. 
      Sua tarefa é encontrar as coordenadas exatas (Latitude e Longitude) para o seguinte cliente:
      Nome: ${clientName || "Não informado"}
      CNPJ: ${cnpj || "Não informado"}
      Endereço Sugerido: ${address}

      Use seu conhecimento de mapas e busca para encontrar o ponto exato da empresa. 
      Se o endereço for aproximado, tente encontrar a sede da empresa pelo nome/CNPJ.
      
      Retorne APENAS um objeto JSON no formato:
      {"lat": -00.00000, "lng": -00.00000}
      
      Não responda nada além do JSON puro. Se não encontrar de jeito nenhum, retorne null.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) return null;
    
    const coords = JSON.parse(jsonMatch[0]);
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      return coords;
    }
    
    return null;
  } catch (error) {
    console.error("Gemini Geocoding Error:", error);
    return null;
  }
}
