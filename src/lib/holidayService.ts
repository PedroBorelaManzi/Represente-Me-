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

const API_BASE_URL = 'https://api.feriados.dev/v1/holidays';

export async function fetchHolidays(year: number, locations: { city: string; state: string }[]): Promise<Holiday[]> {
  try {
    // 1. Fetch National Holidays
    const nationalUrl = `${API_BASE_URL}?year=${year}&type=national`;
    const nationalRes = await fetch(nationalUrl);
    const nationalData = await nationalRes.json();
    let allHolidays: Holiday[] = nationalData.success ? nationalData.data : [];

    // 2. Fetch Municipal and State Holidays for unique locations
    const uniqueLocations = Array.from(new Set(locations.map(l => `${l.city.toUpperCase()}|${l.state.toUpperCase()}`)))
      .map(s => {
        const [city, state] = s.split('|');
        return { city, state };
      });

    const locationHolidaysPromises = uniqueLocations.map(async (loc) => {
      const url = `${API_BASE_URL}?year=${year}&state=${loc.state}&city=${encodeURIComponent(loc.city)}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          return data.data.filter((h: Holiday) => h.type !== 'national');
        }
      } catch (e) {
        console.error(`Error fetching holidays for ${loc.city}-${loc.state}:`, e);
      }
      return [];
    });

    const locationHolidaysResults = await Promise.all(locationHolidaysPromises);
    locationHolidaysResults.forEach(holidays => {
      allHolidays = [...allHolidays, ...holidays];
    });

    // Remove duplicates
    const seen = new Set();
    return allHolidays.filter(h => {
      const key = `${h.date}-${h.name}-${h.city || 'national'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
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
  
  return data.map(c => ({
    city: c.city!,
    state: c.state!
  }));
}
