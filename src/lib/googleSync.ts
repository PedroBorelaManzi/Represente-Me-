import { supabase } from './supabase';

export async function syncGoogleEvents(userId: string) {
  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('Nenhum token do Google encontrado.');
      return { success: false, message: 'Conta Google não conectada.' };
    }

    let accessToken = tokenData.access_token;
    
    // Função interna para buscar eventos
    const fetchEvents = async (token: string) => {
      return fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + new Date().toISOString() + '&maxResults=50&singleEvents=true&orderBy=startTime',
        { headers: { Authorization: `Bearer ${token}` } }
      );
    };

    let response = await fetchEvents(accessToken);

    // Se o token estiver expirado (401), tentamos renovar usando o refresh_token
    if (response.status === 401 && tokenData.refresh_token) {
      console.log('Access token expirado, tentando renovar com refresh_token...');
      
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return { success: false, message: 'Erro: Variáveis de ambiente (Client ID/Secret) não configuradas no servidor.' };
      }

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
        
        // Atualizar o novo token no banco de dados
        await supabase
          .from('user_google_tokens')
          .update({
            access_token: accessToken,
            expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        // Tenta buscar eventos novamente com o novo token
        response = await fetchEvents(accessToken);
      } else {
        return { success: false, message: 'Sessão do Google expirada. Por favor, conecte novamente clicando em "Conectar Google".' };
      }
    }

    if (!response.ok) {
      return { success: false, message: 'Erro ao buscar eventos do Google. Verifique sua conexão.' };
    }

    const data = await response.json();
    const googleEvents = data.items || [];

    // 2. Salvar no Supabase (Upsert baseado no google_event_id)
    const syncResults = await Promise.all(googleEvents.map(async (gevent: any) => {
      if (!gevent.start?.dateTime && !gevent.start?.date) return null;
      
      const start = new Date(gevent.start.dateTime || gevent.start.date);
      const end = new Date(gevent.end.dateTime || gevent.end.date);
      
      // Formata data e hora para o padrão do site
      const dateStr = start.toISOString().split('T')[0];
      const startH = start.getHours().toString().padStart(2, '0');
      const startM = start.getMinutes().toString().padStart(2, '0');
      const endH = end.getHours().toString().padStart(2, '0');
      const endM = end.getMinutes().toString().padStart(2, '0');
      const timeStr = `${startH}:${startM} - ${endH}:${endM}`;

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

      return error ? null : gevent.id;
    }));

    return { 
      success: true, 
      count: syncResults.filter(Boolean).length,
      message: `Sincronização concluída! ${syncResults.filter(Boolean).length} eventos atualizados.` 
    };

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return { success: false, message: 'Erro inesperado na sincronização.' };
  }
}
