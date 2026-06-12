const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testSupabase() {
    console.log("Testing Supabase auth ping...");
    let start = Date.now();
    try {
        const { data, error } = await supabase.auth.getSession();
        console.log(`Auth Ping: ${Date.now() - start}ms`, error ? error : 'OK');
    } catch(e) {
        console.log(`Auth Ping: ${Date.now() - start}ms ERROR`, e.message);
    }

    console.log("Testing Supabase DB ping...");
    start = Date.now();
    try {
        const { data, error } = await supabase.from('appointments').select('id').limit(1);
        console.log(`DB Ping: ${Date.now() - start}ms`, error ? error : 'OK');
    } catch(e) {
        console.log(`DB Ping: ${Date.now() - start}ms ERROR`, e.message);
    }
}

testSupabase();
