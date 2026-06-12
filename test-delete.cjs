const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testDelete() {
    console.log("Fetching an appointment...");
    const { data: appt, error: selectErr } = await supabase.from('appointments').select('*').limit(1).single();
    
    if (selectErr || !appt) {
        console.error("Select err:", selectErr);
        return;
    }
    console.log("Trying to delete appointment:", appt.id);
    
    const start = Date.now();
    const { error: delErr } = await supabase.from('appointments').delete().eq('id', appt.id);
    console.log("Delete took", Date.now() - start, "ms");
    
    if (delErr) {
        console.error("Delete err:", delErr);
    } else {
        console.log("Delete success!");
        // Re-insert to not mess up user's data
        await supabase.from('appointments').insert([appt]);
        console.log("Re-inserted");
    }
}

testDelete();
