import { supabase } from './supabase';

export type Holiday = {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'state' | 'municipal';
  state?: string;
  city?: string;
  description?: string;
};

const BASE_URL_GITHUB = 'https://cdn.jsdelivr.net/gh/joaopbini/feriados-brasil@master/dados';

// Helper to normalize strings for comparison
const normalize = (str: string) => 
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

async function getCachedOrFetch<T>(key: string, url: string): Promise<T | null> {
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      // Cache for 24 hours
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return data as T;
      }
    } catch (e) {
      console.error(`Error parsing cache for ${key}`, e);
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    const data = await res.json();
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    return data as T;
  } catch (e) {
    console.error(`Error fetching ${url}`, e);
    return null;
  }
}

export async function fetchHolidays(year: number, locations: { city: string; state: string }[]): Promise<Holiday[]> {
  try {
    // 1. Fetch National Holidays from BrasilAPI (Reliable)
    const nationalUrl = `https://brasilapi.com.br/api/feriados/v1/${year}`;
    const nationalRes = await fetch(nationalUrl);
    const nationalData = await nationalRes.json();
    let allHolidays: Holiday[] = Array.isArray(nationalData) ? nationalData.map((h: any) => ({
      id: h.name,
      name: h.name,
      date: h.date,
      type: 'national'
    })) : [];

    if (locations.length === 0) return allHolidays;

    // 2. Fetch Mappings and Master Holiday List
    const [municipios, estados, masterHolidays] = await Promise.all([
      getCachedOrFetch<any[]>('br_municipios', `${BASE_URL_GITHUB}/localizacao/municipios/municipios.json`),
      getCachedOrFetch<any[]>('br_estados', `${BASE_URL_GITHUB}/localizacao/estados/estados.json`),
      getCachedOrFetch<any[]>(`br_holidays_${year}`, `${BASE_URL_GITHUB}/feriados/municipal/json/${year}.json`)
    ]);

    if (!municipios || !estados || !masterHolidays) {
      console.warn("Could not load municipal holiday database. Showing only national holidays.");
      return allHolidays;
    }

    // 3. Map state acronyms to codes (e.g., "SP" -> 35)
    // Structure: Array of { uf: string, codigo_uf: number, nome: string }
    const stateToCode = new Map<string, number>();
    estados.forEach(e => {
      const key = (e.uf || e.sigla || '').toUpperCase();
      if (key) stateToCode.set(key, e.codigo_uf);
    });

    // 4. Identify IBGE codes for the requested locations
    const targetIbgeCodes = new Set<number>();
    const cityMap = new Map<number, string>(); 

    locations.forEach(loc => {
      const stateKey = loc.state.trim().toUpperCase();
      const stateCode = stateToCode.get(stateKey);
      
      if (!stateCode) {
        console.warn(`[holidayService] State code not found for: ${stateKey}`);
        return;
      }

      const normCity = normalize(loc.city);
      const match = municipios.find(m => 
        m.codigo_uf === stateCode && normalize(m.nome) === normCity
      );

      if (match) {
        const ibge = Number(match.codigo_ibge);
        targetIbgeCodes.add(ibge);
        cityMap.set(ibge, match.nome);
      } else {
        console.warn(`[holidayService] City not found in IBGE database: ${loc.city} (${stateKey})`);
      }
    });

    // 5. Filter municipal holidays by IBGE codes
    const municipalHolidays: Holiday[] = masterHolidays
      .filter(h => targetIbgeCodes.has(Number(h.codigo_ibge)))
      .map(h => {
        const dateParts = h.data.split('/');
        let isoDate = h.data;
        if (dateParts.length === 3) {
          const [day, month, yearPart] = dateParts;
          isoDate = `${yearPart}-${month}-${day}`;
        }
        
        const ibge = Number(h.codigo_ibge);
        return {
          id: `${isoDate}-${h.name}-${ibge}`,
          name: h.name,
          date: isoDate,
          type: 'municipal' as const,
          city: cityMap.get(ibge) || h.municipio,
          state: h.uf,
          description: h.descricao || h.name
        };
      });

    const combinedHolidays = [...allHolidays, ...municipalHolidays];

    // 6. Remove duplicates and return
    const seen = new Set();
    const finalHolidays = combinedHolidays.filter(h => {
      const key = `${h.date}-${h.name}-${h.city || 'national'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));

    console.log(`[holidayService] Sync complete for ${year}:`, {
      total: finalHolidays.length,
      municipal: municipalHolidays.length,
      citiesMatched: targetIbgeCodes.size
    });

    return finalHolidays;

  } catch (error) {
    console.error('Error in fetchHolidays:', error);
    // Fallback to national holidays only
    try {
      const nationalUrl = `https://brasilapi.com.br/api/feriados/v1/${year}`;
      const res = await fetch(nationalUrl);
      const data = await res.json();
      return Array.isArray(data) ? data.map((h: any) => ({
        id: h.name,
        name: h.name,
        date: h.date,
        type: 'national'
      })) : [];
    } catch {
      return [];
    }
  }
}

export async function getClientLocations(userId: string): Promise<{ city: string; state: string }[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('city, state')
    .eq('user_id', userId)
    .not('city', 'is', null)
    .not('state', 'is', null);

  if (error || !data) return [];
  
  // Return unique combinations
  const seen = new Set();
  return data
    .map(c => ({
      city: c.city!.trim(),
      state: c.state!.trim().toUpperCase()
    }))
    .filter(c => {
      const key = `${normalize(c.city)}|${c.state}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
