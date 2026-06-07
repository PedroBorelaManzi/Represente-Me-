import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

type CacheEntry = {
  coords: { lat: number; lng: number } | null;
  expiry: number;
};

// In-memory cache
const memoryCache = new Map<string, { lat: number; lng: number } | null>();

function getCachedCoords(address: string): { lat: number; lng: number } | null | undefined {
  const normalized = address.trim().toLowerCase();
  
  // 1. Check in-memory cache
  if (memoryCache.has(normalized)) {
    return memoryCache.get(normalized);
  }

  // 2. Check localStorage cache
  try {
    const cachedStr = localStorage.getItem(`geo_cache_${normalized}`);
    if (cachedStr) {
      const entry: CacheEntry = JSON.parse(cachedStr);
      if (Date.now() < entry.expiry) {
        memoryCache.set(normalized, entry.coords);
        return entry.coords;
      } else {
        localStorage.removeItem(`geo_cache_${normalized}`);
      }
    }
  } catch (e) {
    console.error("Error reading geocoding cache", e);
  }
  return undefined;
}

function setCachedCoords(address: string, coords: { lat: number; lng: number } | null) {
  const normalized = address.trim().toLowerCase();
  memoryCache.set(normalized, coords);
  try {
    const entry: CacheEntry = {
      coords,
      expiry: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days TTL
    };
    localStorage.setItem(`geo_cache_${normalized}`, JSON.stringify(entry));
  } catch (e) {
    console.error("Error saving geocoding cache", e);
  }
}

export async function getHighPrecisionCoordinates(address: string, clientName?: string, cnpj?: string): Promise<{ lat: number; lng: number } | null> {
  if (!address) return null;

  // Check cache first
  const cached = getCachedCoords(address);
  if (cached !== undefined) {
    console.log(`Geocoding cache hit for "${address}":`, cached);
    return cached;
  }

  const queries = [address];
  
  try {
    const dashParts = address.split(" - ");
    if (dashParts.length >= 2) {
      const streetAndNum = dashParts[0];
      const streetOnly = streetAndNum.split(",")[0].trim();
      const cityAndState = dashParts[dashParts.length - 1];
      const city = cityAndState.split("-")[0].trim();
      const state = cityAndState.split("-")[1]?.trim() || "";
      
      if (streetOnly && city) {
        queries.push(`${streetOnly}, ${city} - ${state}`);
      }
      
      const bairro = dashParts.length === 3 ? dashParts[1].trim() : "";
      if (bairro && city) {
        queries.push(`${bairro}, ${city} - ${state}`);
      }
      
      if (city) {
        queries.push(`${city} - ${state}`);
      }
    }
  } catch (e) {
    console.warn("Error parsing address for fallbacks, using full address only.");
  }

  for (const q of queries) {
    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { "User-Agent": "RepresenteSeGeocoding/1.0" } }
      );
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        if (geoData && geoData.length > 0) {
          console.log(`Nominatim successfully geocoded "${q}"`);
          const coords = {
            lat: parseFloat(geoData[0].lat),
            lng: parseFloat(geoData[0].lon)
          };
          setCachedCoords(address, coords);
          return coords;
        }
      }
    } catch (err) {
      console.warn(`Nominatim search failed for query: "${q}"`, err);
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
        if (!isSpDefault) {
          setCachedCoords(address, coords);
          return coords;
        }
      }
    } catch (error) {
      console.error("Gemini Deep Search Error:", error);
    }
  }

  setCachedCoords(address, null);
  return null;
}
