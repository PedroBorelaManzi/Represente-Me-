import OpenAI from "openai";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
});

export async function getHighPrecisionCoordinates(address: string, clientName?: string, cnpj?: string): Promise<{ lat: number; lng: number } | null> {
  if (!apiKey) {
    console.error("VITE_OPENAI_API_KEY no configurada.");
    return null;
  }

  try {
    const prompt = `
      Atue como um especialista em geolocalizao no Brasil. 
      Sua tarefa  encontrar as coordenadas exatas (Latitude e Longitude) para o seguinte cliente:
      Nome: ${clientName || "No informado"}
      CNPJ: ${cnpj || "No informado"}
      Endereo Sugerido: ${address}

      Use seu conhecimento de mapas e busca para encontrar o ponto exato da empresa. 
      Se o endereo for aproximado, tente encontrar a sede da empresa pelo nome/CNPJ.
      
      Retorne APENAS um objeto JSON no formato:
      {"lat": -00.00000, "lng": -00.00000}
      
      No responda nada alm do JSON puro. Se no encontrar de jeito nenhum, retorne null.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const resultText = response.choices[0].message.content || "{}";
    const coords = JSON.parse(resultText);
    
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      return coords;
    }
    
    return null;
  } catch (error) {
    console.error("OpenAI Geocoding Error:", error);
    return null;
  }
}
