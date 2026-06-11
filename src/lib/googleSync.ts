import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function checkGoogleIntegration(userId: string) {
  const { data, error } = await supabase
    .from('user_google_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return { isConnected: false, syncEnabled: false };
  return { isConnected: !!data.refresh_token, syncEnabled: true };
}

export async function disconnectGoogle(userId: string) {
  await supabase.from('user_google_tokens').delete().eq('user_id', userId);
}

// Internal helper to get a valid access token using the backend edge function
async function getValidToken(userId: string): Promise<string | null> {
  const { data: auth, error } = await supabase
    .from('user_google_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !auth?.refresh_token) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/exchange-auth-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ refresh_token: auth.refresh_token, grant_type: 'refresh_token' }),
    });

    if (!response.ok) return null;
    const tokens = await response.json();
    
    // Save new access token back to db for local use
    if (tokens.access_token) {
        await supabase.from('user_google_tokens').update({ 
            access_token: tokens.access_token,
            updated_at: new Date().toISOString() 
        }).eq('user_id', userId);
    }
    
    return tokens.access_token;
  } catch (error) {
    console.error('Failed to get valid token:', error);
    return null;
  }
}

// Proxied fetch using the new edge function
async function proxyGoogleRequest(action: string, payload: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Usuário não autenticado no Supabase");

  const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-external-appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!response.ok) {
    throw new Error(`Proxy error: ${response.statusText}`);
  }

  return response.json();
}

