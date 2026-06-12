const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data: userTokens } = await supabase.from('user_google_tokens').select('*').limit(1);
    if (!userTokens || userTokens.length === 0) return console.log('No user tokens');
    const userId = userTokens[0].user_id;

    console.log('Testing upsert with fake google event id');
    
    // Create a fake appointment
    const { data: appt, error: createError } = await supabase.from('appointments').insert({
        user_id: userId,
        title: 'Fake Event',
        date: '2026-06-11',
        time: '10:00 - 11:00',
        google_event_id: 'fake_google_id_123'
    }).select().single();
    
    if (createError) return console.log('Create error:', createError);
    
    console.log('Created fake appointment:', appt.id);
    
    // Now try to upsert it using onConflict: 'google_event_id'
    const { data: upsertData, error: upsertError } = await supabase.from('appointments').upsert({
        user_id: userId,
        title: 'Fake Event Updated',
        date: '2026-06-12',
        time: '12:00 - 13:00',
        google_event_id: 'fake_google_id_123'
    }, { onConflict: 'google_event_id' }).select();
    
    console.log('Upsert result:', upsertData);
    if (upsertError) console.log('Upsert Error:', upsertError);
    
    // Cleanup
    await supabase.from('appointments').delete().eq('id', appt.id);
    console.log('Cleaned up');
}

test();
