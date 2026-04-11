import { supabase } from './supabase';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

async function getValidToken(userId: string) {
  const { data: tokenData, error } = await supabase
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !tokenData) return null;

  return { accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token, tokenData };
}

async function refreshAccessToken(userId: string, refreshToken: string) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (data.access_token) {
    await supabase.from('user_google_tokens').update({ 
      access_token: data.access_token,
      updated_at: new Date().toISOString() 
    }).eq('user_id', userId);
    return data.access_token;
  }
  return null;
}

export async function syncGoogleEvents(userId: string) {
  try {
    const auth = await getValidToken(userId);
    if (!auth) return { success: false, message: 'Google não conectado.' };

    let accessToken = auth.accessToken;
    
    // Fetch events from a wider range (last 60 days to next 300 days)
    const timeMin = new Date(new Date().setDate(new Date().getDate() - 60)).toISOString();
    const timeMax = new Date(new Date().setDate(new Date().getDate() + 300)).toISOString();

    const fetchEvents = async (token: string) => {
      const url = `${GOOGLE_CALENDAR_API_URL}?timeMin=${encodeURIComponent(timeMin)}&maxResults=250&singleEvents=true&orderBy=startTime`;
      return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    };

    let response = await fetchEvents(accessToken);

    if (response.status === 401 && auth.refreshToken) {
      accessToken = await refreshAccessToken(userId, auth.refreshToken);
      if (accessToken) response = await fetchEvents(accessToken);
    }

    if (!response.ok) {
      return { success: false, message: 'O Google não retornou eventos. Verifique suas permissões.' };
    }

    const data = await response.json();
    const googleEvents = data.items || [];

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

export async function pushEventToGoogle(userId: string, appointment: any) {
  try {
    const auth = await getValidToken(userId);
    if (!auth) return { success: false };

    let accessToken = auth.accessToken;

    let startTime = "09:00:00";
    let endTime = "10:00:00";
    if (appointment.time && appointment.time.includes(' - ')) {
      const parts = appointment.time.split(' - ');
      startTime = parts[0] + ":00";
      endTime = parts[1] + ":00";
    }

    const startStr = `${appointment.date}T${startTime}`;
    const endStr = `${appointment.date}T${endTime}`;

    const event = {
      summary: appointment.title,
      start: {
        dateTime: startStr,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endStr,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    const callGoogle = async (token: string) => {
      const url = appointment.google_event_id 
        ? `${GOOGLE_CALENDAR_API_URL}/${appointment.google_event_id}`
        : GOOGLE_CALENDAR_API_URL;
      
      const method = appointment.google_event_id ? 'PATCH' : 'POST';

      return fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    };

    let response = await callGoogle(accessToken);

    if (response.status === 401 && auth.refreshToken) {
      accessToken = await refreshAccessToken(userId, auth.refreshToken);
      if (accessToken) response = await callGoogle(accessToken);
    }

    if (response.ok) {
      const data = await response.json();
      if (!appointment.google_event_id) {
        await supabase
          .from('appointments')
          .update({ google_event_id: data.id })
          .eq('id', appointment.id);
      }
      return { success: true, googleEventId: data.id };
    }

    return { success: false };
  } catch (error) {
    console.error('Push error:', error);
    return { success: false };
  }
}

export async function deleteEventFromGoogle(userId: string, googleEventId: string) {
  try {
    const auth = await getValidToken(userId);
    if (!auth) return { success: false };

    let accessToken = auth.accessToken;

    const callGoogle = async (token: string) => {
      return fetch(`${GOOGLE_CALENDAR_API_URL}/${googleEventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    };

    let response = await callGoogle(accessToken);

    if (response.status === 401 && auth.refreshToken) {
      accessToken = await refreshAccessToken(userId, auth.refreshToken);
      if (accessToken) response = await callGoogle(accessToken);
    }

    return { success: response.ok || response.status === 404 };
  } catch (error) {
    console.error('Delete error:', error);
    return { success: false };
  }
}
