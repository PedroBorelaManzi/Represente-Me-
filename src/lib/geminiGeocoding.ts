import { supabase } from "./supabase";

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

  // Tier 2: Call Supabase Edge Function to avoid exposing Gemini API Key
  try {
    const { data, error } = await supabase.functions.invoke('geocode', {
      body: { address, name: clientName, cnpj }
    });
    if (error) throw error;
    if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
      const isSpDefault = Math.abs(data.lat - (-23.5505)) < 0.001 && Math.abs(data.lng - (-46.6333)) < 0.001;
      if (!isSpDefault) {
        setCachedCoords(address, data);
        return data;
      }
    }
  } catch (error) {
    console.error("Gemini Edge Function Geocoding Error:", error);
  }

  setCachedCoords(address, null);
  return null;
}
