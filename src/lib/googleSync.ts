import { supabase } from './supabase';
import { refreshGoogleToken } from './googleTokenExchange';

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

async function refreshAccessToken(userId: string, refreshTokenStr: string) {
  // Secure: refresh happens via Edge Function, client_secret never exposed
  const newAccessToken = await refreshGoogleToken(refreshTokenStr);
  if (newAccessToken) {
    await supabase.from('user_google_tokens').update({ 
      access_token: newAccessToken,
      updated_at: new Date().toISOString() 
    }).eq('user_id', userId);
    return newAccessToken;
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
      
      let dateStr = '';
      let timeStr = '';

      if (gevent.start.dateTime) {
        const startISO = gevent.start.dateTime; // e.g. "2026-05-18T16:00:00-03:00"
        const endISO = gevent.end.dateTime;

        dateStr = startISO.substring(0, 10);

        const getLocalTime = (iso: string) => {
          if (!iso) return '09:00';
          const tIdx = iso.indexOf('T');
          if (tIdx !== -1) {
            const timePart = iso.substring(tIdx + 1);
            const parts = timePart.split(':');
            if (parts.length >= 2) {
              return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            }
          }
          return '09:00';
        };

        timeStr = `${getLocalTime(startISO)} - ${getLocalTime(endISO)}`;
      } else {
        dateStr = gevent.start.date || new Date().toISOString().substring(0, 10);
        timeStr = "08:00 - 18:00 (Dia Inteiro)";
      }

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

  } catch (error: any) {
    console.error('Erro técnico:', error);
    if (error.message === "Failed to fetch") {
      return { success: false, message: 'A conexão com o Google foi bloqueada pelo seu navegador ou antivírus (AdBlock, Web Shield, etc).' };
    }
    return { success: false, message: `Erro técnico na sincronização. ${error.message || error}` };
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

    const startStr = `${appointment.date}T${startTime}-03:00`;
    const endStr = `${appointment.date}T${endTime}-03:00`;

    const event = {
      summary: appointment.title,
      start: {
        dateTime: startStr,
        timeZone: "America/Sao_Paulo"
      },
      end: {
        dateTime: endStr,
        timeZone: "America/Sao_Paulo"
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


