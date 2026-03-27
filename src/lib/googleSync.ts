import { supabase } from './supabase';

export async function syncGoogleEvents(userId: string) {
  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      console.error('Nenhum token do Google encontrado.');
      return { success: false, message: 'Conta Google não conectada.' };
    }

    const accessToken = tokenData.access_token;
    
    // 1. Buscar eventos do Google
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + new Date().toISOString(),
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, message: 'Sessão do Google expirada. Conecte novamente.' };
      }
      return { success: false, message: 'Erro ao buscar eventos do Google.' };
    }

    const data = await response.json();
    const googleEvents = data.items || [];

    // 2. Salvar no Supabase
    const syncResults = await Promise.all(googleEvents.map(async (gevent: any) => {
      if (!gevent.start?.dateTime && !gevent.start?.date) return null;
      
      const start = new Date(gevent.start.dateTime || gevent.start.date);
      const end = new Date(gevent.end.dateTime || gevent.end.date);
      const dateStr = start.toISOString().split('T')[0];
      const timeStr = `${start.getHours().toString().padStart(2, '0')}:00 - ${end.getHours().toString().padStart(2, '0')}:00`;

      const { error } = await supabase
        .from('appointments')
        .upsert({
          user_id: userId,
          title: gevent.summary || 'Sem Título',
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
      message: 'Sincronização concluída com sucesso!' 
    };

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return { success: false, message: 'Erro inesperado na sincronização.' };
  }
}