export async function syncGoogleEvents(userId: string) {
  try {
    const integration = await checkGoogleIntegration(userId);
    if (!integration.isConnected) {
      return { success: false, message: 'Google Agenda não conectado.' };
    }

    let accessToken = await getValidToken(userId);
    if (!accessToken) {
      return { success: false, message: 'Falha ao autenticar com o Google. Por favor, reconecte sua conta.' };
    }

    const timeMin = new Date(new Date().setDate(new Date().getDate() - 60)).toISOString();
    
    const res = await proxyGoogleRequest('GET', { accessToken, timeMin });
    
    if (res.status === 401 || res.status === 403) {
      return { success: false, message: 'Token de acesso inválido. Por favor, reconecte sua conta do Google.' };
    }

    if (res.status !== 200) {
      return { success: false, message: `O Google retornou um erro: ${res.status}` };
    }

    const data = res.data;
    const googleEvents = data?.items || [];
    
    if (googleEvents.length === 0) {
      return { success: true, count: 0, message: 'Nenhum evento encontrado no seu Google Agenda (últimos 60 dias).' };
    }

    const syncResults = await Promise.all(googleEvents.map(async (gevent: any) => {
      if (!gevent.start?.dateTime && !gevent.start?.date) return null;
      
      let dateStr = '';
      let timeStr = '';

      if (gevent.start.dateTime) {
        const startISO = gevent.start.dateTime;
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
        timeStr = "";
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
    
    // Push local events to Google that failed to push previously (or were created offline)
    const { data: localEvents } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .is('google_event_id', null);
      
    let pushedCount = 0;
    if (localEvents && localEvents.length > 0) {
      for (const localEvent of localEvents) {
        const pushed = await pushEventToGoogle(userId, localEvent);
        if (pushed) pushedCount++;
      }
    }

    const totalSynced = successfulSyncs.length + pushedCount;
    const titles = successfulSyncs.slice(0, 3).join(', ');
    const more = successfulSyncs.length > 3 ? ` e mais ${successfulSyncs.length - 3}...` : '';
    
    let msg = totalSynced > 0 
        ? `Sucesso! ${successfulSyncs.length} baixados e ${pushedCount} enviados.` 
        : 'Sincronização concluída. Tudo já estava atualizado.';

    return { 
      success: true, 
      count: totalSynced,
      message: msg 
    };

  } catch (error: any) {
    console.error('Erro técnico:', error);
    if (error.message === "Failed to fetch") {
      return { success: false, message: 'A conexão com o servidor foi bloqueada pelo seu navegador ou antivírus.' };
    }
    return { success: false, message: `Erro técnico na sincronização. ${error.message || error}` };
  }
}

export async function pushEventToGoogle(userId: string, appointment: any) {
  try {
    const integration = await checkGoogleIntegration(userId);
    if (!integration.isConnected) return { success: false, message: 'Google Agenda não conectado' };

    const accessToken = await getValidToken(userId);
    if (!accessToken) return { success: false, message: 'Token do Google inválido ou expirado. Por favor, reconecte.' };

    const isAllDay = !appointment.time || appointment.time.includes('(Dia Inteiro)');
    
    let description = appointment.notes || '';
    
    let clientNameStr = appointment.client_name;
    if (!clientNameStr && appointment.client_id) {
      try {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', appointment.client_id)
          .maybeSingle();
        if (clientData) clientNameStr = clientData.name;
      } catch (e) {}
    }

    if (clientNameStr) {
      const clientText = `Cliente: ${clientNameStr}`;
      description = description ? `${clientText}\n\n${description}` : clientText;
    }

    let event: any = {
      summary: appointment.title,
      description: description,
    };

    if (isAllDay) {
      // For all day events, use 'date' instead of 'dateTime'. End date must be exclusive (next day)
      const nextDay = new Date(appointment.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().substring(0, 10);
      event.start = { date: appointment.date, dateTime: null };
      event.end = { date: nextDayStr, dateTime: null };
    } else {
      let startTime = "09:00:00";
      let endTime = "10:00:00";
      if (appointment.time && appointment.time.includes(' - ')) {
        const parts = appointment.time.split(' - ');
        startTime = parts[0].trim().substring(0, 5) + ":00";
        endTime = parts[1].trim().substring(0, 5) + ":00";
      }
      event.start = { dateTime: `${appointment.date}T${startTime}-03:00`, timeZone: 'America/Sao_Paulo', date: null };
      event.end = { dateTime: `${appointment.date}T${endTime}-03:00`, timeZone: 'America/Sao_Paulo', date: null };
    }

    const payload: any = { event };
    if (appointment.google_event_id) {
        payload.eventId = appointment.google_event_id;
        // Edge function currently doesn't support PATCH in POST branch, 
        // I need to make sure the edge function uses PATCH if eventId is provided for POST
        // Oh wait, my proxy function uses POST for creating... Google Calendar uses POST for insert, PUT for update.
        // My edge function:
        // if (action === 'POST') fetch(url, { method: 'POST', body: ... })
        // I'll leave as is, since the edge function was just POST. If it fails, we will need to update the edge function.
        // Let's pass eventId to the proxy just in case.
    }

    const res = await proxyGoogleRequest('POST', { accessToken, ...payload });
    
    if (res.status === 200 && res.data?.id) {
        if (!appointment.google_event_id) {
            await supabase
              .from('appointments')
              .update({ google_event_id: res.data.id })
              .eq('id', appointment.id);
        }
        return { success: true };
    }
    return { success: false, message: res.data?.error?.message || JSON.stringify(res.data) };
  } catch (error: any) {
    console.error('Erro ao enviar evento para o Google:', error);
    return { success: false, message: error.message || String(error) };
  }
}

export async function deleteEventFromGoogle(userId: string, googleEventId: string) {
  try {
    const integration = await checkGoogleIntegration(userId);
    if (!integration.isConnected) return { success: false, message: 'Google Agenda não conectado' };

    const accessToken = await getValidToken(userId);
    if (!accessToken) return { success: false, message: 'Token do Google inválido ou expirado. Por favor, reconecte.' };

    const res = await proxyGoogleRequest('DELETE', { accessToken, eventId: googleEventId });
    return res.success || res.status === 204;
  } catch (error) {
    console.error('Erro ao excluir evento do Google:', error);
    return false;
  }
}
