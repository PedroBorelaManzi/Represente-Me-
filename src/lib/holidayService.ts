import { Holiday } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function fetchHolidays(year: number, locations: { city: string; state?: string }[]): Promise<Holiday[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-holidays`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ year, locations })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch holidays from edge function: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching holidays from edge function:', error);
    
    // Extreme fallback if Edge Function fails entirely (e.g. offline)
    const BACKUP_NATIONAL_HOLIDAYS = [
      { date: `${year}-01-01`, name: "Confraternização Universal" },
      { date: `${year}-04-21`, name: "Tiradentes" },
      { date: `${year}-05-01`, name: "Dia do Trabalho" },
      { date: `${year}-09-07`, name: "Independência do Brasil" },
      { date: `${year}-10-12`, name: "Nossa Senhora Aparecida" },
      { date: `${year}-11-02`, name: "Finados" },
      { date: `${year}-11-15`, name: "Proclamação da República" },
      { date: `${year}-11-20`, name: "Dia da Consciência Negra" },
      { date: `${year}-12-25`, name: "Natal" }
    ];

    return BACKUP_NATIONAL_HOLIDAYS.map(h => ({
      id: `backup-${year}-${h.name}`,
      name: h.name,
      date: h.date,
      type: "national" as const,
      description: h.name
    }));
  }
}

// Keep this helper for Dashboard compatibility
export async function getClientLocations(userId: string): Promise<{ city: string; state?: string }[]> {
  const { supabase } = await import('./supabase');
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
      const key = `${c.city.toLowerCase().trim()}|${c.state || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
