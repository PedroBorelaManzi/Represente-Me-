import { supabase } from './supabase';

export async function syncGoogleEvents(userId: string) {
  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return { success: false, message: 'Google não conectado.' };
    }

    let accessToken = tokenData.access_token;
    
    // Busca eventos nos últimos 7 dias para garantir que nada seja perdido
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const timeMin = sevenDaysAgo.toISOString();

    const fetchEvents = async (token: string) => {
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=250&singleEvents=true&orderBy=startTime`;
      console.log('Buscando eventos do Google:', url);
      return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    };

    let response = await fetchEvents(accessToken);

    if (response.status === 401 && tokenData.refresh_token) {
      console.log('Token expirado, renovando...');
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();
      if (refreshData.access_token) {
        accessToken = refreshData.access_token;
        await supabase.from('user_google_tokens').update({ 
          access_token: accessToken,
          updated_at: new Date().toISOString() 
        }).eq('user_id', userId);
        response = await fetchEvents(accessToken);
      }
    }

    if (!response.ok) {
      return { success: false, message: 'O Google não retornou eventos. Verifique suas permissões.' };
    }

    const data = await response.json();
    const googleEvents = data.items || [];
    console.log('Eventos encontrados no Google:', googleEvents.length);

    if (googleEvents.length === 0) {
      return { success: true, count: 0, message: 'Nenhum evento encontrado no seu Google Agenda (últimos 7 dias).' };
    }

    const syncResults = await Promise.all(googleEvents.map(async (gevent: any) => {
      if (!gevent.start?.dateTime && !gevent.start?.date) return null;
      
      const start = new Date(gevent.start.dateTime || gevent.start.date);
      const end = new Date(gevent.end.dateTime || gevent.end.date);
      
      const dateStr = start.toISOString().split('T')[0];
      const timeStr = gevent.start.dateTime 
        ? `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`
        : "08:00 - 18:00 (Dia Inteiro)";

      const { error } = await supabase
        .from('appointments')
        .upsert({
          user_id: userId,
          title: gevent.summary || 'Evento do Google',
          date: dateStr,
          time: timeStr,
          google_event_id: gevent.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'google_event_id' });

      if (error) {
        console.error('Erro ao salvar evento:', gevent.summary, error);
        return null;
      }
      return gevent.summary || 'Evento';
    }));

    const successfulSyncs = syncResults.filter(Boolean);
    const titles = successfulSyncs.slice(0, 3).join(', ');
    const more = successfulSyncs.length > 3 ? ` e mais ${successfulSyncs.length - 3}...` : '';

    return { 
      success: true, 
      count: successfulSyncs.length,
      message: successfulSyncs.length > 0 
        ? `Sucesso! Sincronizados: ${titles}${more}` 
        : 'Sincronizado, mas os eventos não puderam ser salvos.' 
    };

  } catch (error) {
    console.error('Erro técnico:', error);
    return { success: false, message: 'Erro técnico na sincronização.' };
  }
}
