import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function checkGoogleIntegration(userId: string) {
  const { data, error } = await supabase
    .from('google_integrations')
    .select('refresh_token, email, sync_enabled')
    .eq('user_id', userId)
    .single();

  if (error || !data) return { isConnected: false, email: null, syncEnabled: false };
  return { isConnected: !!data.refresh_token, email: data.email, syncEnabled: data.sync_enabled };
}

export async function toggleGoogleSync(userId: string, enabled: boolean) {
  const { error } = await supabase
    .from('google_integrations')
    .update({ sync_enabled: enabled })
    .eq('user_id', userId);
  return !error;
}

export async function disconnectGoogle(userId: string) {
  await supabase.from('google_integrations').delete().eq('user_id', userId);
}

// Internal helper to get a valid access token using the backend edge function
async function getValidToken(userId: string): Promise<string | null> {
  const { data: auth, error } = await supabase
    .from('google_integrations')
    .select('refresh_token')
    .eq('user_id', userId)
    .single();

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
    return tokens.access_token;
  } catch (error) {
    console.error('Failed to get valid token:', error);
    return null;
  }
}

// Proxied fetch using the new sync-external-appointments
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

export async function syncGoogleEvents(userId: string, timeMin: string) {
  try {
    const integration = await checkGoogleIntegration(userId);
    if (!integration.isConnected || !integration.syncEnabled) {
      return { success: false, message: 'Google Agenda não conectado ou sincronização desativada.' };
    }

    let accessToken = await getValidToken(userId);
    if (!accessToken) {
      return { success: false, message: 'Falha ao autenticar com o Google. Por favor, reconecte sua conta.' };
    }

    const res = await proxyGoogleRequest('GET', { accessToken, timeMin });
    
    if (res.status === 401 || res.status === 403) {
      // Token might have expired precisely after getValidToken, try to force refresh (in a real app, edge function would do this automatically, but keeping it simple for now)
      return { success: false, message: 'Token de acesso inválido. Por favor, reconecte sua conta do Google.' };
    }

    if (res.status !== 200) {
      return { success: false, message: `O Google retornou um erro: ${res.status}` };
    }

    const data = res.data;
    if (!data || !data.items) {
      return { success: false, message: 'O Google não retornou eventos. Verifique suas permissões.' };
    }

    return {
      success: true,
      events: data.items,
      message: `${data.items.length} eventos encontrados e sincronizados.`
    };

  } catch (error: any) {
    console.error('Erro na sincronização:', error);
    if (error.message === "Failed to fetch") {
      return { success: false, message: 'A conexão com o Google foi bloqueada pelo seu navegador ou antivírus.' }; // Note: This shouldn't happen anymore because we hit Supabase, not Google
    }
    return { success: false, message: `Erro técnico na sincronização. ${error.message || error}` };
  }
}

export async function pushEventToGoogle(userId: string, appointment: any) {
  try {
    const integration = await checkGoogleIntegration(userId);
    if (!integration.isConnected || !integration.syncEnabled) return false;

    const accessToken = await getValidToken(userId);
    if (!accessToken) return false;

    const event = {
      summary: `${appointment.client_name} - ${appointment.service_type}`,
      description: appointment.notes || '',
      start: {
        dateTime: `${appointment.date}T${appointment.time}:00-03:00`,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: `${appointment.date}T${appointment.time}:00-03:00`, // Needs duration logic, but keeping original behavior
        timeZone: 'America/Sao_Paulo',
      },
    };

    const res = await proxyGoogleRequest('POST', { accessToken, event });
    return res.status === 200;
  } catch (error) {
    console.error('Erro ao enviar evento para o Google:', error);
    return false;
  }
}

export async function deleteEventFromGoogle(userId: string, googleEventId: string) {
  try {
    const integration = await checkGoogleIntegration(userId);
    if (!integration.isConnected || !integration.syncEnabled) return false;

    const accessToken = await getValidToken(userId);
    if (!accessToken) return false;

    const res = await proxyGoogleRequest('DELETE', { accessToken, eventId: googleEventId });
    return res.success || res.status === 204;
  } catch (error) {
    console.error('Erro ao excluir evento do Google:', error);
    return false;
  }
}
