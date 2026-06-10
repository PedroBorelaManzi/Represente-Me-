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
    
    try {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (storageError) {
      console.warn(`Could not save ${key} to localStorage (quota exceeded?)`, storageError);
    }
    
    return data as T;
  } catch (e) {
    console.error(`Error fetching ${url}`, e);
    return null;
  }
}

const BACKUP_NATIONAL_HOLIDAYS = [
  { month: 1, day: 1, name: "Confraternização Universal" },
  { month: 4, day: 21, name: "Tiradentes" },
  { month: 5, day: 1, name: "Dia do Trabalho" },
  { month: 9, day: 7, name: "Independência do Brasil" },
  { month: 10, day: 12, name: "Nossa Senhora Aparecida" },
  { month: 11, day: 2, name: "Finados" },
  { month: 11, day: 15, name: "Proclamação da República" },
  { month: 11, day: 20, name: "Dia Nacional de Zumbi e da Consciência Negra" },
  { month: 12, day: 25, name: "Natal" }
];

export async function fetchHolidays(year: number, locations: { city: string; state?: string }[]): Promise<Holiday[]> {
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

  try {
    const nationalUrl = `https://brasilapi.com.br/api/feriados/v1/${year}`;
    const nationalData = await getCachedOrFetch<any[]>(`br_national_holidays_${year}`, nationalUrl);
    
    let allHolidays: Holiday[] = [];
    if (Array.isArray(nationalData) && nationalData.length > 0) {
      allHolidays = nationalData.map((h: any) => ({
        id: h.name,
        name: h.name,
        date: h.date,
        type: "national" as const
      }));
    } else {
      allHolidays = BACKUP_NATIONAL_HOLIDAYS.map(h => ({
        id: `backup-${year}-${h.name}`,
        name: h.name,
        date: `${year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`,
        type: "national" as const
      }));
    }

    if (locations.length === 0) {
      return deDuplicate([...allHolidays, ...manualHolidays]).sort((a, b) => a.date.localeCompare(b.date));
    }

    const [municipios, estados, masterHolidays] = await Promise.all([
      getCachedOrFetch<any[]>('br_municipios', `${BASE_URL_GITHUB}/localizacao/municipios/municipios.json`),
      getCachedOrFetch<any[]>('br_estados', `${BASE_URL_GITHUB}/localizacao/estados/estados.json`),
      getCachedOrFetch<any[]>(`br_holidays_${year}`, `${BASE_URL_GITHUB}/feriados/municipal/json/${year}.json`)
    ]);

    if (!municipios || !estados || !masterHolidays) {
      console.warn("Could not load municipal holiday database. Showing only national holidays.");
      return deDuplicate([...allHolidays, ...manualHolidays]).sort((a, b) => a.date.localeCompare(b.date));
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

    const combinedHolidays = [...allHolidays, ...municipalHolidays, ...manualHolidays];
    return deDuplicate(combinedHolidays).sort((a, b) => a.date.localeCompare(b.date));

  } catch (error) {
    console.error('Error in fetchHolidays:', error);
    try {
      const nationalUrl = `https://brasilapi.com.br/api/feriados/v1/${year}`;
      const res = await fetch(nationalUrl);
      const data = await res.json();
      const fetched = Array.isArray(data) ? data.map((h: any) => ({
        id: h.name,
        name: h.name,
        date: h.date,
        type: "national" as const
      })) : [];
      return deDuplicate([...fetched, ...manualHolidays]).sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      return deDuplicate([...manualHolidays]).sort((a, b) => a.date.localeCompare(b.date));
    }
  }
}

function deDuplicate(holidays: Holiday[]): Holiday[] {
  const seen = new Map<string, Holiday>();
  
  holidays.forEach(h => {
    const dateKey = h.date;
    const existing = seen.get(dateKey);
    
    if (existing) {
      const normNew = normalize(h.name);
      const normExisting = normalize(existing.name);
      
      if (normNew.includes(normExisting) || normExisting.includes(normNew)) {
        if (h.type === 'municipal' && existing.type !== 'municipal') {
          seen.set(dateKey, h);
        } else if (normNew.length > normExisting.length) {
          seen.set(dateKey, h);
        }
      } else {
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
