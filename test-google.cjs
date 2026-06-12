const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data: userTokens } = await supabase.from('user_google_tokens').select('*').limit(1);
    if (!userTokens || userTokens.length === 0) return console.log('No user tokens');
    const accessToken = userTokens[0].access_token;

    console.log('Testing Edge Function POST with nulls');
    
    const event = {
        summary: "Test Event",
        start: { date: "2026-06-15", dateTime: null },
        end: { date: "2026-06-16", dateTime: null }
    };
    
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('sync-external-appointments', {
      body: { action: 'POST', accessToken, event }
    });
    
    console.log('Edge Data:', edgeData);
    if (edgeError) console.log('Edge Error:', edgeError);
}

test();
