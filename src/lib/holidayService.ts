import { supabase } from './supabase';

const MANUAL_HOLIDAYS_BY_CITY: Record<string, { month: number, day: number, name: string }[]> = {
  "porto feliz": [
    { month: 8, day: 15, name: "Nossa Senhora Mãe dos Homens - Porto Feliz" },
    { month: 10, day: 13, name: "Aniversário de Porto Feliz" }
  ],
  "cerquilho": [
    { month: 3, day: 19, name: "São José - Cerquilho" },
    { month: 4, day: 3, name: "Aniversário de Cerquilho" }
  ],
  "angatuba": [
    { month: 3, day: 11, name: "Aniversário de Angatuba" }
    // Corpus Christi removed because it's a moving holiday and already present in municipal/national bases
  ]
};

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
  (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

async function getCachedOrFetch<T>(key: string, url: string): Promise<T | null> {
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
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

export async function fetchHolidays(year: number, locations: { city: string; state?: string }[]): Promise<Holiday[]> {
  try {
    const nationalUrl = `https://brasilapi.com.br/api/feriados/v1/${year}`;
    const nationalRes = await fetch(nationalUrl);
    const nationalData = await nationalRes.json();
    
    let allHolidays: Holiday[] = Array.isArray(nationalData) ? nationalData.map((h: any) => ({
      id: h.name,
      name: h.name,
      date: h.date,
      type: "national" as const
    })) : [];

    if (locations.length === 0) return allHolidays;

    const [municipios, estados, masterHolidays] = await Promise.all([
      getCachedOrFetch<any[]>('br_municipios', `${BASE_URL_GITHUB}/localizacao/municipios/municipios.json`),
      getCachedOrFetch<any[]>('br_estados', `${BASE_URL_GITHUB}/localizacao/estados/estados.json`),
      getCachedOrFetch<any[]>(`br_holidays_${year}`, `${BASE_URL_GITHUB}/feriados/municipal/json/${year}.json`)
    ]);

    if (!municipios || !estados || !masterHolidays) {
      console.warn("Could not load municipal holiday database. Showing only national holidays.");
      return deDuplicate(allHolidays);
    }

    const stateToCode = new Map<string, number>();
    estados.forEach(e => {
      const key = (e.uf || e.sigla || '').toUpperCase();
      if (key) stateToCode.set(key, e.codigo_uf);
    });

    const targetIbgeCodes = new Set<number>();
    const cityMap = new Map<number, string>(); 

    locations.forEach(loc => {
      const stateKey = (loc.state || "").trim().toUpperCase();
      const stateCode = stateToCode.get(stateKey);
      const normCity = normalize(loc.city);
      
      const match = municipios.find(m => {
        const cityMatch = normalize(m.nome) === normCity;
        if (stateCode) {
          return m.codigo_uf === stateCode && cityMatch;
        }
        return cityMatch;
      });

      if (match) {
        const ibge = Number(match.codigo_ibge);
        targetIbgeCodes.add(ibge);
        cityMap.set(ibge, match.nome);
      }
    });

    const municipalHolidays: Holiday[] = masterHolidays
      .filter(h => {
        const ibge = Number(h.codigo_ibge);
        const cityName = cityMap.get(ibge);
        return cityName && targetIbgeCodes.has(ibge);
      })
      .map(h => {
        const dateParts = h.data.split("/");
        let isoDate = h.data;
        if (dateParts.length === 3) {
          const [day, month, yearPart] = dateParts;
          isoDate = `${yearPart}-${month}-${day}`;
        }
        
        const ibge = Number(h.codigo_ibge);
        const cityName = cityMap.get(ibge) || h.municipio || "";
        let finalName = h.nome || h.name || "Feriado";
        
        const normName = finalName.toLowerCase();
        if ((normName.includes("aniversário") || normName.includes("cidade")) && cityName) {
          finalName = `Aniversário de ${cityName}`;
        } else if (normName === "feriado municipal" && cityName) {
          finalName = `Feriado - ${cityName}`;
        }

        return {
          id: `${isoDate}-${finalName}-${ibge}`,
          name: finalName,
          date: isoDate,
          type: "municipal" as const,
          city: cityName,
          state: h.uf,
          description: h.descricao || finalName
        };
      });

    const manualHolidays: Holiday[] = [];
    locations.forEach(loc => {
      const cityKey = normalize(loc.city);
      const overrides = MANUAL_HOLIDAYS_BY_CITY[cityKey];
      if (overrides) {
        overrides.forEach(ov => {
          const isoDate = `${year}-${String(ov.month).padStart(2, "0")}-${String(ov.day).padStart(2, "0")}`;
          manualHolidays.push({
            id: `manual-${isoDate}-${ov.name}-${cityKey}`,
            name: ov.name,
            date: isoDate,
            type: "municipal",
            city: loc.city,
            state: loc.state
          });
        });
      }
    });

    const combinedHolidays = [...allHolidays, ...municipalHolidays, ...manualHolidays];
    return deDuplicate(combinedHolidays).sort((a, b) => a.date.localeCompare(b.date));

  } catch (error) {
    console.error('Error in fetchHolidays:', error);
    try {
      const nationalUrl = `https://brasilapi.com.br/api/feriados/v1/${year}`;
      const res = await fetch(nationalUrl);
      const data = await res.json();
      return Array.isArray(data) ? deDuplicate(data.map((h: any) => ({
        id: h.name,
        name: h.name,
        date: h.date,
        type: "national" as const
      }))) : [];
    } catch {
      return [];
    }
  }
}

function deDuplicate(holidays: Holiday[]): Holiday[] {
  const seen = new Map<string, Holiday>();
  
  holidays.forEach(h => {
    // Unique key per date
    const dateKey = h.date;
    const existing = seen.get(dateKey);
    
    if (existing) {
      const normNew = normalize(h.name);
      const normExisting = normalize(existing.name);
      
      // If one contains the other, or they are on the same day with similar names
      if (normNew.includes(normExisting) || normExisting.includes(normNew)) {
        // Keep the one with city/state precision if possible, or just the more specific name
        if (h.type === 'municipal' && existing.type !== 'municipal') {
          seen.set(dateKey, h);
        } else if (normNew.length > normExisting.length) {
          seen.set(dateKey, h);
        }
      } else {
        // If they are distinct holidays on the same day, we might actually want to show both
        // But the user specifically complained about duplicate entries of basically the same holiday
        // So let's refine the key to date + normalized name snippet
        const nameSnippet = normNew.substring(0, 5); 
        const nameKey = `${dateKey}-${nameSnippet}`;
        if (!seen.has(nameKey)) {
          seen.set(nameKey, h);
        }
      }
    } else {
      seen.set(dateKey, h);
    }
  });
  
  return Array.from(seen.values());
}

export async function getClientLocations(userId: string): Promise<{ city: string; state?: string }[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('city, state')
    .eq('user_id', userId)
    .not('city', 'is', null);

  if (error || !data) return [];
  
  const seen = new Set();
  return data
    .map(c => ({
      city: c.city!.trim(),
      state: c.state ? c.state.trim().toUpperCase() : undefined
    }))
    .filter(c => {
      const key = `${normalize(c.city)}|${c.state || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function formatDateLocal(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getHolidays(): Promise<Holiday[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const locations = await getClientLocations(user.id);
  const year = new Date().getFullYear();
  
  return fetchHolidays(year, locations);
}